# ArcSignal V2 Arc Mainnet Deployment & Registration Runbook
param(
    [string]$RpcUrl = "https://rpc.mainnet.arc.io",
    [string]$ChainId = "5042",
    [string]$GasPrice = "23gwei",
    [switch]$Broadcast,
    [switch]$Verify
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ArcSignal V2: Arc Mainnet Deployment Runbook       " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

if (-not $env:DEPLOYER_PRIVATE_KEY) {
    Write-Error "DEPLOYER_PRIVATE_KEY environment variable is required to deploy on Arc Mainnet."
    exit 1
}

if ($ChainId -ne "5042" -or $RpcUrl -match "testnet") {
    Write-Error "This runbook is Arc Mainnet-only (chain ID 5042 and a non-testnet RPC)."
    exit 1
}

$requiredAddresses = @("OPTIMISTIC_ORACLE_ADDRESS", "PROTOCOL_ADMIN", "MARKET_CREATOR", "RESOLUTION_OPERATOR", "PAUSE_GUARDIAN", "PROTOCOL_TREASURY")
foreach ($name in $requiredAddresses) {
    if (-not [Environment]::GetEnvironmentVariable($name)) {
        Write-Error "$name is required; mainnet roles must not default to the deployer."
        exit 1
    }
}
if (-not $env:GIT_COMMIT -or $env:GIT_COMMIT -notmatch '^[a-f0-9]{40}$') {
    Write-Error "GIT_COMMIT must be the exact 40-character audited release SHA."
    exit 1
}

$env:EXPECTED_CHAIN_ID = $ChainId
$env:USDC_ADDRESS = "0x3600000000000000000000000000000000000000"
$env:MAX_MARKET_COLLATERAL = if ($env:MAX_MARKET_COLLATERAL) { $env:MAX_MARKET_COLLATERAL } else { "100000000000" }
$env:MAX_PROTOCOL_COLLATERAL = if ($env:MAX_PROTOCOL_COLLATERAL) { $env:MAX_PROTOCOL_COLLATERAL } else { "1000000000000" }
$env:MAX_INITIAL_LIQUIDITY = if ($env:MAX_INITIAL_LIQUIDITY) { $env:MAX_INITIAL_LIQUIDITY } else { "10000000000" }
if (-not $env:CATEGORY_METADATA_BASE_URI) { $env:CATEGORY_METADATA_BASE_URI = "https://arc-signal.xyz/categories" }
if (-not $env:PROTOCOL_FEE_BPS) { $env:PROTOCOL_FEE_BPS = "50" }
if (-not $env:LP_FEE_BPS) { $env:LP_FEE_BPS = "100" }
if (-not $env:ORACLE_IDENTIFIER) { $env:ORACLE_IDENTIFIER = "0x5945535f4f525f4e4f5f51554552590000000000000000000000000000000000" }
if (-not $env:ORACLE_MIN_LIVENESS) { $env:ORACLE_MIN_LIVENESS = "7200" }
if (-not $env:ORACLE_MAX_LIVENESS) { $env:ORACLE_MAX_LIVENESS = "604800" }
if (-not $env:ORACLE_MIN_BOND) { $env:ORACLE_MIN_BOND = "10000000" }
if (-not $env:ORACLE_RULES_HASH) { $env:ORACLE_RULES_HASH = "0x0000000000000000000000000000000000000000000000000000000000000001" }
if (-not $env:ORACLE_RULES_URI) { $env:ORACLE_RULES_URI = "https://arc-signal.xyz/oracle-rules.json" }

$gasArgs = if ($GasPrice) { @("--with-gas-price", $GasPrice) } else { @() }

if (-not $Broadcast) {
    Write-Host "Dry run only. Add -Broadcast after explicit approval to submit a real Arc Mainnet transaction." -ForegroundColor Yellow
    forge script script/DeployArcSignalV2.s.sol --rpc-url $RpcUrl @gasArgs
    exit $LASTEXITCODE
}

if ($env:ARC_MAINNET_DEPLOYMENT_APPROVED -ne "true") {
    Write-Error "Set ARC_MAINNET_DEPLOYMENT_APPROVED=true only after the audited release has explicit deployment approval."
    exit 1
}

Write-Host "`nTarget Chain ID: $ChainId" -ForegroundColor Yellow
Write-Host "RPC Endpoint: $RpcUrl" -ForegroundColor Yellow
Write-Host "Deployer Address: $env:PROTOCOL_ADMIN" -ForegroundColor Yellow

Write-Host "`n[1/3] Broadcasting approved V2 protocol contracts to Arc Mainnet..." -ForegroundColor Green
$verifyArgs = @()
if ($Verify) {
    $verifyArgs = @("--verify", "--verifier", "blockscout", "--verifier-url", "https://explorer.arc.io/api")
}
forge script script/DeployArcSignalV2.s.sol `
    --rpc-url $RpcUrl `
    --broadcast `
    @gasArgs `
    @verifyArgs

Write-Host "`n[2/3] Verifying deployed bytecode and writing the release manifest..." -ForegroundColor Green
node scripts/register-v2-deployment.mjs $ChainId
Write-Host "Database remains untouched. After independent verification, register explicitly with --register; --activate requires a separate release decision." -ForegroundColor Yellow

Write-Host "`n[3/3] Deployment complete! Update your production environment with:" -ForegroundColor Green
$broadcastFile = "broadcast/DeployArcSignalV2.s.sol/$ChainId/run-latest.json"
if (Test-Path $broadcastFile) {
    $broadcast = Get-Content $broadcastFile -Raw | ConvertFrom-Json
    $factory = ($broadcast.transactions | Where-Object { $_.contractName -eq "ArcSignalFactoryV2" }).contractAddress
    $block = ($broadcast.receipts | Select-Object -First 1).blockNumber
    if ($block -match '^0x') { $block = [Convert]::ToInt64($block, 16) }
    
    Write-Host "`n# Copy into Vercel / .env.production:" -ForegroundColor Cyan
    Write-Host "NEXT_PUBLIC_ARC_NETWORK=mainnet"
    Write-Host "NEXT_PUBLIC_ARC_CHAIN_ID=5042"
    Write-Host "NEXT_PUBLIC_ARC_RPC_URL=https://rpc.mainnet.arc.io"
    Write-Host "NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x3600000000000000000000000000000000000000"
    Write-Host "NEXT_PUBLIC_ARCSIGNAL_V2_FACTORY_ADDRESS=$factory"
    Write-Host "NEXT_PUBLIC_ARCSIGNAL_V2_DEPLOYMENT_BLOCK=$block"
    Write-Host "ARCSIGNAL_DEPLOYMENT_BLOCK=$block"
}
