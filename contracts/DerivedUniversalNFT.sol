// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "./@layerzerolabs/solidity-examples/contracts/token/onft/ONFT721.sol";
contract XexUniversalONFT721 is ONFT721 {
    constructor(uint256 _minGasToStore, address _layerZeroEndpoint, uint _startMintId, uint _endMintId)
        ONFT721("XexAddons", "XA", _minGasToTransfer, _layerZeroEndpoint)
    {

    }
}
