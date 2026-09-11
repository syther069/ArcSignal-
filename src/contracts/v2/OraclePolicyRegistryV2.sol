// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {OraclePolicyVersionData} from "./ArcSignalTypes.sol";

contract OraclePolicyRegistryV2 is AccessControl {
    bytes32 public constant ORACLE_POLICY_ADMIN_ROLE = keccak256("ORACLE_POLICY_ADMIN_ROLE");
    uint256 public constant MAX_URI_BYTES = 512;

    mapping(uint32 policyId => mapping(uint32 version => OraclePolicyVersionData)) private _versions;
    mapping(uint32 policyId => uint32 latestVersion) public latestVersion;

    error InvalidPolicy();
    error InvalidVersion();
    error MetadataTooLarge();

    event OraclePolicyVersionRegistered(
        uint32 indexed policyId,
        uint32 indexed version,
        address indexed adapter,
        address oracle,
        address bondCurrency,
        bytes32 identifier,
        uint64 minLiveness,
        uint64 maxLiveness,
        uint128 minBond,
        bytes32 rulesHash,
        string rulesURI
    );
    event OraclePolicyVersionStatusChanged(uint32 indexed policyId, uint32 indexed version, bool activeForNewMarkets);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidPolicy();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_POLICY_ADMIN_ROLE, admin);
    }

    function registerVersion(uint32 policyId, uint32 version, OraclePolicyVersionData calldata data)
        external
        onlyRole(ORACLE_POLICY_ADMIN_ROLE)
    {
        if (
            policyId == 0 || version == 0 || version != latestVersion[policyId] + 1 || data.adapter == address(0)
                || data.oracle == address(0) || data.bondCurrency == address(0) || data.identifier == bytes32(0)
                || data.minLiveness == 0 || data.maxLiveness < data.minLiveness || data.rulesHash == bytes32(0)
        ) revert InvalidPolicy();
        if (bytes(data.rulesURI).length == 0 || bytes(data.rulesURI).length > MAX_URI_BYTES) revert MetadataTooLarge();

        OraclePolicyVersionData memory stored = data;
        stored.activeForNewMarkets = true;
        _versions[policyId][version] = stored;
        latestVersion[policyId] = version;
        emit OraclePolicyVersionRegistered(
            policyId,
            version,
            stored.adapter,
            stored.oracle,
            stored.bondCurrency,
            stored.identifier,
            stored.minLiveness,
            stored.maxLiveness,
            stored.minBond,
            stored.rulesHash,
            stored.rulesURI
        );
    }

    function setVersionActive(uint32 policyId, uint32 version, bool active)
        external
        onlyRole(ORACLE_POLICY_ADMIN_ROLE)
    {
        OraclePolicyVersionData storage data = _versions[policyId][version];
        if (data.adapter == address(0)) revert InvalidPolicy();
        data.activeForNewMarkets = active;
        emit OraclePolicyVersionStatusChanged(policyId, version, active);
    }

    function getVersion(uint32 policyId, uint32 version) external view returns (OraclePolicyVersionData memory) {
        OraclePolicyVersionData memory data = _versions[policyId][version];
        if (data.adapter == address(0)) revert InvalidPolicy();
        return data;
    }

    function isActive(uint32 policyId, uint32 version) external view returns (bool) {
        return _versions[policyId][version].activeForNewMarkets;
    }
}
