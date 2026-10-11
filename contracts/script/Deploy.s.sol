// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FallbackFactory} from "../src/FallbackFactory.sol";
import {FallbackTestToken} from "../src/FallbackTestToken.sol";

interface BroadcastVm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Use a configured signer/keystore. Deploys an explicitly valueless test asset.
contract Deploy {
    BroadcastVm private constant vm = BroadcastVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (FallbackTestToken token, FallbackFactory factory) {
        require(block.chainid == 10143 || block.chainid == 31337, "test networks only");
        vm.startBroadcast();
        token = new FallbackTestToken();
        factory = new FallbackFactory(address(token));
        vm.stopBroadcast();
    }
}
