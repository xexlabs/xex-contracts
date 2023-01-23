// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Minter.sol";
contract MinterFactory
{
    address public main;
    mapping(address => address[]) minters;
    constructor(address _main){
        main = _main;
    }
    function minterFactory(uint amount, uint term) external {
        for (uint i = 0; i < amount; ++i) {
            Minter minter = new Minter(msg.sender, main);
            minters[msg.sender].push(address(minter));
            minter.claimRank(term);
        }
    }

    function getUserMinters(address user) public view returns (address[] memory){
        return minters[user];
    }

    function getUserMinterInfo(address user) public view returns (IMain.MintInfo[] memory){
        uint t = minters[user].length;
        IMain.MintInfo[] memory minterInfo = new IMain.MintInfo[](t);
        for( uint i = 0 ; i < t ; ++ i ){
            Minter minter = Minter(minters[user][i]);
            minterInfo[i] = minter.getUserMintInfo();
        }
        return minterInfo;
    }

    function claimRank(uint limit) external{
        uint t = minters[msg.sender].length;
        for( uint i = 0 ; i < t ; ++ i ){
            Minter minter = Minter(minters[msg.sender][i]);
            IMain.MintInfo memory info = minter.getUserMintInfo();
            if( info.maturityTs > 0 ){
                continue;
            }
            minter.claimRank( minter.term() );
            if( i == limit ){
                break;
            }
        }
    }
    function claimMintReward(uint limit) external payable{
        uint fee = IMain(main).fee();
        uint t = minters[msg.sender].length;
        for( uint i = 0 ; i < t ; ++ i ){
            Minter minter = Minter(minters[msg.sender][i]);
            IMain.MintInfo memory info = minter.getUserMintInfo();
            if( block.timestamp > info.maturityTs ){
                minter.claimMintReward{value : fee}();
            }
            if( i == limit ){
                break;
            }
        }
    }
    function getMintReward(address user) public view returns (uint[] memory){
        uint t = minters[user].length;
        uint[] memory reward = new uint[](t);
        for( uint i = 0 ; i < t ; ++ i ){
            Minter minter = Minter(minters[user][i]);
            reward[i] = minter.getMintReward();
        }
        return reward;
    }
}
