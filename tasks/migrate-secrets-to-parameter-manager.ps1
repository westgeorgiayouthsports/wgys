param(
  [string]$ProjectId = "wgys-ls",
  [string]$Location = "global",
  [switch]$DeleteFromSecretManager
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

gcloud config set project $ProjectId | Out-Null
Write-Host "Using project=$ProjectId location=$Location"

foreach ($name in $secretNames) {
  Write-Host "--- Migrating $name ---"

  # Step 1: Retrieve secret value from Secret Manager.
  $value = gcloud secrets versions access latest --secret=$name --project=$ProjectId
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Secret '$name' is empty or unavailable."
  }

  # Step 2: Ensure Parameter exists in Parameter Manager.
  try {
    gcloud parametermanager parameters create $name --location=$Location --project=$ProjectId | Out-Null
    Write-Host "Created parameter: $name"
  } catch {
    Write-Host "Parameter already exists (continuing): $name"
  }

  # Create a unique version id and write payload from temp file.
  $versionId = "v" + (Get-Date -Format "yyyyMMddHHmmss")
  $tmpFile = Join-Path $env:TEMP ("{0}-{1}.txt" -f $name, [guid]::NewGuid().ToString("N"))
  Set-Content -Path $tmpFile -Value $value -NoNewline -Encoding UTF8

  try {
    gcloud parametermanager parameters versions create $versionId --parameter=$name --location=$Location --project=$ProjectId --payload-data-from-file=$tmpFile | Out-Null
  } finally {
    Remove-Item -Path $tmpFile -Force -ErrorAction SilentlyContinue
  }

  # Step 3: Verify parameter and version exists.
  gcloud parametermanager parameters describe $name --location=$Location --project=$ProjectId --format="value(name)"
  gcloud parametermanager parameters versions describe $versionId --parameter=$name --location=$Location --project=$ProjectId --format="value(name)"

  # Step 4 note: App update is separate and may require code changes to load from Parameter Manager.
  Write-Host "App update note: use env-file or add runtime Parameter Manager fetch logic before cutover."
}

if ($DeleteFromSecretManager) {
  foreach ($name in $secretNames) {
    # Step 5: Delete old Secret Manager entries after successful cutover.
    gcloud secrets delete $name --project=$ProjectId --quiet
    Write-Host "Deleted Secret Manager secret: $name"
  }
}

Write-Host "Parameter migration complete."
