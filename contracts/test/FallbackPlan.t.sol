// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {TestBase} from "./TestBase.sol";
import {FallbackFactory} from "../src/FallbackFactory.sol";
import {FallbackPlan} from "../src/FallbackPlan.sol";
import {FallbackTestToken} from "../src/FallbackTestToken.sol";
import {PlanTypes} from "../src/PlanTypes.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Account {
    address private immutable owner = msg.sender;

    function accept(FallbackFactory factory, bytes32 hash) external {
        require(msg.sender == owner, "account owner only");
        factory.accept(hash);
    }
}

contract FallbackPlanTest is TestBase {
    FallbackTestToken internal token;
    FallbackFactory internal factory;
    FallbackPlan internal plan;
    PlanTypes.Terms internal t;
    address internal constant RECIPIENT = address(0x100);
    address internal constant PAYEE = address(0x200);
    address internal constant A = address(0x300);
    address internal constant B = address(0x400);
    uint128 internal constant UNIT = 1e6;

    function setUp() public {
        vm.warp(1000);
        token = new FallbackTestToken();
        factory = new FallbackFactory(address(token));
        t = PlanTypes.Terms(
            150 * UNIT, 1 * UNIT, 300 * UNIT, 150 * UNIT, 2000, 1000, 100, 1800, 10_000, 3, bytes32(uint256(42))
        );
        plan = create(t);
        fundActor(RECIPIENT);
        fundActor(A);
        fundActor(B);
    }

    function create(PlanTypes.Terms memory terms_) internal returns (FallbackPlan p) {
        uint256 nonce = factory.nonces(RECIPIENT);
        vm.prank(RECIPIENT);
        bytes32 hash = factory.propose(PAYEE, terms_, 1700);
        vm.prank(PAYEE);
        factory.accept(hash);
        vm.prank(RECIPIENT);
        p = FallbackPlan(factory.publish(PAYEE, terms_, nonce, 1700));
    }

    function fundActor(address actor) internal {
        token.mint(actor, 1_000_000 * UNIT);
        vm.prank(actor);
        token.approve(address(plan), type(uint256).max);
    }

    function fund(uint256 own, uint256 a, uint256 b) internal {
        if (own > 0) {
            vm.prank(RECIPIENT);
            plan.addOwn(own);
        }
        if (a > 0) {
            vm.prank(A);
            plan.contribute(a);
        }
        if (b > 0) {
            vm.prank(B);
            plan.contribute(b);
        }
        vm.prank(RECIPIENT);
        plan.activate();
    }

    function conserved() internal view {
        eq(plan.totalDeposited(), plan.totalPaid() + plan.totalWithdrawn() + plan.totalClaimed() + plan.liabilities());
        truth(token.balanceOf(address(plan)) >= plan.liabilities());
    }

    function testAcceptanceCaseRefundRoundingAndReverseClaimOrder() public {
        fund(250 * UNIT, 200 * UNIT, 100 * UNIT);
        vm.warp(2000);
        plan.settleNext();
        eq(plan.recipientAllocated(), 100 * UNIT);
        eq(plan.supportUsed(), 0);
        vm.warp(3000);
        plan.settleNext();
        eq(plan.supportUsed(), 50 * UNIT);
        vm.warp(4000);
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 450 * UNIT);
        eq(plan.supportUsed(), 200 * UNIT);
        eq(plan.claimable(A), 66_666_666);
        eq(plan.claimable(B), 33_333_334);
        plan.claimFor(B);
        eq(plan.claimable(A), 66_666_666);
        plan.claimFor(A);
        eq(plan.liabilities(), 0);
        eq(token.balanceOf(address(plan)), 0);
        conserved();
    }

    function testCapBlockedPaymentRecoversWithinGraceWithoutPartialTransfer() public {
        t.perPaymentCap = 50 * UNIT;
        plan = create(t);
        fundActor(RECIPIENT);
        fundActor(A);
        fund(0, 300 * UNIT, 0);
        vm.warp(2000);
        vm.expectRevert(
            abi.encodeWithSelector(FallbackPlan.CannotSettle.selector, FallbackPlan.PreviewReason.BackupCap)
        );
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 0);
        eq(plan.reserveRemaining(), 300 * UNIT);
        eq(plan.nextInstallment(), 0);
        vm.warp(2099);
        vm.prank(RECIPIENT);
        plan.addOwn(100 * UNIT);
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 150 * UNIT);
        eq(plan.supportUsed(), 50 * UNIT);
        conserved();
    }

    function testPercentageCapFloorsBaseUnitsAndBlocksUntilOwnTopUp() public {
        t.amount = 101;
        t.minimumReserve = 1;
        t.maximumReserve = 300;
        t.perPaymentCap = 101;
        t.coverBps = 3333;
        plan = create(t);
        fundActor(RECIPIENT);
        fundActor(A);
        fund(67, 100, 0);
        vm.warp(2000);
        eq(plan.preview().allowedBackup, 33);
        vm.expectRevert();
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 0);
        vm.prank(RECIPIENT);
        plan.addOwn(1);
        plan.settleNext();
        eq(plan.supportUsed(), 33);
        eq(token.balanceOf(PAYEE), 101);
        conserved();
    }

    function testAllocatedMoneyAndReservesCannotLeakAcrossPlans() public {
        FallbackPlan original = plan;
        fund(450 * UNIT, 300 * UNIT, 0);
        plan = create(t);
        fundActor(RECIPIENT);
        fundActor(A);
        fund(0, 1 * UNIT, 0);
        vm.warp(2000);
        vm.expectRevert();
        plan.settleNext();
        eq(original.recipientAllocated(), 450 * UNIT);
        eq(original.reserveRemaining(), 300 * UNIT);
        original.settleNext();
        eq(plan.reserveRemaining(), 1 * UNIT);
        eq(plan.supportUsed(), 0);
        conserved();
    }

    function testTopUpAtExpiryCannotPayExpiredInstallment() public {
        fund(0, 100 * UNIT, 0);
        vm.warp(2100);
        vm.prank(RECIPIENT);
        plan.addOwn(150 * UNIT);
        vm.expectRevert();
        plan.settleNext();
        plan.expireNext();
        eq(uint256(plan.outcomes(0)), uint256(FallbackPlan.Outcome.Missed));
        eq(plan.recipientAllocated(), 150 * UNIT);
        vm.warp(3000);
        plan.settleNext();
        eq(plan.supportUsed(), 0);
        conserved();
    }

    function testInsufficientReserveRemainsPendingThenOwnTopUpWorks() public {
        fund(0, 20 * UNIT, 0);
        vm.warp(2000);
        eq(uint256(plan.preview().reason), uint256(FallbackPlan.PreviewReason.InsufficientReserve));
        vm.expectRevert();
        plan.settleNext();
        vm.prank(RECIPIENT);
        plan.addOwn(130 * UNIT);
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 150 * UNIT);
        conserved();
    }

    function testCannotPayEarlyOrSkipEarlierOrDoublePay() public {
        fund(450 * UNIT, 100 * UNIT, 0);
        vm.warp(1999);
        vm.expectRevert();
        plan.settleNext();
        vm.warp(3000);
        vm.expectRevert();
        plan.settleNext();
        eq(plan.nextInstallment(), 0);
        plan.expireNext();
        plan.settleNext();
        vm.expectRevert();
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 150 * UNIT);
        eq(plan.nextInstallment(), 2);
        conserved();
    }

    function testAllMissedNaturalClosureAndSeparateClaims() public {
        fund(250 * UNIT, 200 * UNIT, 100 * UNIT);
        vm.warp(10_000);
        plan.expireNext();
        plan.expireNext();
        plan.expireNext();
        eq(uint256(plan.lifecycle()), uint256(FallbackPlan.Lifecycle.Closed));
        eq(plan.claimable(RECIPIENT), 250 * UNIT);
        eq(plan.claimable(A), 200 * UNIT);
        eq(plan.claimable(B), 100 * UNIT);
        eq(token.balanceOf(PAYEE), 0);
        plan.claimFor(A);
        plan.claimFor(RECIPIENT);
        plan.claimFor(B);
        eq(plan.liabilities(), 0);
        conserved();
    }

    function testReserveExhaustedStillAllowsOwnFundedPayment() public {
        fund(0, 150 * UNIT, 0);
        vm.warp(2000);
        plan.settleNext();
        eq(plan.reserveRemaining(), 0);
        vm.prank(RECIPIENT);
        plan.addOwn(150 * UNIT);
        vm.warp(3000);
        plan.settleNext();
        eq(token.balanceOf(PAYEE), 300 * UNIT);
        conserved();
    }

    function testCancellationDoesNotUndoPaidPaymentAndLocksFunding() public {
        fund(250 * UNIT, 200 * UNIT, 100 * UNIT);
        vm.expectRevert();
        vm.prank(A);
        plan.withdrawSupport(1);
        vm.expectRevert();
        vm.prank(A);
        plan.contribute(1);
        vm.expectRevert();
        vm.prank(RECIPIENT);
        plan.withdrawOwn(1);
        vm.warp(2000);
        plan.settleNext();
        vm.expectRevert();
        vm.prank(A);
        plan.cancel();
        vm.prank(RECIPIENT);
        plan.cancel();
        eq(uint256(plan.outcomes(0)), uint256(FallbackPlan.Outcome.Paid));
        eq(uint256(plan.outcomes(1)), uint256(FallbackPlan.Outcome.Cancelled));
        eq(plan.claimable(RECIPIENT), 100 * UNIT);
        eq(plan.claimable(A), 200 * UNIT);
        eq(token.balanceOf(PAYEE), 150 * UNIT);
        vm.expectRevert();
        plan.settleNext();
        plan.claimFor(RECIPIENT);
        plan.claimFor(A);
        plan.claimFor(B);
        vm.expectRevert();
        plan.claimFor(A);
        conserved();
    }

    function testOpenWithdrawalsFundingExpiryAndNoReserveDivision() public {
        vm.prank(RECIPIENT);
        plan.addOwn(30 * UNIT);
        vm.prank(RECIPIENT);
        plan.withdrawOwn(10 * UNIT);
        vm.prank(A);
        plan.contribute(20 * UNIT);
        vm.prank(A);
        plan.withdrawSupport(5 * UNIT);
        vm.expectRevert();
        plan.closeFunding();
        vm.warp(1800);
        vm.expectRevert();
        vm.prank(RECIPIENT);
        plan.activate();
        vm.expectRevert();
        vm.prank(B);
        plan.contribute(1);
        plan.closeFunding();
        eq(plan.claimable(RECIPIENT), 20 * UNIT);
        eq(plan.claimable(A), 15 * UNIT);
        plan.claimFor(A);
        plan.claimFor(RECIPIENT);
        conserved();
    }

    function testEmptyAndOwnOnlyOpenPlanCanClose() public {
        vm.warp(1800);
        plan.closeFunding();
        eq(plan.claimable(A), 0);
        conserved();
    }

    function testOwnOnlyUnactivatedPlanRefundsWithoutFrozenFundingDivision() public {
        vm.prank(RECIPIENT);
        plan.addOwn(30 * UNIT);
        vm.warp(1800);
        plan.closeFunding();
        eq(plan.claimable(RECIPIENT), 30 * UNIT);
        eq(plan.claimable(A), 0);
        plan.claimFor(RECIPIENT);
        eq(plan.liabilities(), 0);
        conserved();
    }

    function testRoleSeparationSupporterBoundMinimumAndMaximum() public {
        vm.expectRevert();
        vm.prank(RECIPIENT);
        plan.contribute(1);
        vm.expectRevert();
        vm.prank(PAYEE);
        plan.contribute(1);
        vm.expectRevert();
        vm.prank(RECIPIENT);
        plan.activate();
        for (uint160 i = 1; i <= 8; ++i) {
            address actor = address(0x1000 + i);
            fundActor(actor);
            vm.prank(actor);
            plan.contribute(UNIT);
        }
        address ninth = address(0x2000);
        fundActor(ninth);
        vm.expectRevert();
        vm.prank(ninth);
        plan.contribute(1);
        vm.expectRevert();
        vm.prank(address(0x1001));
        plan.contribute(300 * UNIT);
        conserved();
    }

    function testUnsolicitedTransfersAndExternalWalletBalancesDoNotFundPlan() public {
        fund(0, 20 * UNIT, 0);
        token.mint(address(plan), 1000 * UNIT);
        vm.prank(A);
        token.approve(address(plan), 0);
        vm.warp(2000);
        vm.expectRevert();
        plan.settleNext();
        eq(plan.reserveRemaining(), 20 * UNIT);
        vm.prank(RECIPIENT);
        plan.addOwn(130 * UNIT);
        plan.settleNext();
        eq(plan.supportUsed(), 20 * UNIT);
        vm.prank(RECIPIENT);
        plan.cancel();
        eq(plan.claimable(A), 0);
        eq(token.balanceOf(address(plan)), 1000 * UNIT);
        conserved();
    }

    function testWithdrawnZeroWeightSlotGetsNoActiveRefund() public {
        vm.prank(A);
        plan.contribute(20 * UNIT);
        vm.prank(A);
        plan.withdrawSupport(20 * UNIT);
        fund(0, 0, 100 * UNIT);
        vm.prank(RECIPIENT);
        plan.cancel();
        eq(plan.claimable(A), 0);
        eq(plan.claimable(B), 100 * UNIT);
        plan.claimFor(B);
        conserved();
    }

    function testFuzzRefundsConserveAndClaimOrderIndependent(uint128 aSeed, uint128 bSeed, uint128 usedSeed) public {
        uint128 a = aSeed % (100 * UNIT) + 1;
        uint128 b = bSeed % (100 * UNIT) + UNIT;
        uint256 usage = uint256(usedSeed) % (a + b + 1);
        // Use a one-payment plan with an exact own top-up, avoiding a modeled fake consumption.
        t.count = 1;
        t.amount = a + b;
        t.perPaymentCap = a + b;
        plan = create(t);
        fundActor(RECIPIENT);
        fundActor(A);
        fundActor(B);
        fund(a + b - usage, a, b);
        vm.warp(2000);
        plan.settleNext();
        uint256 r = a + b - usage;
        uint256 refundA = plan.claimable(A);
        uint256 refundB = plan.claimable(B);
        eq(refundA + refundB, r);
        if (refundB > 0) plan.claimFor(B);
        eq(plan.claimable(A), refundA);
        if (refundA > 0) plan.claimFor(A);
        eq(plan.liabilities(), 0);
        conserved();
    }
}

