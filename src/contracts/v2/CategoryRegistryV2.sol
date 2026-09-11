// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CategoryVersionData} from "./ArcSignalTypes.sol";

contract CategoryRegistryV2 is AccessControl {
    bytes32 public constant CATEGORY_ADMIN_ROLE = keccak256("CATEGORY_ADMIN_ROLE");
    uint256 public constant MAX_URI_BYTES = 512;

    mapping(uint32 categoryId => mapping(uint32 version => CategoryVersionData)) private _versions;
    mapping(uint32 categoryId => uint32 latestVersion) public latestVersion;

    error InvalidCategory();
    error InvalidVersion();
    error VersionAlreadyExists();
    error MetadataTooLarge();

    event CategoryVersionRegistered(
        uint32 indexed categoryId, uint32 indexed version, bytes32 nameHash, bytes32 schemaHash, string metadataURI
    );
    event CategoryVersionStatusChanged(uint32 indexed categoryId, uint32 indexed version, bool activeForNewMarkets);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidCategory();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CATEGORY_ADMIN_ROLE, admin);
    }

    function registerVersion(
        uint32 categoryId,
        uint32 version,
        bytes32 nameHash,
        bytes32 schemaHash,
        string calldata metadataURI
    ) external onlyRole(CATEGORY_ADMIN_ROLE) {
        if (categoryId == 0 || nameHash == bytes32(0) || schemaHash == bytes32(0)) {
            revert InvalidCategory();
        }
        if (version == 0 || version != latestVersion[categoryId] + 1) revert InvalidVersion();
        if (_versions[categoryId][version].nameHash != bytes32(0)) revert VersionAlreadyExists();
        if (bytes(metadataURI).length == 0 || bytes(metadataURI).length > MAX_URI_BYTES) revert MetadataTooLarge();

        _versions[categoryId][version] = CategoryVersionData({
            nameHash: nameHash, schemaHash: schemaHash, metadataURI: metadataURI, activeForNewMarkets: true
        });
        latestVersion[categoryId] = version;
        emit CategoryVersionRegistered(categoryId, version, nameHash, schemaHash, metadataURI);
    }

    function setVersionActive(uint32 categoryId, uint32 version, bool active) external onlyRole(CATEGORY_ADMIN_ROLE) {
        CategoryVersionData storage data = _versions[categoryId][version];
        if (data.nameHash == bytes32(0)) revert InvalidCategory();
        data.activeForNewMarkets = active;
        emit CategoryVersionStatusChanged(categoryId, version, active);
    }

    function getVersion(uint32 categoryId, uint32 version) external view returns (CategoryVersionData memory) {
        CategoryVersionData memory data = _versions[categoryId][version];
        if (data.nameHash == bytes32(0)) revert InvalidCategory();
        return data;
    }

    function isActive(uint32 categoryId, uint32 version) external view returns (bool) {
        return _versions[categoryId][version].activeForNewMarkets;
    }
}
