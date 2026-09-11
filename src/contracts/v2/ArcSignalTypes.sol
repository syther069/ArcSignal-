// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

type CategoryId is uint32;
type OraclePolicyId is uint32;

enum MarketState {
    OPEN,
    CLOSED,
    RESOLVED,
    VOIDED
}

enum OracleState {
    NONE,
    REQUESTED,
    PROPOSED,
    DISPUTED,
    SETTLED
}

enum BinaryOutcome {
    UNSET,
    YES,
    NO,
    UNDETERMINED
}

struct CategoryVersionData {
    bytes32 nameHash;
    bytes32 schemaHash;
    string metadataURI;
    bool activeForNewMarkets;
}

struct OraclePolicyVersionData {
    address adapter;
    address oracle;
    address bondCurrency;
    bytes32 identifier;
    uint64 minLiveness;
    uint64 maxLiveness;
    uint128 minBond;
    bytes32 rulesHash;
    string rulesURI;
    bool activeForNewMarkets;
}

struct MarketCreationParams {
    bytes32 marketId;
    uint16 metadataSchemaVersion;
    uint32 categoryId;
    uint32 categoryVersion;
    uint32 oraclePolicyId;
    uint32 oraclePolicyVersion;
    uint64 closeTime;
    uint64 liveness;
    uint64 voidAfter;
    uint128 proposerBond;
    uint128 oracleReward;
    bytes32 termsHash;
    bytes32 resolutionSourceHash;
    bytes ancillaryData;
    string metadataURI;
    bool thesisPredictsYes;
    uint128 initialLiquidity;
}
