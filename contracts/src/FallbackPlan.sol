// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PlanTypes} from "./PlanTypes.sol";

/// @notice Dedicated escrow for immutable, payee-consented recurring payments.
/// @dev Only the factory-configured conventional asset is supported. Donations are unaccounted excess.
contract FallbackPlan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Lifecycle {
        Open,
        Active,
        Closed
    }
    enum ClosureReason {
        None,
        Completed,
        RecipientCancelled,
        FundingExpired
    }
    enum Outcome {
        Pending,
        Paid,
        Missed,
        Cancelled
    }
    enum PreviewReason {
        Payable,
        NotActive,
        Complete,
        NotDue,
        Expired,
        InsufficientReserve,
        BackupCap
    }

    struct Preview {
        uint8 index;
        uint64 due;
        uint256 own;
        uint256 gap;
        uint256 allowedBackup;
        PreviewReason reason;
    }

    struct Share {
        uint256 contribution;
        uint256 frozenContribution;
        uint256 prefix;
        bool exists;
        bool claimed;
    }

    IERC20 public immutable token;
    address public immutable factory;
    address public immutable recipient;
    address public immutable payee;
    uint256 public immutable chainId;
    bytes32 public immutable termsHash;
    PlanTypes.Terms private _terms;
    Lifecycle public lifecycle;
    ClosureReason public closureReason;
    uint8 public nextInstallment;
    mapping(uint8 => Outcome) public outcomes;
    address[] private _supporters;
    mapping(address => Share) public shares;
    uint256 public recipientAllocated;
    uint256 public reserveRemaining;
    uint256 public frozenFunding;
    uint256 public frozenReserve;
    uint256 public refundableRecipient;
    uint256 public refundableSupport;
    uint256 public supportUsed;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public totalPaid;
    uint256 public totalClaimed;
    bool public activated;

    error Unauthorized();
    error WrongState();
    error Deadline();
    error InvalidAmount();
    error InvalidRole();
    error SupporterLimit();
    error ReserveLimit();
    error NothingToClaim();
    error CannotSettle(PreviewReason reason);
    error UnsupportedToken();

    event AllocationChanged(address indexed recipient, uint256 amount, bool added, uint256 balance);
    event SupportChanged(address indexed supporter, uint256 amount, bool added, uint256 contribution, uint256 reserve);
    event ShareFrozen(address indexed supporter, uint8 slot, uint256 contribution, uint256 prefix);
    event Activated(uint256 recipientAllocation, uint256 frozenFunding);
    event PaymentSettled(uint8 indexed installment, uint64 due, uint256 own, uint256 support, uint256 amount);
    event InstallmentMissed(uint8 indexed installment, uint64 due);
    event InstallmentCancelled(uint8 indexed installment);
    event Closed(ClosureReason reason, uint256 recipientRefund, uint256 supportRefund);
    event Claimed(address indexed beneficiary, uint256 amount, bool recipientClaim);

    constructor(address asset, address recipient_, address payee_, bytes32 hash, PlanTypes.Terms memory t) {
        if (asset.code.length == 0) revert UnsupportedToken();
        if (recipient_ == address(0) || payee_ == address(0) || recipient_ == payee_) revert InvalidRole();
        PlanTypes.validate(t);
        token = IERC20(asset);
        factory = msg.sender;
        recipient = recipient_;
        payee = payee_;
        chainId = block.chainid;
        termsHash = hash;
        _terms = t;
    }

    modifier onlyRecipient() {
        if (msg.sender != recipient) revert Unauthorized();
        _;
    }

    function terms() external view returns (PlanTypes.Terms memory) {
        return _terms;
    }

    function supporters() external view returns (address[] memory) {
        return _supporters;
    }

    function liabilities() public view returns (uint256) {
        return recipientAllocated + reserveRemaining + refundableRecipient + refundableSupport;
    }

    function addOwn(uint256 amount) external onlyRecipient nonReentrant {
        if (lifecycle == Lifecycle.Closed) revert WrongState();
        if (lifecycle == Lifecycle.Open && block.timestamp >= _terms.fundingDeadline) revert Deadline();
        if (amount == 0) revert InvalidAmount();
        recipientAllocated += amount;
        totalDeposited += amount;
        _deposit(msg.sender, amount);
        emit AllocationChanged(msg.sender, amount, true, recipientAllocated);
    }

    function withdrawOwn(uint256 amount) external onlyRecipient nonReentrant {
        if (lifecycle != Lifecycle.Open) revert WrongState();
        if (amount == 0 || amount > recipientAllocated) revert InvalidAmount();
        recipientAllocated -= amount;
        totalWithdrawn += amount;
        _send(recipient, amount);
        emit AllocationChanged(msg.sender, amount, false, recipientAllocated);
    }

    function contribute(uint256 amount) external nonReentrant {
        if (lifecycle != Lifecycle.Open) revert WrongState();
        if (block.timestamp >= _terms.fundingDeadline) revert Deadline();
        if (msg.sender == recipient || msg.sender == payee) revert InvalidRole();
        if (amount == 0) revert InvalidAmount();
        if (amount > _terms.maximumReserve - reserveRemaining) revert ReserveLimit();
        Share storage share = shares[msg.sender];
        if (!share.exists) {
            if (_supporters.length == 8) revert SupporterLimit();
            share.exists = true;
            _supporters.push(msg.sender);
        }
        share.contribution += amount;
        reserveRemaining += amount;
        totalDeposited += amount;
        _deposit(msg.sender, amount);
        emit SupportChanged(msg.sender, amount, true, share.contribution, reserveRemaining);
    }

    function withdrawSupport(uint256 amount) external nonReentrant {
        if (lifecycle != Lifecycle.Open) revert WrongState();
        Share storage share = shares[msg.sender];
        if (amount == 0 || amount > share.contribution) revert InvalidAmount();
        share.contribution -= amount;
        reserveRemaining -= amount;
        totalWithdrawn += amount;
        _send(msg.sender, amount);
        emit SupportChanged(msg.sender, amount, false, share.contribution, reserveRemaining);
    }

    function activate() external onlyRecipient nonReentrant {
        if (lifecycle != Lifecycle.Open) revert WrongState();
        if (block.timestamp >= _terms.fundingDeadline) revert Deadline();
        if (reserveRemaining < _terms.minimumReserve) revert ReserveLimit();
        activated = true;
        lifecycle = Lifecycle.Active;
        frozenFunding = reserveRemaining;
        uint256 prefix = 0;
        uint256 supporterCount = _supporters.length;
        for (uint8 i; i < supporterCount; ++i) {
            Share storage share = shares[_supporters[i]];
            share.prefix = prefix;
            share.frozenContribution = share.contribution;
            if (share.contribution > 0) emit ShareFrozen(_supporters[i], i, share.contribution, prefix);
            prefix += share.contribution;
        }
        emit Activated(recipientAllocated, frozenFunding);
    }

    function dueAt(uint8 index) public view returns (uint64) {
        if (index >= _terms.count) revert InvalidAmount();
        return uint64(uint256(_terms.firstDue) + uint256(index) * _terms.interval);
    }

    function preview() public view returns (Preview memory p) {
        p.index = nextInstallment;
        if (p.index >= _terms.count) {
            p.reason = PreviewReason.Complete;
            return p;
        }
        p.due = dueAt(p.index);
        p.own = Math.min(recipientAllocated, _terms.amount);
        p.gap = _terms.amount - p.own;
        uint256 cap = Math.min(_terms.perPaymentCap, Math.mulDiv(_terms.amount, _terms.coverBps, 10_000));
        p.allowedBackup = Math.min(cap, reserveRemaining);
        if (lifecycle != Lifecycle.Active) p.reason = PreviewReason.NotActive;
        else if (block.timestamp < p.due) p.reason = PreviewReason.NotDue;
        else if (block.timestamp >= uint256(p.due) + _terms.grace) p.reason = PreviewReason.Expired;
        else if (p.gap > cap) p.reason = PreviewReason.BackupCap;
        else if (p.gap > reserveRemaining) p.reason = PreviewReason.InsufficientReserve;
        else p.reason = PreviewReason.Payable;
    }

    /// @notice One chronological installment per call. A failed attempt transfers nothing.
    function settleNext() external nonReentrant {
        Preview memory p = preview();
        if (p.reason != PreviewReason.Payable) revert CannotSettle(p.reason);
        recipientAllocated -= p.own;
        reserveRemaining -= p.gap;
        supportUsed += p.gap;
        totalPaid += _terms.amount;
        outcomes[p.index] = Outcome.Paid;
        nextInstallment = p.index + 1;
        _send(payee, _terms.amount);
        emit PaymentSettled(p.index, p.due, p.own, p.gap, _terms.amount);
        if (nextInstallment == _terms.count) _close(ClosureReason.Completed);
    }

    function expireNext() external nonReentrant {
        Preview memory p = preview();
        if (p.reason != PreviewReason.Expired) revert CannotSettle(p.reason);
        outcomes[p.index] = Outcome.Missed;
        nextInstallment = p.index + 1;
        emit InstallmentMissed(p.index, p.due);
        if (nextInstallment == _terms.count) _close(ClosureReason.Completed);
    }

    function closeFunding() external nonReentrant {
        if (lifecycle != Lifecycle.Open) revert WrongState();
        if (block.timestamp < _terms.fundingDeadline) revert Deadline();
        _cancelRemaining();
        _close(ClosureReason.FundingExpired);
    }

    function cancel() external onlyRecipient nonReentrant {
        if (lifecycle == Lifecycle.Closed) revert WrongState();
        _cancelRemaining();
        _close(ClosureReason.RecipientCancelled);
    }

    function claimable(address beneficiary) public view returns (uint256) {
        if (lifecycle != Lifecycle.Closed) return 0;
        if (beneficiary == recipient) return refundableRecipient;
        Share memory share = shares[beneficiary];
        if (share.claimed || !share.exists) return 0;
        if (!activated) return share.contribution;
        // Activation requires positive reserve; zero-weight slots receive zero.
        return Math.mulDiv(frozenReserve, share.prefix + share.frozenContribution, frozenFunding)
            - Math.mulDiv(frozenReserve, share.prefix, frozenFunding);
    }

    /// @notice Caller cannot redirect the claim; anyone may help the recorded beneficiary.
    function claimFor(address beneficiary) external nonReentrant {
        uint256 amount = claimable(beneficiary);
        if (amount == 0) revert NothingToClaim();
        bool own = beneficiary == recipient;
        if (own) {
            refundableRecipient = 0;
        } else {
            shares[beneficiary].claimed = true;
            refundableSupport -= amount;
        }
        totalClaimed += amount;
        _send(beneficiary, amount);
        emit Claimed(beneficiary, amount, own);
    }

    function _cancelRemaining() private {
        // Terms cap this loop at twelve installments.
        for (uint8 i = nextInstallment; i < _terms.count; ++i) {
            outcomes[i] = Outcome.Cancelled;
            emit InstallmentCancelled(i);
        }
        nextInstallment = _terms.count;
    }

    function _close(ClosureReason reason) private {
        lifecycle = Lifecycle.Closed;
        closureReason = reason;
        refundableRecipient = recipientAllocated;
        refundableSupport = reserveRemaining;
        frozenReserve = reserveRemaining;
        recipientAllocated = 0;
        reserveRemaining = 0;
        emit Closed(reason, refundableRecipient, refundableSupport);
    }

    function _deposit(address from, uint256 amount) private {
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        if (token.balanceOf(address(this)) != beforeBalance + amount) revert UnsupportedToken();
    }

    function _send(address beneficiary, uint256 amount) private {
        uint256 beforeEscrow = token.balanceOf(address(this));
        uint256 beforeBalance = token.balanceOf(beneficiary);
        token.safeTransfer(beneficiary, amount);
        if (
            token.balanceOf(beneficiary) != beforeBalance + amount
                || token.balanceOf(address(this)) + amount != beforeEscrow
        ) revert UnsupportedToken();
    }
}
