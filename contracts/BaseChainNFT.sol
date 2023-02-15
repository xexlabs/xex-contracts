// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./@layerzerolabs/solidity-examples/contracts/token/oft/extension/BasedOFT.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; // OZ: MerkleProof

contract XexBasedOFT is BasedOFT {
    uint public nextMintId;
    uint public maxMintId;
    bool public paused = true;
    bytes32 public immutable merkleRoot;
    mapping(address => bool) public hasClaimed;
    uint public maxMintPerWallet = 2;

    error InvalidMaxMint();
    error MintIsPaused();
    error MintPeriodNotStarted();
    error MintPeriodAlreadyStarted();
    error InvalidMintDates();
    error MaxMintReached();
    error AlreadyClaimed();
    error InvalidProof();
    error InvalidMintAmount();

    constructor(address _layerZeroEndpoint, uint _initialSupply, uint _maxMintId, uint _start, uint _end,
        bytes32 _merkleRoot )
    BasedOFT("XexAddons", "XA", _layerZeroEndpoint)
    {
        if (_initialSupply > 0)
            _mint(_msgSender(), _initialSupply);

        if (_maxMintId == 0)
            revert InvalidMaxMint();

        if (_start == 0 || _end == 0 || _start >= _end)
            revert InvalidMintDates();

        if(hasClaimed[msg.sender])
            revert AlreadyClaimed();

        merkleRoot = _merkleRoot;
    }

    function mint( uint amount ) external payable {

        if (paused)
            revert MintIsPaused();

        if (block.timestamp < _start)
            revert MintPeriodNotStarted();

        if (block.timestamp > _end)
            revert MintPeriodAlreadyStarted();

        if (nextMintId > maxMintId)
            revert MaxMintReached();


        if (block.timestamp >= _start && block.timestamp <= _end ){
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
            bool isValidLeaf = MerkleProof.verify(proof, merkleRoot, leaf);

            if(!isValidLeaf)
                revert InvalidProof();
        }

        if( amount > maxMintPerWallet )
            revert InvalidMintAmount();

        uint newId = nextMintId;
        nextMintId++;

        _safeMint(msg.sender, newId);
    }

}
