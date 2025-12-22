$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $projectRoot "functions/.env"
$ga4Id = $null

if (Test-Path $envFile) {
	$lines = Get-Content $envFile | Where-Object { $_ -match '^GA4_PROPERTY_ID=' }
	if ($lines) {
		$line = ($lines | Select-Object -Last 1)
		$ga4Id = ($line -split '=', 2)[1]
	}
}

if (-not $ga4Id) {
	$ga4Id = Read-Host -Prompt "Enter your GA4_PROPERTY_ID (numeric property id)"
}

if (-not $ga4Id) {
	Write-Error "GA4_PROPERTY_ID is required." -ErrorAction Stop
}

$env:GA4_PROPERTY_ID = $ga4Id
Write-Host "Setting GA4_PROPERTY_ID in Firebase Secrets..."
Write-Output $env:GA4_PROPERTY_ID | firebase functions:secrets:set GA4_PROPERTY_ID

$serviceKeyPath = Join-Path $projectRoot "service-account.json"
Get-Content $serviceKeyPath | firebase functions:secrets:set GA4_KEY

$allowedOrigin = $null

if (Test-Path $envFile) {
	$lines = Get-Content $envFile | Where-Object { $_ -match '^ALLOWED_ORIGIN=' }
	if ($lines) {
		$line = ($lines | Select-Object -Last 1)
		$allowedOrigin = ($line -split '=', 2)[1]
	}
}

if (-not $allowedOrigin) {
	$allowedOrigin = Read-Host -Prompt "Enter ALLOWED_ORIGIN (comma-separated origins)"
}

if (-not $allowedOrigin) {
	Write-Error "ALLOWED_ORIGIN is required." -ErrorAction Stop
}

$env:ALLOWED_ORIGIN = $allowedOrigin
Write-Host "Setting ALLOWED_ORIGIN in Firebase Secrets..."
Write-Output $env:ALLOWED_ORIGIN | firebase functions:secrets:set ALLOWED_ORIGIN

Set-Location (Join-Path $projectRoot "functions")
# npm run build
firebase deploy --only functions:metricsViews