// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./Staker.sol";

//import "hardhat/console.sol";

contract StakeFactory {
    using SafeERC20 for IERC20;
    address public main;
    IERC20 public token;
    mapping(address => address[]) stakers;
    uint256 fee;
    error InvalidOffsetLimit(uint256 offset, uint256 limit);

    constructor(address _main) {
        main = _main;
        fee = IXEX(main).fee();
        token = IERC20(main);
        token.totalSupply();
    }

    function stakeFactory(uint256 amount, uint256 term) external payable {
        Staker staker = new Staker(msg.sender, main);
        stakers[msg.sender].push(address(staker));
        token.safeTransferFrom(msg.sender, address(staker), amount);
        staker.stake{value: fee}(amount, term);
    }

    function getUserStakes(address user) public view returns (address[] memory) {
        return stakers[user];
    }

    function getUserStakeInfo(address user, uint256 offset, uint256 limit) public view returns (IXEX.StakeInfo[] memory) {
        IXEX.StakeInfo[] memory stakerInfo = new IXEX.StakeInfo[](limit);
        for (uint256 i = offset; i < limit; ++i) {
            Staker staker = Staker(stakers[user][i]);
            stakerInfo[i] = staker.getUserStakeInfo();
        }
        return stakerInfo;
    }

    function stake(uint256 i, uint256 amount, uint256 term) external payable {
        Staker staker = Staker(stakers[msg.sender][i]);
        //IXEX.StakeInfo memory stakerInfo = staker.getUserStakeInfo();
        IERC20(main).safeTransferFrom(msg.sender, address(staker), amount);
        staker.stake{value: fee}(amount, term);
    }

    function withdraw(uint256 offset, uint256 limit) external payable {
        if (offset >= limit || limit == 0) revert InvalidOffsetLimit(offset, limit);
        for (uint256 i = offset; i < limit; ++i) {
            Staker staker = Staker(stakers[msg.sender][i]);
            IXEX.StakeInfo memory stakerInfo = staker.getUserStakeInfo();
            if (stakerInfo.amount == 0) continue;
            staker.withdraw{value: fee}();
        }
    }
}
