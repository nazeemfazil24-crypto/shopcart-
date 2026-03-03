# Local OTP email server for ShopHub

This project includes a small Flask server (`app.py`) that can send OTP emails via SMTP and serve the site over HTTP. Use this when testing OTP email delivery locally instead of relying on `file://` or third-party client-only email services.

Quick start (Windows PowerShell):

1. Open PowerShell and navigate to the project folder:

```powershell
cd "C:\Users\ELCOT\Documents\new hotel"
```

2. Run the helper script which prompts for SMTP credentials and starts the server:

```powershell
.\run-server.ps1
```

3. When prompted, provide:
- `SMTP_USER`: your SMTP username (email address)
- `SMTP_PASS`: your SMTP password or app password (recommended for Gmail)
- `FROM_EMAIL`: optional (leave blank to use SMTP_USER)

4. Open the site in your browser (use HTTP, not file://):

```
http://127.0.0.1:5000/
```

Testing `/send_otp` directly (optional):

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5000/send_otp -Method Post -ContentType 'application/json' -Body (@{ email='you@example.com'; otp='123456' } | ConvertTo-Json)
```

Troubleshooting
- If the browser shows "127.0.0.1 refused to connect": make sure the Flask server is running in PowerShell and there are no errors in the terminal.
- If the server returns SMTP auth errors: verify SMTP credentials and use an App Password for Gmail with 2FA.
- If email delivery fails but server returns success: check recipient spam folder, or verify SMTP host/port.

Security note
- Do NOT commit real SMTP credentials into source control. The `run-server.ps1` helper prompts you at runtime so secrets are not stored in files.
