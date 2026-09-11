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
import {OraclePolicyVersionData} from "../src/contracts/v2/ArcSignalTypes.sol";

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
        address oracle;
    }

    function run() external {
        DeploymentConfig memory config = _loadConfig();
        uint256 expectedChainId = vm.envUint("EXPECTED_CHAIN_ID");
        require(block.chainid == expectedChainId, "unexpected deployment chain");

        vm.startBroadcast(config.deployerKey);
        if (config.oracle == address(0)) {
            TestnetOptimisticOracleV2 oracle = new TestnetOptimisticOracleV2();
            config.oracle = address(oracle);
            console2.log("TestnetOptimisticOracleV2", config.oracle);
        }
        CategoryRegistryV2 categories = new CategoryRegistryV2(config.deployer);
        OraclePolicyRegistryV2 policies = new OraclePolicyRegistryV2(config.deployer);
        ProtocolFeeControllerV2 fees = new ProtocolFeeControllerV2(config.deployer, config.treasury);
        UMAOracleAdapterV2 adapter = new UMAOracleAdapterV2(config.oracle);
        ArcSignalMarketDeployerV2 marketDeployer = new ArcSignalMarketDeployerV2(config.deployer);
        PredictionMarketAMMDeployerV2 ammDeployer = new PredictionMarketAMMDeployerV2(config.deployer);
        ArcSignalFactoryV2 factory = new ArcSignalFactoryV2(
            config.deployer,
            config.usdc,
            address(categories),
            address(policies),
            address(fees),
            address(marketDeployer),
            address(ammDeployer)
        );
        marketDeployer.bindFactory(address(factory));
        ammDeployer.bindFactory(address(factory));

        _registerCategories(categories, vm.envString("CATEGORY_METADATA_BASE_URI"));
        fees.registerFeeVersion(uint16(vm.envUint("PROTOCOL_FEE_BPS")), uint16(vm.envUint("LP_FEE_BPS")));
        policies.registerVersion(
            1,
            1,
            OraclePolicyVersionData({
                adapter: address(adapter),
                oracle: config.oracle,
                bondCurrency: config.usdc,
                identifier: vm.envBytes32("ORACLE_IDENTIFIER"),
                minLiveness: uint64(vm.envUint("ORACLE_MIN_LIVENESS")),
                maxLiveness: uint64(vm.envUint("ORACLE_MAX_LIVENESS")),
                minBond: uint128(vm.envUint("ORACLE_MIN_BOND")),
                rulesHash: vm.envBytes32("ORACLE_RULES_HASH"),
                rulesURI: vm.envString("ORACLE_RULES_URI"),
                activeForNewMarkets: true
            })
        );

        _handoffCategoryRoles(categories, config.deployer, config.protocolAdmin);
        _handoffPolicyRoles(policies, config.deployer, config.protocolAdmin);
        _handoffFeeRoles(fees, config.deployer, config.protocolAdmin);
        _handoffFactoryRoles(
            factory,
            config.deployer,
            config.protocolAdmin,
            config.marketCreator,
            config.resolutionOperator,
            config.pauseGuardian
        );
        vm.stopBroadcast();

        console2.log("CategoryRegistryV2", address(categories));
        console2.log("OraclePolicyRegistryV2", address(policies));
        console2.log("ProtocolFeeControllerV2", address(fees));
        console2.log("UMAOracleAdapterV2", address(adapter));
        console2.log("ArcSignalMarketDeployerV2", address(marketDeployer));
        console2.log("PredictionMarketAMMDeployerV2", address(ammDeployer));
        console2.log("ArcSignalFactoryV2", address(factory));
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
        if (vm.envOr("DEPLOY_TESTNET_ORACLE", false)) {
            config.oracle = address(0);
        } else {
            config.oracle = vm.envAddress("OPTIMISTIC_ORACLE_ADDRESS");
        }
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
