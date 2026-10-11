// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {TestBase} from "./TestBase.sol";
import {FallbackPlan} from "../src/FallbackPlan.sol";
import {FallbackTestToken} from "../src/FallbackTestToken.sol";
import {PlanTypes} from "../src/PlanTypes.sol";

contract AccountingHandler is TestBase {
    FallbackPlan public immutable plan;
    FallbackTestToken public immutable token;
    address internal constant RECIPIENT = address(0x100);
    address internal constant PAYEE = address(0x200);
    address internal constant A = address(0x300);
    address internal constant B = address(0x400);
    uint256 public donations;

    constructor() {
        vm.warp(1000);
        token = new FallbackTestToken();
        PlanTypes.Terms memory t =
            PlanTypes.Terms(150e6, 1e6, 300e6, 100e6, 2000, 1000, 100, 1800, 10_000, 3, bytes32(0));
        plan = new FallbackPlan(address(token), RECIPIENT, PAYEE, bytes32(0), t);
        address[3] memory actors = [RECIPIENT, A, B];
        for (uint256 i; i < actors.length; i++) {
            token.mint(actors[i], 1e30);
            vm.prank(actors[i]);
            token.approve(address(plan), type(uint256).max);
        }
    }

    function addOwn(uint128 seed) external {
        vm.prank(RECIPIENT);
        try plan.addOwn(uint256(seed) % 500e6 + 1) {} catch {}
    }

    function withdrawOwn(uint128 seed) external {
        vm.prank(RECIPIENT);
        try plan.withdrawOwn(uint256(seed) % 500e6 + 1) {} catch {}
    }

    function contribute(uint128 seed, bool b) external {
        vm.prank(b ? B : A);
        try plan.contribute(uint256(seed) % 300e6 + 1) {} catch {}
    }

    function withdrawSupport(uint128 seed, bool b) external {
        vm.prank(b ? B : A);
        try plan.withdrawSupport(uint256(seed) % 300e6 + 1) {} catch {}
    }

    function activate() external {
        vm.prank(RECIPIENT);
        try plan.activate() {} catch {}
    }

    function advance(uint16 seconds_) external {
        vm.warp(block.timestamp + uint256(seconds_) % 1000);
    }

    function settle() external {
        try plan.settleNext() {} catch {}
    }

    function expire() external {
        try plan.expireNext() {} catch {}
    }

    function cancel() external {
        vm.prank(RECIPIENT);
        try plan.cancel() {} catch {}
    }

    function closeFunding() external {
        try plan.closeFunding() {} catch {}
    }

    function claim(uint8 slot) external {
        address beneficiary = slot % 3 == 0 ? RECIPIENT : slot % 3 == 1 ? A : B;
        try plan.claimFor(beneficiary) {} catch {}
    }

    function donate(uint64 seed) external {
        uint256 amount = uint256(seed) % 1e9;
        donations += amount;
        token.mint(address(plan), amount);
    }
}

contract AccountingInvariantTest is TestBase {
    struct FuzzSelector {
        address addr;
        bytes4[] selectors;
    }

    struct FuzzArtifactSelector {
        string artifact;
        bytes4[] selectors;
    }

    struct FuzzInterface {
        address addr;
        string[] artifacts;
    }
    AccountingHandler private handler;
    address[] private targets;

    function setUp() public {
        handler = new AccountingHandler();
        targets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return targets;
    }

    // Explicit optional Foundry invariant configuration prevents missing-hook warnings.
    function targetArtifactSelectors() public pure returns (FuzzArtifactSelector[] memory) {
        return new FuzzArtifactSelector[](0);
    }

    function targetArtifacts() public pure returns (string[] memory) {
        return new string[](0);
    }

    function excludeArtifacts() public pure returns (string[] memory) {
        return new string[](0);
    }

    function targetSenders() public pure returns (address[] memory) {
        return new address[](0);
    }

    function excludeSenders() public pure returns (address[] memory) {
        return new address[](0);
    }

    function excludeContracts() public pure returns (address[] memory) {
        return new address[](0);
    }

    function targetInterfaces() public pure returns (FuzzInterface[] memory) {
        return new FuzzInterface[](0);
    }

    function targetSelectors() public pure returns (FuzzSelector[] memory) {
        return new FuzzSelector[](0);
    }

    function excludeSelectors() public pure returns (FuzzSelector[] memory) {
        return new FuzzSelector[](0);
    }

    function invariantAttributedInflowsEqualPaymentsWithdrawalsClaimsAndLiabilities() public view {
        FallbackPlan p = handler.plan();
        eq(p.totalDeposited(), p.totalPaid() + p.totalWithdrawn() + p.totalClaimed() + p.liabilities());
    }

    function invariantHoldingsExactlyCoverLiabilitiesAndUnattributedDonations() public view {
        eq(handler.token().balanceOf(address(handler.plan())), handler.plan().liabilities() + handler.donations());
    }

    function invariantClosedRefundsAccountForEveryRemainingBaseUnit() public view {
        FallbackPlan p = handler.plan();
        if (p.lifecycle() == FallbackPlan.Lifecycle.Closed) {
            eq(p.claimable(address(0x100)) + p.claimable(address(0x300)) + p.claimable(address(0x400)), p.liabilities());
        }
    }

    function invariantPayeeNeverReceivesPartialOrDuplicateInstallments() public view {
        FallbackPlan p = handler.plan();
        eq(handler.token().balanceOf(address(0x200)), p.totalPaid());
        truth(p.totalPaid() % 150e6 == 0);
        truth(p.totalPaid() <= 450e6);
        truth(p.supportUsed() <= 300e6);
    }
}
