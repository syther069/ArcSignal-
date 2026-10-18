#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-https://rpc.mainnet.arc.io}"
CHAIN_ID="${CHAIN_ID:-5042}"
BROADCAST="${1:-}"

echo "====================================================="
echo "  ArcSignal V2: Arc Mainnet Deployment Runbook       "
echo "====================================================="

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  echo "Error: DEPLOYER_PRIVATE_KEY environment variable is required." >&2
  exit 1
fi

if [ "$CHAIN_ID" != "5042" ] || [[ "$RPC_URL" == *testnet* ]]; then
  echo "Error: this runbook is Arc Mainnet-only (chain ID 5042 and a non-testnet RPC)." >&2
  exit 1
fi

for name in OPTIMISTIC_ORACLE_ADDRESS PROTOCOL_ADMIN MARKET_CREATOR RESOLUTION_OPERATOR PAUSE_GUARDIAN PROTOCOL_TREASURY; do
  if [ -z "${!name:-}" ]; then
    echo "Error: $name is required; mainnet roles must not default to the deployer." >&2
    exit 1
  fi
done

if [[ ! "${GIT_COMMIT:-}" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Error: GIT_COMMIT must be the exact 40-character audited release SHA." >&2
  exit 1
fi

export EXPECTED_CHAIN_ID="$CHAIN_ID"
export USDC_ADDRESS="0x3600000000000000000000000000000000000000"
export MAX_MARKET_COLLATERAL="${MAX_MARKET_COLLATERAL:-100000000000}"
export MAX_PROTOCOL_COLLATERAL="${MAX_PROTOCOL_COLLATERAL:-1000000000000}"
export MAX_INITIAL_LIQUIDITY="${MAX_INITIAL_LIQUIDITY:-10000000000}"
export CATEGORY_METADATA_BASE_URI="${CATEGORY_METADATA_BASE_URI:-https://arc-signal.xyz/categories}"
export PROTOCOL_FEE_BPS="${PROTOCOL_FEE_BPS:-50}"
export LP_FEE_BPS="${LP_FEE_BPS:-100}"
export ORACLE_IDENTIFIER="${ORACLE_IDENTIFIER:-0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000}"
export ORACLE_MIN_LIVENESS="${ORACLE_MIN_LIVENESS:-7200}"
export ORACLE_MAX_LIVENESS="${ORACLE_MAX_LIVENESS:-604800}"
export ORACLE_MIN_BOND="${ORACLE_MIN_BOND:-10000000}"
export ORACLE_RULES_HASH="${ORACLE_RULES_HASH:-0x0000000000000000000000000000000000000000000000000000000000000001}"
export ORACLE_RULES_URI="${ORACLE_RULES_URI:-https://arc-signal.xyz/oracle-rules.json}"

if [ "$BROADCAST" != "--broadcast" ]; then
  echo "Dry run only. Pass --broadcast after explicit approval to submit a real Arc Mainnet transaction."
  forge script script/DeployArcSignalV2.s.sol --rpc-url "$RPC_URL"
  exit $?
fi

if [ "${ARC_MAINNET_DEPLOYMENT_APPROVED:-}" != "true" ]; then
  echo "Error: set ARC_MAINNET_DEPLOYMENT_APPROVED=true only after audited-release deployment approval." >&2
  exit 1
fi

echo "Target Chain ID: $CHAIN_ID"
echo "RPC Endpoint: $RPC_URL"

echo ""
echo "[1/3] Broadcasting approved V2 protocol contracts to Arc Mainnet..."
forge script script/DeployArcSignalV2.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url "https://explorer.arc.io/api"

echo ""
echo "[2/3] Verifying deployed bytecode and writing the release manifest..."
node scripts/register-v2-deployment.mjs "$CHAIN_ID"
echo "Database remains untouched. Register with --register only after independent verification; --activate requires a separate release decision."

echo ""
echo "[3/3] Deployment complete!"
