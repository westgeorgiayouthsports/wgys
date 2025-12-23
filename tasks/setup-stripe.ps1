# Setup Stripe Secret Key in Firebase Functions Secrets
# gcloud run services update createsetupintent --region=us-central1 --project={project} --remove-env-vars=STRIPE_SECRET_KEY
# Assumes you have Firebase CLI installed and authenticated
# Test adding a payment method again with a Stripe test card:
# Card: 4242 4242 4242 4242
# Expiry: any future date
# CVC: any 3 digits
# ZIP: any 5 digits
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $projectRoot "functions/.env"
$secret = $null

if (Test-Path $envFile) {
	$lines = Get-Content $envFile | Where-Object { $_ -match '^STRIPE_SECRET_KEY=' }
	if ($lines) {
		$line = ($lines | Select-Object -Last 1)
		$secret = ($line -split '=', 2)[1]
	}
}

if (-not $secret) {
	$secret = Read-Host -Prompt "Enter your Stripe Secret Key"
}

if (-not $secret) {
	Write-Error "STRIPE_SECRET_KEY is required." -ErrorAction Stop
}

# Set for current session (useful for local emulators/commands)
$env:STRIPE_SECRET_KEY = $secret

Write-Host "Setting STRIPE_SECRET_KEY in Firebase Secrets..."
# Firebase CLI reads the secret from stdin
$secret | firebase functions:secrets:set STRIPE_SECRET_KEY

Write-Host "Done. Deploy functions to pick up the new secret: firebase deploy --only functions"

firebase deploy --only functions
firebase functions:list