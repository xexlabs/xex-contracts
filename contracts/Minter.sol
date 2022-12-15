// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMain {
    struct MintInfo {
        address user;
        uint256 term;
        uint256 maturityTs;
        uint256 rank;
        uint256 amplifier;
        uint256 eaaRate;
    }
    function fee() external returns(uint);
    function claimRank(uint256 term) external payable;
    function claimMintReward() external payable;
    function userMints(address user) external view returns(MintInfo memory);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Minter {
    address public owner;
    IMain main;
    uint public term;
    constructor(address user, address _main){
        owner = user;
        main = IMain(_main);
    }
    function claimRank(uint256 _term) external {
        term = _term;
        main.claimRank(term);
    }
    function claimMintReward() external payable {
        uint fee = main.fee();
        main.claimMintReward{value : fee}();
        main.transfer(owner, main.balanceOf(address(this)));
    }
    function getUserMintInfo() external view returns(IMain.MintInfo memory){
        return main.userMints(address(this));
    }
}

contract Factory
{
    address public main;
    mapping(address => address[]) minters;
    constructor(address _main){
        main = _main;
    }
    function minterFactory(uint miners, uint term) external payable {
        for (uint i = 0; i < miners; ++i) {
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

    function claimRank() external payable{
        uint t = minters[msg.sender].length;
        for( uint i = 0 ; i < t ; ++ i ){
            Minter minter = Minter(minters[msg.sender][i]);
            IMain.MintInfo memory info = minter.getUserMintInfo();
            if( info.maturityTs > 0 )
                continue;
            minter.claimRank( minter.term() );
        }
    }
    function claimMintReward() external payable{
        uint fee = IMain(main).fee();
        uint t = minters[msg.sender].length;
        for( uint i = 0 ; i < t ; ++ i ){
            Minter minter = Minter(minters[msg.sender][i]);
            IMain.MintInfo memory info = minter.getUserMintInfo();
            if( block.timestamp > info.maturityTs )
                minter.claimMintReward{value : fee}();
        }
    }
    function getTimestamp() public view returns(uint){
        return block.timestamp;
    }
}
