// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./@layerzerolabs/solidity-examples/contracts/token/onft/ONFT721.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; // OZ: MerkleProof
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract XexBasedOFT is ONFT721 {
    using Strings for uint256;
    uint public nextMintId;
    uint public maxMintId;
    bool public paused;
    uint public startDate;
    uint public endDate;
    bytes32 public immutable merkleRoot;
    mapping(address => bool) public hasClaimed;
    uint public maxMintPerWallet = 2;
    uint public mintPrice;
    address public treasure;
    string baseURI_;
    error InvalidMintStartId();
    error InvalidMaxMint();
    error MintIsPaused();
    error MintPeriodNotStarted();
    error MintPeriodAlreadyEnded();
    error InvalidMintDates();
    error MaxMintReached();
    error AlreadyClaimed();
    error InvalidProof();
    error InvalidMintAmount();
    error SetMintPriceInvalid();
    error SetTreasureInvalid();

    error InvalidPaymentAmount();
    error InvalidPaymentTransfer();

    event Pause(bool status);
    event NewPrice(uint price);

    constructor(uint _minGasToTransfer, address _layerZeroEndpoint, uint _initialSupply, uint _maxMintId, uint _start, uint _end,
        bytes32 _merkleRoot, uint _startMintId)
    ONFT721("XexAddons", "XA", _minGasToTransfer, _layerZeroEndpoint)
    {
        if (_initialSupply > 0)
            _mint(_msgSender(), _initialSupply);

        if (_maxMintId == 0)
            revert InvalidMaxMint();

        if (_start == 0 || _end == 0 || _start >= _end)
            revert InvalidMintDates();

        startDate = _start;
        endDate = _end;

        if (hasClaimed[msg.sender])
            revert AlreadyClaimed();

        if( _startMintId == 0)
            revert InvalidMintStartId();

        nextMintId = _startMintId;

        merkleRoot = _merkleRoot;

        treasure = msg.sender;

        paused = true;
        emit Pause(paused);

        mintPrice = 0.05 ether;
        emit NewPrice(mintPrice);

    }

    function setMintPrice(uint _price) external onlyOwner {
        if (_price == 0)
            revert SetMintPriceInvalid();
        mintPrice = _price;
        emit NewPrice(mintPrice);
    }

    function setTreasure(address _treasure) external onlyOwner {
        if( _treasure == address(0) )
            revert SetTreasureInvalid();
        treasure = _treasure;
    }

    function toggle() external onlyOwner{
        paused = ! paused;
        emit Pause(paused);
    }

    function tokenURI(uint tokenId) public view override returns (string memory) {
        return bytes(baseURI_).length > 0 ? string(abi.encodePacked(baseURI_, tokenId.toString(), ".json")) : "";
    }

    function setBaseURI(string memory _baseURI_) public onlyOwner {
        baseURI_ = _baseURI_;
    }

    function mint(uint amount, bytes32[] memory proof) external payable {

        if (paused)
            revert MintIsPaused();

        if (block.timestamp < startDate)
            revert MintPeriodNotStarted();

        if (block.timestamp > endDate)
            revert MintPeriodAlreadyEnded();

        if (nextMintId > maxMintId)
            revert MaxMintReached();


        if (block.timestamp >= startDate && block.timestamp <= endDate) {
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
            bool isValidLeaf = MerkleProof.verify(proof, merkleRoot, leaf);

            if (!isValidLeaf)
                revert InvalidProof();
        }

        if (amount > maxMintPerWallet)
            revert InvalidMintAmount();

        uint newId = nextMintId;
        nextMintId++;

        _safeMint(msg.sender, newId);

        if( amount * mintPrice < msg.value )
            revert InvalidPaymentAmount();

        (bool paymentValid, ) = payable(treasure).call{value: address(this).balance}("");
        if( ! paymentValid )
            revert InvalidPaymentTransfer();

    }

}
