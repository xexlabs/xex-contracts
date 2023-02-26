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
    bool public paused = true;
    uint public whitelistStartPeriod;
    uint public whitelistEndPeriod;
    bytes32 public immutable merkleRoot;
    mapping(address => bool) public hasClaimed;
    uint public mintPrice = 0.05 ether;
    uint public publicMintLimit = 1;
    uint public whitelistedMintLimit = 2;
    address public treasure;
    string baseURI_;
    error InvalidMintStartId();
    error InvalidMaxMint();
    error MintIsPaused();
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

    event Pause(bool status);
    event NewPrice(uint price);
    event NewLimits(uint _public, uint _whitelisted);

    constructor(
        uint _minGasToTransfer, address _layerZeroEndpoint,
        uint _startMintId, uint _maxMintId,
        uint _whitelistStartPeriod, uint _whitelistEndPeriod,
        bytes32 _merkleRoot, uint _mintPrice, address _treasure )
    ONFT721("Xexadons", "XDON", _minGasToTransfer, _layerZeroEndpoint)
    {
        if( _startMintId == 0)
            revert InvalidMintStartId();

        if (_maxMintId == 0)
            revert InvalidMaxMint();

        if (_whitelistStartPeriod == 0 || _whitelistEndPeriod == 0 || _whitelistStartPeriod >= _whitelistEndPeriod)
            revert InvalidMintDates();

        if( _mintPrice == 0 )
            revert InvalidMintPrice();

        if( _treasure == address(0) )
            revert InvalidTreasureAddress();

        mintPrice = _mintPrice;

        whitelistStartPeriod = _whitelistStartPeriod;
        whitelistEndPeriod = _whitelistEndPeriod;

        nextMintId = _startMintId;
        maxMintId = _maxMintId;

        merkleRoot = _merkleRoot;

        treasure = _treasure;

        emit Pause(paused);

        emit NewPrice(mintPrice);

        emit NewLimits(publicMintLimit, whitelistedMintLimit);

    }

    function setMintLimits(uint _public, uint _whitelisted) external onlyOwner {
        publicMintLimit = _public;
        whitelistedMintLimit = _whitelisted;
        emit NewLimits(publicMintLimit, whitelistedMintLimit);
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

    modifier standardChecks(){
        // do not allow minting by a contract
        if( msg.sender != tx.origin ){
            revert MintingByContractNotAllowed();
        }

        // in case of any problem, admin can pause the contract.
        if (paused){
            revert MintIsPaused();
        }

        // prevent minting before mint period start
        if (block.timestamp < whitelistStartPeriod){
            revert MintPeriodNotStarted();
        }

        _;

    }

    function checkProof(bytes32[] memory proof) public view returns(bool){
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    function claim(bytes32[] memory proof) external payable standardChecks {


        // check if we are inside whitelist mint period
        if (block.timestamp > whitelistEndPeriod) {
            revert MintPeriodEnded();
        }

        // user must be in the whitelist for this chain.
        if (!checkProof(proof)){
            revert InvalidProof();
        }

        // each whitelisted user can mint only 1 nft
        if( balanceOf(msg.sender) == 1 ){
            revert MaxAllowedForWhitelisted();
        }


        uint newId = nextMintId;
        // check if we reached the max mint for this chain
        if (nextMintId > maxMintId){
            revert MaxMintReached();
        }

        nextMintId++;

        _safeMint(msg.sender, newId);

        // check if user is correctly paying for this mint
        if( msg.value < mintPrice ){
            revert InvalidMintPayment();
        }

        (bool paymentValid, ) = payable(treasure).call{value: address(this).balance}("");

        // revert if sending funds to treasure return error
        if( ! paymentValid ){
            revert InvalidPaymentTransfer();
        }

    }

    function mint( bytes32[] memory proof ) external payable standardChecks {

        // above whitelist mint period, user can mint up to 2 nft
        if( block.timestamp < whitelistEndPeriod ){
            revert PublicMintNotStarted();
        }

        if ( checkProof(proof) ){
            // if user is whitelisted he can mint:
            // - 1 from whitelist
            // - 1 from public mint
            if( balanceOf(msg.sender) == whitelistedMintLimit ){
                revert MaxAllowedForWhitelisted();
            }
        }else{
            // if not invalid proof, user can mint only 1
            if( balanceOf(msg.sender) == publicMintLimit ){
                revert MaxAllowedForPublic();
            }
        }

        uint newId = nextMintId;
        nextMintId++;

        // check if we reached the max mint for this chain
        if (nextMintId > maxMintId){
            revert MaxMintReached();
        }

        _safeMint(msg.sender, newId);

        // check if user is correctly paying for this mint
        if( msg.value < mintPrice ){
            revert InvalidMintPayment();
        }

        (bool paymentValid, ) = payable(treasure).call{value: address(this).balance}("");

        // revert if sending funds to treasure return error
        if( ! paymentValid ){
            revert InvalidPaymentTransfer();
        }

    }

}