contract FactoryTest is FallbackPlanTest {
    function testConsentCannotBeAcceptedOnAnotherChain() public {
        vm.prank(RECIPIENT);
        bytes32 hash = factory.propose(PAYEE, t, 1700);
        vm.chainId(10143);
        vm.expectRevert(FallbackFactory.WrongChain.selector);
        vm.prank(PAYEE);
        factory.accept(hash);
        vm.chainId(31337);
        vm.prank(PAYEE);
        factory.accept(hash);
    }

    function testTestAssetCannotBeDeployedOnMainnet() public {
        vm.chainId(143);
        vm.expectRevert(FallbackTestToken.MainnetForbidden.selector);
        new FallbackTestToken();
    }

    function testTermsCannotPublishBeforeConsentOrBeChanged() public {
        vm.prank(RECIPIENT);
        bytes32 hash = factory.propose(PAYEE, t, 1700);
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.publish(PAYEE, t, 1, 1700);
        vm.expectRevert();
        vm.prank(A);
        factory.accept(hash);
        vm.prank(PAYEE);
        factory.accept(hash);
        t.amount += 1;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.publish(PAYEE, t, 1, 1700);
    }

    function testAcceptanceReplayExpiryCrossFactoryAndCrossChainFail() public {
        vm.prank(RECIPIENT);
        bytes32 hash = factory.propose(PAYEE, t, 1700);
        vm.prank(PAYEE);
        factory.accept(hash);
        vm.expectRevert();
        vm.prank(PAYEE);
        factory.accept(hash);
        FallbackFactory other = new FallbackFactory(address(token));
        vm.expectRevert();
        vm.prank(PAYEE);
        other.accept(hash);
        vm.chainId(10143);
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.publish(PAYEE, t, 1, 1700);
        vm.chainId(31337);
        vm.prank(RECIPIENT);
        factory.publish(PAYEE, t, 1, 1700);
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.publish(PAYEE, t, 1, 1700);
        vm.prank(RECIPIENT);
        bytes32 expired = factory.propose(PAYEE, t, 1600);
        vm.warp(1600);
        vm.expectRevert();
        vm.prank(PAYEE);
        factory.accept(expired);
    }

    function testContractAccountCanAcceptWithOnchainAuthorization() public {
        Account account = new Account();
        vm.prank(RECIPIENT);
        bytes32 hash = factory.propose(address(account), t, 1700);
        vm.expectRevert();
        vm.prank(A);
        account.accept(factory, hash);
        account.accept(factory, hash);
        vm.prank(RECIPIENT);
        address created = factory.publish(address(account), t, 1, 1700);
        truth(factory.isPlan(created));
        eq(uint160(FallbackPlan(created).payee()), uint160(address(account)));
    }

    function testTermsBoundsRejectInvalidScheduleCapsAndAddresses() public {
        t.count = 13;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.propose(PAYEE, t, 1700);
        t.count = 3;
        t.grace = t.interval;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.propose(PAYEE, t, 1700);
        t.grace = 100;
        t.coverBps = 10_001;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.propose(PAYEE, t, 1700);
        t.coverBps = 10_000;
        t.minimumReserve = t.maximumReserve + 1;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.propose(PAYEE, t, 1700);
        t.minimumReserve = UNIT;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.propose(RECIPIENT, t, 1700);
        t.firstDue = type(uint64).max;
        vm.expectRevert();
        vm.prank(RECIPIENT);
        factory.propose(PAYEE, t, 1700);
    }
}

