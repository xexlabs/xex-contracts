// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
interface IXDON is IERC721 {
    function contractURI() external view returns (string memory);
    function haltMint() external;
    function setMintLimits(uint _public, uint _whitelistedInitialLimit) external;
    function setMintPeriods(uint _start, uint _end) external;
    function setMintPrice(uint _price) external;
    function setTreasure(address _treasure) external;
    function tokenURI(uint tokenId) external view returns (string memory);
    function setBaseURI(string memory _baseURI_) external;
    function checkProof(bytes32[] memory proof) external view returns (bool);
    function claim(bytes32[] memory proof) external payable;
    function mint(bytes32[] memory proof) external payable;
    function tokenOfOwnerByIndex(address owner, uint index) external view returns (uint);
}
