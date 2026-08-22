$ErrorActionPreference = "Stop"

if (-not $env:RESEND_API_KEY) {
    throw "RESEND_API_KEY is not set. Load your local .env first."
}

if (-not $env:RESEND_FROM_EMAIL) {
    throw "RESEND_FROM_EMAIL is not set. Load your local .env first."
}

if (-not $env:LUUKU_TEST_CONTACT_EMAIL) {
    throw "LUUKU_TEST_CONTACT_EMAIL is not set. Set it to your own controlled test inbox."
}

if (-not $env:LUUKU_TEST_CONTACT_COMPANY) {
    throw "LUUKU_TEST_CONTACT_COMPANY is not set."
}

# Defense-in-depth: this is the only live mode enabled by this helper.
# The Resend adapter independently restricts live delivery to LUUKU_TEST_CONTACT_EMAIL.
$env:EMAIL_MODE = "live"
$env:LUUKU_LIVE_EMAIL_CONFIRMATION = "SEND_TO_CONTROLLED_TEST_CONTACT"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   LUUKU CONTROLLED LIVE EMAIL TEST" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Recipient : $env:LUUKU_TEST_CONTACT_EMAIL"
Write-Host "Company   : $env:LUUKU_TEST_CONTACT_COMPANY"
Write-Host "Mode      : live (controlled recipient only)"
Write-Host ""
Write-Host "Real network email is enabled only for the configured controlled test recipient." -ForegroundColor Yellow
Write-Host ""

npm run typecheck:backend
npm run dev:discord:lex:operate
