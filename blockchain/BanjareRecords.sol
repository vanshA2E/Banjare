// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Stores only hashes. Personal data and incident details stay off-chain.
contract BanjareRecords {
    mapping(bytes32 => uint256) public recordedAt;
    event RecordAnchored(bytes32 indexed recordHash, uint256 timestamp);

    function anchor(bytes32 recordHash) external {
        require(recordHash != bytes32(0), "empty hash");
        require(recordedAt[recordHash] == 0, "already anchored");
        recordedAt[recordHash] = block.timestamp;
        emit RecordAnchored(recordHash, block.timestamp);
    }
}
