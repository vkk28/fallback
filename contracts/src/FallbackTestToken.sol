// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice TEST ONLY. No real value, issuer backing, or redemption promise.
contract FallbackTestToken is ERC20 {
    error MainnetForbidden();

    constructor() ERC20("Fallback Test Token (no real value)", "FBTEST") {
        if (block.chainid != 31337 && block.chainid != 10143) revert MainnetForbidden();
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
