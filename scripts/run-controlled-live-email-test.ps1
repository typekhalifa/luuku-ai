$ErrorActionPreference = "Stop"

$envFile = Join-Path (Get-Location) ".env"

if (-not (Test-Path $envFile)) {
    throw ".env file not found at $envFile"
}

# The Node application already loads .env, but this helper runs before Node starts.
# Load only the two Resend values needed by this controlled test.
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*RESEND_API_KEY\s*=\s*(.*)\s*$') {
        $env:RESEND_API_KEY = $matches[1].Trim().Trim('"').Trim("'")
    }

    if ($line -match '^\s*RESEND_FROM_EMAIL\s*=\s*(.*)\s*$') {
        $env:RESEND_FROM_EMAIL = $matches[1].Trim().Trim('"').Trim("'")
    }
}

if (-not $env:RESEND_API_KEY) {
    throw "RESEND_API_KEY was not found in .env."
}

if (-not $env:RESEND_FROM_EMAIL) {
    throw "RESEND_FROM_EMAIL was not found in .env."
}

if (-not $env:LUUKU_TEST_CONTACT_EMAIL) {
    throw "LUUKU_TEST_CONTACT_EMAIL is not set. Set it to your own controlled test inbox."
}

if (-not $env:LUUKU_TEST_CONTACT_COMPANY) {
    throw "LUUKU_TEST_CONTACT_COMPANY is not set."
}

# Defense-in-depth: this helper enables live mode only for the controlled test.
# The Resend adapter independently restricts live delivery to LUUKU_TEST_CONTACT_EMAIL.
$env:EMAIL_MODE = "live"
$env:LUUKU_LIVE_EMAIL_CONFIRMATION = "SEND_TO_CONTROLLED_TEST_CONTACT"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   LUUKU CONTROLLED LIVE EMAIL TEST" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Recipient : $env:LUUKU_TEST_CONTACT_EMAIL"
Write-Host "Company   : $env:LUUKU_TEST_CONTACT_COMPANY"
Write-Host "From      : $env:RESEND_FROM_EMAIL"
Write-Host "Mode      : live (controlled recipient only)"
Write-Host ""
Write-Host "Real network email is enabled only for the configured controlled test recipient." -ForegroundColor Yellow
Write-Host ""

npm run typecheck:backend
npm run dev:discord:lex:operate
