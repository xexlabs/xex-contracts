// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; // OZ: MerkleProof
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract XDON is Ownable, IERC721Metadata, ERC721Enumerable {
    using Strings for uint256;
    uint public nextMintId;
    uint public maxMintId;
    uint public whitelistStartPeriod;
    uint public whitelistEndPeriod;
    bytes32 public immutable merkleRoot;
    mapping(address => uint) public userMints;
    uint public mintPrice;
    uint public publicMintLimit = 2;
    uint public whitelistedInitialLimit = 2;
    uint public whitelistedMintLimit;

    address public treasure;
    bool public mintHalted = false;
    string baseURI_;

    error InvalidMintStartId();
    error InvalidMaxMint();
    error MintPeriodNotStarted();
    error MintPeriodEnded();
    error InvalidMintDates();
    error MaxMintReached();
    error AlreadyClaimed();
    error InvalidProof();
    error SetMintPriceInvalid();
    error SetTreasureInvalid();
    error InvalidPaymentTransfer();
    error MaxAllowedForPublic();
    error PublicMintNotStarted();
    error MaxAllowedForWhitelisted();
    error InvalidMintPayment();
    error MintingByContractNotAllowed();
    error InvalidMintPrice();
    error InvalidTreasureAddress();
    error MintHalted();

    event NewPrice(uint price);
    event NewLimits(uint _public, uint _whitelisted, uint _wlInitial);
    event MintPeriod(uint _public, uint _whitelisted);

    constructor() ERC721("Xexadons", "XDON") Ownable(msg.sender) {
        mintPrice = 1 ether;
        whitelistStartPeriod = block.timestamp;
        whitelistEndPeriod = block.timestamp + 10 days;
        nextMintId = 0;
        maxMintId = 1000;
        treasure = msg.sender;
        emit NewPrice(mintPrice);
        whitelistedMintLimit = publicMintLimit + whitelistedInitialLimit;
        emit NewLimits(publicMintLimit, whitelistedMintLimit, whitelistedInitialLimit);
        emit MintPeriod(whitelistStartPeriod, whitelistEndPeriod);
    }

    function contractURI() public pure returns (string memory) {
        return "https://xexadons.com/contract.json";
    }

    function haltMint() external onlyOwner {
        mintHalted = true;
    }

    function setMintLimits(uint _public, uint _whitelistedInitialLimit) external onlyOwner {
        publicMintLimit = _public;
        whitelistedInitialLimit = _whitelistedInitialLimit;
        whitelistedMintLimit = publicMintLimit + whitelistedInitialLimit;

        emit NewLimits(publicMintLimit, whitelistedMintLimit, _whitelistedInitialLimit);
    }

    function setMintPeriods(uint _start, uint _end) external onlyOwner {
        whitelistStartPeriod = _start;
        whitelistEndPeriod = _end;
        emit MintPeriod(whitelistStartPeriod, whitelistEndPeriod);
    }

    function setMintPrice(uint _price) external onlyOwner {
        if (_price == 0) revert SetMintPriceInvalid();
        mintPrice = _price;
        emit NewPrice(mintPrice);
    }

    function setTreasure(address _treasure) external onlyOwner {
        if (_treasure == address(0)) revert SetTreasureInvalid();
        treasure = _treasure;
    }

    function tokenURI(uint tokenId) public view override(ERC721, IERC721Metadata) returns (string memory) {
        return bytes(baseURI_).length > 0 ? string(abi.encodePacked(baseURI_, tokenId.toString(), ".json")) : "https://xexadons.com/xdon.json";
    }

    function setBaseURI(string memory _baseURI_) public onlyOwner {
        baseURI_ = _baseURI_;
    }

    modifier standardChecks() {
        // do not allow minting by a contract
        if (msg.sender != tx.origin) {
            revert MintingByContractNotAllowed();
        }

        // stop minting at any time, not possible to mint again
        if (mintHalted) {
            revert MintHalted();
        }

        // prevent minting before mint period start
        if (block.timestamp < whitelistStartPeriod) {
            revert MintPeriodNotStarted();
        }

        _;
    }

    function checkProof(bytes32[] memory proof) public view returns (bool) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, block.chainid))));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    function claim(bytes32[] memory proof) external payable standardChecks {
        // check if we are inside whitelist mint period
        if (block.timestamp > whitelistEndPeriod) {
            revert MintPeriodEnded();
        }

        // user must be in the whitelist for this chain.
        if (!checkProof(proof)) {
            revert InvalidProof();
        }

        // each whitelisted user can mint only 1 nft
        if (userMints[msg.sender] >= whitelistedInitialLimit) {
            revert MaxAllowedForWhitelisted();
        }

        uint newId = nextMintId;
        // check if we reached the max mint for this chain
        if (nextMintId > maxMintId) {
            revert MaxMintReached();
        }

        nextMintId++;
        userMints[msg.sender]++;

        _safeMint(msg.sender, newId);

        // check if user is correctly paying for this mint
        if (msg.value < mintPrice) {
            revert InvalidMintPayment();
        }

        (bool paymentValid, ) = payable(treasure).call{value: address(this).balance}("");

        // revert if sending funds to treasure return error
        if (!paymentValid) {
            revert InvalidPaymentTransfer();
        }
    }

    function mint(bytes32[] memory proof) external payable standardChecks {
        // above whitelist mint period, user can mint up to 2 nft
        if (block.timestamp < whitelistEndPeriod) {
            revert PublicMintNotStarted();
        }

        if (checkProof(proof)) {
            // if user is whitelisted he can mint:
            // - 1 from whitelist
            // - 1 from public mint
            if (userMints[msg.sender] >= whitelistedMintLimit) {
                revert MaxAllowedForWhitelisted();
            }
        } else {
            // if not invalid proof, user can mint only 1
            if (userMints[msg.sender] >= publicMintLimit) {
                revert MaxAllowedForPublic();
            }
        }

        uint newId = nextMintId;
        nextMintId++;

        // check if we reached the max mint for this chain
        if (nextMintId > maxMintId) {
            revert MaxMintReached();
        }

        userMints[msg.sender]++;
        _safeMint(msg.sender, newId);

        // check if user is correctly paying for this mint
        if (msg.value < mintPrice) {
            revert InvalidMintPayment();
        }

        (bool paymentValid, ) = payable(treasure).call{value: address(this).balance}("");

        // revert if sending funds to treasure return error
        if (!paymentValid) {
            revert InvalidPaymentTransfer();
        }
    }

    function ownerMint(address to) external onlyOwner {
        nextMintId++;
        _safeMint(to, nextMintId);
    }
}
