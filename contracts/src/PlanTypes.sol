// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library PlanTypes {
    struct Terms {
        uint128 amount;
        uint128 minimumReserve;
        uint128 maximumReserve;
        uint128 perPaymentCap;
        uint64 firstDue;
        uint64 interval;
        uint64 grace;
        uint64 fundingDeadline;
        uint16 coverBps;
        uint8 count;
        bytes32 metadataCommitment;
    }

    error InvalidTerms();

    function validate(Terms memory t) internal view {
        if (
            t.amount == 0 || t.count == 0 || t.count > 12 || t.grace == 0 || t.grace >= t.interval
                || t.fundingDeadline <= block.timestamp || t.fundingDeadline >= t.firstDue || t.coverBps == 0
                || t.coverBps > 10_000 || t.minimumReserve == 0 || t.maximumReserve < t.minimumReserve
                || t.perPaymentCap == 0
                || uint256(t.firstDue) + uint256(t.count - 1) * t.interval + t.grace > type(uint64).max
        ) revert InvalidTerms();
    }
}