contract AdversarialToken is ERC20 {
    bool public fee;
    bool public fail;
    address public blocked;
    FallbackPlan public attackTarget;
    bool public attack;
    constructor() ERC20("Adversarial test asset", "BAD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function configure(bool fee_, bool fail_, address blocked_) external {
        fee = fee_;
        fail = fail_;
        blocked = blocked_;
    }

    function setAttack(FallbackPlan target) external {
        attackTarget = target;
        attack = true;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0)) {
            require(!fail && to != blocked, "transfer failed");
            if (attack) attackTarget.expireNext();
            if (fee) {
                super._update(from, address(0), 1);
                amount -= 1;
            }
        }
        super._update(from, to, amount);
    }
}

contract AdversarialTest is TestBase {
    AdversarialToken internal token;
    FallbackPlan internal plan;

    function setUp() public {
        vm.warp(1000);
        token = new AdversarialToken();
        PlanTypes.Terms memory t = PlanTypes.Terms(150, 1, 300, 150, 2000, 1000, 100, 1800, 10_000, 1, bytes32(0));
        plan = new FallbackPlan(address(token), address(this), address(0x200), bytes32(0), t);
        token.mint(address(this), 1000);
        token.approve(address(plan), 1000);
        token.mint(address(0x300), 1000);
        vm.prank(address(0x300));
        token.approve(address(plan), 1000);
    }

    function funded() internal {
        plan.addOwn(100);
        vm.prank(address(0x300));
        plan.contribute(100);
        plan.activate();
        vm.warp(2000);
    }

    function testFeeDepositIsRejectedAtomically() public {
        token.configure(true, false, address(0));
        vm.expectRevert();
        plan.addOwn(100);
        eq(plan.totalDeposited(), 0);
        eq(plan.recipientAllocated(), 0);
        eq(token.balanceOf(address(plan)), 0);
    }

    function testRevertingPaymentCannotCorruptAccounting() public {
        funded();
        token.configure(false, true, address(0));
        vm.expectRevert();
        plan.settleNext();
        eq(plan.nextInstallment(), 0);
        eq(plan.totalPaid(), 0);
        eq(plan.recipientAllocated(), 100);
        eq(plan.reserveRemaining(), 100);
        token.configure(false, false, address(0));
        plan.settleNext();
        eq(plan.totalPaid(), 150);
    }

    function testFeePaymentRevertsEntireTransferAndState() public {
        funded();
        token.configure(true, false, address(0));
        vm.expectRevert();
        plan.settleNext();
        eq(plan.nextInstallment(), 0);
        eq(token.balanceOf(address(0x200)), 0);
        eq(plan.supportUsed(), 0);
    }

    function testReentrantTokenCannotMutatePlan() public {
        funded();
        token.setAttack(plan);
        vm.expectRevert();
        plan.settleNext();
        eq(plan.nextInstallment(), 0);
        eq(plan.totalPaid(), 0);
    }

    function testBeneficiaryTransferFailureDoesNotPreventClosureOrOtherClaims() public {
        funded();
        plan.cancel();
        token.configure(false, false, address(0x300));
        vm.expectRevert();
        plan.claimFor(address(0x300));
        eq(plan.claimable(address(0x300)), 100);
        plan.claimFor(address(this));
        eq(plan.claimable(address(this)), 0);
        eq(plan.liabilities(), 100);
        token.configure(false, false, address(0));
        plan.claimFor(address(0x300));
        eq(plan.liabilities(), 0);
    }
}
