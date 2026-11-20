// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Script, console2} from "forge-std/Script.sol";
import {CategoryRegistryV2} from "../src/contracts/v2/CategoryRegistryV2.sol";
import {OraclePolicyRegistryV2} from "../src/contracts/v2/OraclePolicyRegistryV2.sol";
import {ProtocolFeeControllerV2} from "../src/contracts/v2/ProtocolFeeControllerV2.sol";
import {UMAOracleAdapterV2} from "../src/contracts/v2/UMAOracleAdapterV2.sol";
import {TestnetOptimisticOracleV2} from "../src/contracts/v2/TestnetOptimisticOracleV2.sol";
import {ArcSignalFactoryV2} from "../src/contracts/v2/ArcSignalFactoryV2.sol";
import {ArcSignalMarketDeployerV2} from "../src/contracts/v2/ArcSignalMarketDeployerV2.sol";
import {PredictionMarketAMMDeployerV2} from "../src/contracts/v2/PredictionMarketAMMDeployerV2.sol";
import {ArcSignalSettlementOracleV2} from "../src/contracts/v2/ArcSignalSettlementOracleV2.sol";
import {OraclePolicyVersionData} from "../src/contracts/v2/ArcSignalTypes.sol";

/// Deploys a complete, fresh ArcSignal V2 stack.
///
/// Oracle modes:
///   SETTLEMENT_ORACLE=true  deploy ArcSignalSettlementOracleV2 (operator proposes, anyone disputes
///                           with a bond, arbiter decides) and use it as oracle policy 1 v1. Recommended.
///   otherwise               use the external optimistic oracle at OPTIMISTIC_ORACLE_ADDRESS through
///                           the UMA adapter. On mainnet it must be a real contract.
///
/// Safety (added after the 2026-11-20 incident): refuses known-compromised wallets in every role,
/// refuses a code-less oracle on mainnet, and keeps proposer != arbiter unless ALLOW_SINGLE_OPERATOR=true.
contract DeployArcSignalV2 is Script {
    struct DeploymentConfig {
        uint256 deployerKey;
        address deployer;
        address protocolAdmin;
        address marketCreator;
        address resolutionOperator;
        address pauseGuardian;
        address treasury;
        address usdc;
        address oracle; // external optimistic oracle (non-settlement mode)
        bool settlementOracle;
        address settlementProposer;
        address settlementArbiter;
        bool allowSingleOperator;
        uint256 maxMarketCollateral;
        uint256 maxProtocolCollateral;
        uint256 maxInitialLiquidity;
        string categoryBaseURI;
        uint16 protocolFeeBps;
        uint16 lpFeeBps;
        bytes32 oracleIdentifier;
        uint64 minLiveness;
        uint64 maxLiveness;
        uint128 minBond;
        bytes32 rulesHash;
        string rulesURI;
    }

    struct Deployed {
        address categories;
        address policies;
        address fees;
        address adapter;
        address oracle;
        address marketDeployer;
        address ammDeployer;
        address factory;
    }

    /// Wallets known to be compromised. Never accept them in any role.
    function _isCompromised(address a) internal pure returns (bool) {
        return a == 0x93c55fDC841835fB61b944C6970f334AD4A2A5d6 || a == 0xA53Ad24909d9E5f4eE015b90EAA0fbA5C0B9A9a5;
    }

    function run() external {
        DeploymentConfig memory config = _loadConfig();
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        require(block.chainid == expectedChainId, "unexpected deployment chain");
        if (expectedChainId == 5042) {
            require(!vm.envOr("DEPLOY_TESTNET_ORACLE", false), "cannot deploy testnet oracle on mainnet");
        }
        Deployed memory d = deploy(config);
        console2.log("CategoryRegistryV2", d.categories);
        console2.log("OraclePolicyRegistryV2", d.policies);
        console2.log("ProtocolFeeControllerV2", d.fees);
        console2.log("OracleAdapter", d.adapter);
        console2.log("Oracle", d.oracle);
        console2.log("ArcSignalMarketDeployerV2", d.marketDeployer);
        console2.log("PredictionMarketAMMDeployerV2", d.ammDeployer);
        console2.log("ArcSignalFactoryV2", d.factory);
        console2.log("Deployment block (use as NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK)", block.number);
    }

    function deploy(DeploymentConfig memory config) public returns (Deployed memory d) {
        _checkRoles(config);
        vm.startBroadcast(config.deployerKey);
        d.categories = address(new CategoryRegistryV2(config.deployer));
        d.policies = address(new OraclePolicyRegistryV2(config.deployer));
        d.fees = address(new ProtocolFeeControllerV2(config.deployer, config.treasury));
        (d.adapter, d.oracle) = _deployOracle(config);
        d.marketDeployer = address(new ArcSignalMarketDeployerV2(config.deployer));
        d.ammDeployer = address(new PredictionMarketAMMDeployerV2(config.deployer));
        d.factory = _deployFactory(config, d);
        ArcSignalMarketDeployerV2(d.marketDeployer).bindFactory(d.factory);
        PredictionMarketAMMDeployerV2(d.ammDeployer).bindFactory(d.factory);
        _registerCategories(CategoryRegistryV2(d.categories), config.categoryBaseURI);
        ProtocolFeeControllerV2(d.fees).registerFeeVersion(config.protocolFeeBps, config.lpFeeBps);
        _registerPolicy(config, d);
        _handoffCategoryRoles(CategoryRegistryV2(d.categories), config.deployer, config.protocolAdmin);
        _handoffPolicyRoles(OraclePolicyRegistryV2(d.policies), config.deployer, config.protocolAdmin);
        _handoffFeeRoles(ProtocolFeeControllerV2(d.fees), config.deployer, config.protocolAdmin);
        _handoffFactoryRoles(
            ArcSignalFactoryV2(d.factory), config.deployer, config.protocolAdmin, config.marketCreator,
            config.resolutionOperator, config.pauseGuardian
        );
        vm.stopBroadcast();
    }

    function _deployOracle(DeploymentConfig memory config) internal returns (address adapter, address oracle) {
        if (config.settlementOracle) {
            oracle = address(new ArcSignalSettlementOracleV2(
                config.protocolAdmin, config.settlementProposer, config.settlementArbiter, config.usdc, config.treasury
            ));
            return (oracle, oracle); // acts as its own adapter
        }
        oracle = config.oracle;
        if (oracle == address(0)) {
            require(block.chainid != 5042, "cannot instantiate testnet oracle shim on mainnet");
            oracle = address(new TestnetOptimisticOracleV2());
        }
        if (block.chainid == 5042) require(oracle.code.length > 0, "mainnet oracle must be a contract");
        adapter = address(new UMAOracleAdapterV2(oracle));
    }

    function _deployFactory(DeploymentConfig memory config, Deployed memory d) internal returns (address) {
        return address(new ArcSignalFactoryV2(
            config.deployer, config.usdc, d.categories, d.policies, d.fees, d.marketDeployer, d.ammDeployer,
            config.maxMarketCollateral, config.maxProtocolCollateral, config.maxInitialLiquidity
        ));
    }

    function _registerPolicy(DeploymentConfig memory config, Deployed memory d) internal {
        OraclePolicyRegistryV2(d.policies).registerVersion(
            1,
            1,
            OraclePolicyVersionData({
                adapter: d.adapter,
                oracle: d.oracle,
                bondCurrency: config.usdc,
                identifier: config.oracleIdentifier,
                minLiveness: config.minLiveness,
                maxLiveness: config.maxLiveness,
                minBond: config.minBond,
                rulesHash: config.rulesHash,
                rulesURI: config.rulesURI,
                activeForNewMarkets: true
            })
        );
    }

    function _checkRoles(DeploymentConfig memory c) internal pure {
        require(!_isCompromised(c.deployer), "deployer wallet is compromised");
        require(!_isCompromised(c.protocolAdmin), "protocol admin wallet is compromised");
        require(!_isCompromised(c.marketCreator), "market creator wallet is compromised");
        require(!_isCompromised(c.resolutionOperator), "resolution operator wallet is compromised");
        require(!_isCompromised(c.pauseGuardian), "pause guardian wallet is compromised");
        require(!_isCompromised(c.treasury), "treasury wallet is compromised");
        require(!_isCompromised(c.oracle), "oracle address is compromised");
        if (c.settlementOracle) {
            require(c.settlementProposer != address(0) && c.settlementArbiter != address(0), "settlement roles required");
            require(!_isCompromised(c.settlementProposer), "settlement proposer wallet is compromised");
            require(!_isCompromised(c.settlementArbiter), "settlement arbiter wallet is compromised");
            if (!c.allowSingleOperator) require(c.settlementProposer != c.settlementArbiter, "proposer and arbiter must differ");
        }
    }

    function _loadConfig() private view returns (DeploymentConfig memory config) {
        config.deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        config.deployer = vm.addr(config.deployerKey);
        config.protocolAdmin = vm.envAddress("PROTOCOL_ADMIN");
        config.marketCreator = vm.envAddress("MARKET_CREATOR");
        config.resolutionOperator = vm.envAddress("RESOLUTION_OPERATOR");
        config.pauseGuardian = vm.envAddress("PAUSE_GUARDIAN");
        config.treasury = vm.envAddress("PROTOCOL_TREASURY");
        config.usdc = vm.envAddress("USDC_ADDRESS");
        config.settlementOracle = vm.envOr("SETTLEMENT_ORACLE", false);
        if (config.settlementOracle) {
            config.settlementProposer = vm.envAddress("SETTLEMENT_PROPOSER");
            config.settlementArbiter = vm.envAddress("SETTLEMENT_ARBITER");
            config.allowSingleOperator = vm.envOr("ALLOW_SINGLE_OPERATOR", false);
        } else if (!vm.envOr("DEPLOY_TESTNET_ORACLE", false)) {
            config.oracle = vm.envAddress("OPTIMISTIC_ORACLE_ADDRESS");
        }
        config.maxMarketCollateral = vm.envUint("MAX_MARKET_COLLATERAL");
        config.maxProtocolCollateral = vm.envUint("MAX_PROTOCOL_COLLATERAL");
        config.maxInitialLiquidity = vm.envUint("MAX_INITIAL_LIQUIDITY");
        config.categoryBaseURI = vm.envString("CATEGORY_METADATA_BASE_URI");
        config.protocolFeeBps = uint16(vm.envUint("PROTOCOL_FEE_BPS"));
        config.lpFeeBps = uint16(vm.envUint("LP_FEE_BPS"));
        config.oracleIdentifier = vm.envBytes32("ORACLE_IDENTIFIER");
        config.minLiveness = uint64(vm.envUint("ORACLE_MIN_LIVENESS"));
        config.maxLiveness = uint64(vm.envUint("ORACLE_MAX_LIVENESS"));
        config.minBond = uint128(vm.envUint("ORACLE_MIN_BOND"));
        config.rulesHash = vm.envBytes32("ORACLE_RULES_HASH");
        config.rulesURI = vm.envString("ORACLE_RULES_URI");
    }

    function _registerCategories(CategoryRegistryV2 registry, string memory baseURI) private {
        bytes32 schema = keccak256("ArcSignal binary market category schema v1");
        registry.registerVersion(1, 1, keccak256("CRYPTO"), schema, string.concat(baseURI, "/crypto-v1.json"));
        registry.registerVersion(2, 1, keccak256("SPORTS"), schema, string.concat(baseURI, "/sports-v1.json"));
        registry.registerVersion(3, 1, keccak256("POLITICS"), schema, string.concat(baseURI, "/politics-v1.json"));
        registry.registerVersion(4, 1, keccak256("TECHNOLOGY"), schema, string.concat(baseURI, "/technology-v1.json"));
        registry.registerVersion(5, 1, keccak256("ECONOMICS"), schema, string.concat(baseURI, "/economics-v1.json"));
        registry.registerVersion(6, 1, keccak256("CULTURE"), schema, string.concat(baseURI, "/culture-v1.json"));
    }

    function _handoffCategoryRoles(CategoryRegistryV2 registry, address deployer, address admin) private {
        registry.grantRole(registry.DEFAULT_ADMIN_ROLE(), admin);
        registry.grantRole(registry.CATEGORY_ADMIN_ROLE(), admin);
        if (admin != deployer) {
            registry.renounceRole(registry.CATEGORY_ADMIN_ROLE(), deployer);
            registry.renounceRole(registry.DEFAULT_ADMIN_ROLE(), deployer);
        }
    }

    function _handoffPolicyRoles(OraclePolicyRegistryV2 registry, address deployer, address admin) private {
        registry.grantRole(registry.DEFAULT_ADMIN_ROLE(), admin);
        registry.grantRole(registry.ORACLE_POLICY_ADMIN_ROLE(), admin);
        if (admin != deployer) {
            registry.renounceRole(registry.ORACLE_POLICY_ADMIN_ROLE(), deployer);
            registry.renounceRole(registry.DEFAULT_ADMIN_ROLE(), deployer);
        }
    }

    function _handoffFeeRoles(ProtocolFeeControllerV2 controller, address deployer, address admin) private {
        controller.grantRole(controller.DEFAULT_ADMIN_ROLE(), admin);
        controller.grantRole(controller.FEE_ADMIN_ROLE(), admin);
        if (admin != deployer) {
            controller.renounceRole(controller.FEE_ADMIN_ROLE(), deployer);
            controller.renounceRole(controller.DEFAULT_ADMIN_ROLE(), deployer);
        }
    }

    function _handoffFactoryRoles(
        ArcSignalFactoryV2 factory,
        address deployer,
        address admin,
        address creator,
        address resolver,
        address guardian
    ) private {
        factory.grantRole(factory.DEFAULT_ADMIN_ROLE(), admin);
        factory.grantRole(factory.MARKET_CREATOR_ROLE(), creator);
        factory.grantRole(factory.RESOLUTION_OPERATOR_ROLE(), resolver);
        factory.grantRole(factory.PAUSER_ROLE(), guardian);
        if (admin != deployer) factory.renounceRole(factory.DEFAULT_ADMIN_ROLE(), deployer);
        if (creator != deployer) factory.renounceRole(factory.MARKET_CREATOR_ROLE(), deployer);
        if (resolver != deployer) factory.renounceRole(factory.RESOLUTION_OPERATOR_ROLE(), deployer);
        if (guardian != deployer) factory.renounceRole(factory.PAUSER_ROLE(), deployer);
    }
}
