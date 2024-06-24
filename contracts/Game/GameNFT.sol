// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract GameNFT is ERC721, ERC721Enumerable, AccessControl {
    string public baseURI_;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    constructor() ERC721("NFT", "XEXGF") {}
    function contractURI() external pure returns (string memory) {
        return "https://xexgf.xexlabs.com/contract.json";
    }
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC721Enumerable, ERC721) returns (bool) {
        return interfaceId == type(AccessControl).interfaceId || super.supportsInterface(interfaceId);
    }
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Enumerable, ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }
    function _increaseBalance(address account, uint128 value) internal override(ERC721Enumerable, ERC721) {
        super._increaseBalance(account, value);
    }
    function mint(address to) public onlyRole(MINTER_ROLE) returns (uint256) {
        return _internal_mint(to);
    }
    function _internal_mint(address to) internal returns (uint256) {
        uint256 tokenId = totalSupply();
        _safeMint(to, tokenId);
        return tokenId;
    }
    function burn(uint256 tokenId) public onlyRole(MINTER_ROLE) {
        _burn(tokenId);
    }
}
