param(
  [string]$ProjectId = "wgys-ls",
  [string]$FunctionsEnvFile = "functions/.env.wgys-ls",
  [string]$GcloudAccount = "",
  [switch]$DeleteAfterMigration,
  [switch]$DeployFunctions
)

$ErrorActionPreference = "Stop"

$secretNames = @(
  "ADMIN_SECRET",
  "ALLOWED_ORIGIN",
  "GA4_KEY",
  "GA4_PROPERTY_ID",
  "STRIPE_SECRET_KEY"
)

function Ensure-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command '$name' is not available in PATH."
  }
}

Ensure-Command "gcloud"
Ensure-Command "firebase"

function Invoke-Gcloud {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [string]$ErrorPrefix = "gcloud command failed"
  )

  $output = & gcloud @Args 2>&1
  if ($LASTEXITCODE -ne 0) {
    $msg = if ($output) { ($output | Out-String).Trim() } else { "No command output." }
    throw "$ErrorPrefix`n$msg"
  }
  return $output
}

Write-Host "Using GCP project: $ProjectId"
if (-not [string]::IsNullOrWhiteSpace($GcloudAccount)) {
  Invoke-Gcloud -Args @("config", "set", "account", $GcloudAccount, "--quiet") -ErrorPrefix "Failed to set gcloud account '$GcloudAccount'" | Out-Null
}
$activeAccount = (Invoke-Gcloud -Args @("config", "get-value", "account", "--quiet") -ErrorPrefix "Failed to read active gcloud account" | Select-Object -Last 1).ToString().Trim()
Write-Host "Using gcloud account: $activeAccount"

if ([string]::IsNullOrWhiteSpace($activeAccount) -or $activeAccount -eq "(unset)") {
  throw "No active gcloud account. Run: gcloud auth login"
}

try {
  Invoke-Gcloud -Args @("projects", "describe", $ProjectId, "--project=$ProjectId", "--quiet") -ErrorPrefix "Active account '$activeAccount' cannot access project '$ProjectId'" | Out-Null
} catch {
  throw "The active gcloud account '$activeAccount' cannot access project '$ProjectId' or is not authenticated. Run: gcloud auth login --account YOUR_EMAIL"
}

$envPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path $FunctionsEnvFile
$envDir = Split-Path $envPath -Parent
if (-not (Test-Path $envDir)) {
  New-Item -ItemType Directory -Path $envDir | Out-Null
}

# Rebuild env file from source of truth to avoid stale keys.
$lines = New-Object System.Collections.Generic.List[string]

foreach ($name in $secretNames) {
  Write-Host "Reading secret: $name"

  Invoke-Gcloud -Args @("secrets", "describe", $name, "--project=$ProjectId", "--quiet") -ErrorPrefix "Secret '$name' is not accessible by '$activeAccount'. Required permission: secretmanager.versions.access" | Out-Null

  $raw = (Invoke-Gcloud -Args @("secrets", "versions", "access", "latest", "--secret=$name", "--project=$ProjectId") -ErrorPrefix "Failed to read secret '$name' from Secret Manager" | Out-String)
  if ([string]::IsNullOrWhiteSpace($raw)) {
    throw "Secret '$name' returned an empty value."
  }

  $value = $raw.Trim()

  # Normalize GA4_KEY into one-line JSON to stay valid in .env files.
  if ($name -eq "GA4_KEY") {
    try {
      $obj = $value | ConvertFrom-Json
      $value = ($obj | ConvertTo-Json -Compress)
    } catch {
      throw "GA4_KEY is not valid JSON."
    }
  }

  if ($value.Contains("`n") -or $value.Contains("`r")) {
    throw "Secret '$name' contains newline characters and cannot be safely written to .env as-is."
  }

  $lines.Add("$name=$value")
}

Set-Content -Path $envPath -Value $lines -Encoding UTF8
Write-Host "Wrote env values to: $envPath"

Write-Host "Verification (masked):"
foreach ($line in $lines) {
  $parts = $line -split "=", 2
  $k = $parts[0]
  $v = if ($parts.Length -gt 1) { $parts[1] } else { "" }
  Write-Host ("  {0}: length={1}" -f $k, $v.Length)
}

if ($DeployFunctions) {
  Push-Location (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "functions")
  try {
    npm run build
    firebase deploy --only functions --project $ProjectId
  } finally {
    Pop-Location
  }
}

if ($DeleteAfterMigration) {
  foreach ($name in $secretNames) {
    Write-Host "Deleting secret: $name"
    Invoke-Gcloud -Args @("secrets", "delete", $name, "--project=$ProjectId", "--quiet") -ErrorPrefix "Failed to delete secret '$name'" | Out-Null
  }
}

Write-Host "Migration complete."
