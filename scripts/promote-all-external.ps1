param(
  [int]$Limit = 20,
  [string]$BaseUrl = "http://localhost:3000",
  [string]$CronSecret = $env:CRON_SECRET
)

$ErrorActionPreference = "Stop"

function Invoke-ArcSignalCron {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  if (-not $CronSecret) {
    throw "CRON_SECRET is not set. Pass -CronSecret or set `$env:CRON_SECRET."
  }

  $url = "$BaseUrl$Path"
  Write-Host "\n> POST $url" -ForegroundColor Cyan
  $response = & curl.exe -sS -X POST $url -H "Authorization: Bearer $CronSecret"
  if ($LASTEXITCODE -ne 0) {
    throw "curl failed for $url"
  }
  Write-Host $response
  return $response
}

$categories = @("politics", "technology", "economics")

Write-Host "Promoting external markets into ArcSignal V2" -ForegroundColor Magenta
Write-Host "BaseUrl: $BaseUrl"
Write-Host "Limit per category: $Limit"

foreach ($category in $categories) {
  Invoke-ArcSignalCron -Path "/api/cron/promote-live-markets?category=$category&limit=$Limit" | Out-Null
  Invoke-ArcSignalCron -Path "/api/cron/index-v2" | Out-Null
}

Write-Host "\nFinal V2 index pass" -ForegroundColor Cyan
Invoke-ArcSignalCron -Path "/api/cron/index-v2" | Out-Null

Write-Host "\nDone. Refresh $BaseUrl/markets" -ForegroundColor Green
