// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FallbackPlan} from "./FallbackPlan.sol";
import {PlanTypes} from "./PlanTypes.sol";

/// @notice Terms are drafts until the bound payee accepts onchain and the recipient publishes.
contract FallbackFactory {
    struct Proposal {
        address recipient;
        address payee;
        uint64 expires;
        bool accepted;
        bool published;
    }

    address public immutable token;
    uint256 public immutable chainId;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => Proposal) public proposals;
    mapping(address => bool) public isPlan;
    address[] private _plans;

    error InvalidProposal();
    error Unauthorized();
    error ConsentExpired();
    error AlreadyUsed();
    error WrongChain();

    event TermsProposed(
        bytes32 indexed termsHash,
        address indexed recipient,
        address indexed payee,
        uint256 nonce,
        uint64 expires,
        PlanTypes.Terms terms
    );
    event PayeeAccepted(bytes32 indexed termsHash, address indexed payee);
    event PlanCreated(
        address indexed plan, bytes32 indexed termsHash, address indexed recipient, address payee, address token
    );

    constructor(address token_) {
        if (token_.code.length == 0) revert InvalidProposal();
        token = token_;
        chainId = block.chainid;
    }

    modifier onConfiguredChain() {
        if (block.chainid != chainId) revert WrongChain();
        _;
    }

    function proposalHash(address recipient, address payee, PlanTypes.Terms calldata t, uint256 nonce, uint64 expires)
        public
        view
        returns (bytes32)
    {
        return keccak256(abi.encode(block.chainid, address(this), token, recipient, payee, t, nonce, expires));
    }

    function propose(address payee, PlanTypes.Terms calldata t, uint64 expires)
        external
        onConfiguredChain
        returns (bytes32 hash)
    {
        PlanTypes.validate(t);
        if (payee == address(0) || payee == msg.sender || expires <= block.timestamp || expires > t.fundingDeadline) {
            revert InvalidProposal();
        }
        uint256 nonce = nonces[msg.sender]++;
        hash = proposalHash(msg.sender, payee, t, nonce, expires);
        proposals[hash] = Proposal(msg.sender, payee, expires, false, false);
        emit TermsProposed(hash, msg.sender, payee, nonce, expires, t);
    }

    function accept(bytes32 hash) external onConfiguredChain {
        Proposal storage p = proposals[hash];
        if (p.payee != msg.sender) revert Unauthorized();
        if (block.timestamp >= p.expires) revert ConsentExpired();
        if (p.accepted || p.published) revert AlreadyUsed();
        p.accepted = true;
        emit PayeeAccepted(hash, msg.sender);
    }

    function publish(address payee, PlanTypes.Terms calldata t, uint256 nonce, uint64 expires)
        external
        onConfiguredChain
        returns (address plan)
    {
        bytes32 hash = proposalHash(msg.sender, payee, t, nonce, expires);
        Proposal storage p = proposals[hash];
        if (p.recipient != msg.sender || !p.accepted || p.payee != payee) revert Unauthorized();
        if (block.timestamp >= p.expires) revert ConsentExpired();
        if (p.published) revert AlreadyUsed();
        p.published = true;
        plan = address(new FallbackPlan(token, msg.sender, payee, hash, t));
        isPlan[plan] = true;
        _plans.push(plan);
        emit PlanCreated(plan, hash, msg.sender, payee, token);
    }

    function planCount() external view returns (uint256) {
        return _plans.length;
    }

    function planAt(uint256 index) external view returns (address) {
        return _plans[index];
    }
}
