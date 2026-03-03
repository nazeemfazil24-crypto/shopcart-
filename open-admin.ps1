# Open admin.html in default browser
$adminPath = Join-Path $PSScriptRoot "admin.html"
Write-Host "Opening admin panel: $adminPath"
Start-Process $adminPath
