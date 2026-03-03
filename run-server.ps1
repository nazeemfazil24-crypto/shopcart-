<#
Run this script to set SMTP env vars and launch the Flask server.
It will prompt for SMTP credentials (do NOT commit these to source control).
Requires Python and the packages in `requirements.txt` installed.
#>

<#
Simpler runner: prompts for needed values and avoids param casting issues.
Usage: Open PowerShell as normal, cd to project folder and run: .\run-server.ps1
If execution is blocked, run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python is not found in PATH. Please install Python 3 and try again." -ForegroundColor Red
    exit 1
}

$SMTPHost = Read-Host 'SMTP_HOST (press Enter for smtp.gmail.com)'
if (-not $SMTPHost) { $SMTPHost = 'smtp.gmail.com' }

$SMTPPort = Read-Host 'SMTP_PORT (press Enter for 587)'
if (-not $SMTPPort) { $SMTPPort = '587' }

$smtpUser = Read-Host 'SMTP_USER (your email address)'
if (-not $smtpUser) { Write-Host 'SMTP_USER is required' -ForegroundColor Red; exit 1 }

$smtpPass = Read-Host 'SMTP_PASS (your email password or app password)'
if (-not $smtpPass) { Write-Host 'SMTP_PASS is required' -ForegroundColor Red; exit 1 }

$fromEmail = Read-Host 'FROM_EMAIL (press Enter to use SMTP_USER)'
if (-not $fromEmail) { $fromEmail = $smtpUser }

Write-Host "Setting environment variables..."
$env:SMTP_HOST = $SMTPHost
$env:SMTP_PORT = $SMTPPort
$env:SMTP_USER = $smtpUser
$env:SMTP_PASS = $smtpPass
$env:FROM_EMAIL = $fromEmail

Write-Host "Installing dependencies (if needed)..."
python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host "Starting Flask server on http://127.0.0.1:5000 ..."
python app.py
