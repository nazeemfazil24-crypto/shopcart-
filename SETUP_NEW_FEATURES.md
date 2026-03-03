# ShopHub — New Features Setup Guide

This guide explains how to set up the new authentication and account management features added to ShopHub.

## New Features

1. **Email Verification** — Users receive a verification email when they register
2. **Google OAuth Login** — Users can sign in with their Google account
3. **Account Deletion with OTP** — Users can request account deletion with a 30-day verification period
4. **OTP Verification** — One-time passwords for account deletion verification

## Prerequisites

### Email Configuration (Gmail)

This application sends emails using Gmail SMTP. You need to set up an email account for sending verification and notification emails.

**Recommended Email Account:** `onlineshoppingandbillingsuppor@gmail.com` (as specified)

#### Steps to Configure Gmail SMTP:

1. **Create a Gmail Account** (if you don't have one)
   - Go to https://accounts.google.com/signup
   - Create your email account

2. **Enable 2-Step Verification** (Required for App Passwords)
   - Go to myaccount.google.com
   - Click "Security" in the left menu
   - Scroll to "2-Step Verification" and enable it

3. **Generate App Password**
   - In Google Account settings, go to **Security** tab
   - Scroll to **App passwords** (appears after enabling 2-Step Verification)
   - Select "Mail" and "Windows Computer" (or your OS)
   - Google will generate a 16-character password
   - Copy this password

4. **Set Environment Variables**
   - Open your terminal/PowerShell and set these variables:
   
   ```powershell
   $env:SMTP_HOST = "smtp.gmail.com"
   $env:SMTP_PORT = "587"
   $env:SMTP_USER = "onlineshoppingandbillingsuppor@gmail.com"
   $env:SMTP_PASS = "your-16-character-app-password"
   $env:FROM_EMAIL = "onlineshoppingandbillingsuppor@gmail.com"
   ```

   Or add to `run-server.ps1` for persistent configuration.

### Google OAuth Configuration

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create a new project
   - Give it a name like "ShopHub"

2. **Enable OAuth 2.0**
   - In the left sidebar, go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Set Authorized redirect URIs:
     - `http://localhost:5000`
     - `http://127.0.0.1:5000`
     - `http://yourdomain.com` (for production)
   - Save and copy the **Client ID** and **Client Secret**

3. **Set Environment Variables**
   ```powershell
   $env:GOOGLE_CLIENT_ID = "your-client-id-from-google.apps.googleusercontent.com"
   $env:GOOGLE_CLIENT_SECRET = "your-client-secret"
   ```

4. **Update Frontend with Client ID**
   - In `create_account.html`, find and replace:
     ```javascript
     client_id: 'YOUR_GOOGLE_CLIENT_ID'
     ```
     with your actual Google Client ID

   - Do the same in `login.html`

## Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

   New packages added:
   - `PyOTP` — For OTP generation
   - `qrcode` — For QR code generation
   - `google-auth-oauthlib` — For Google OAuth
   - `google-auth-httplib2` — Google authentication library
   - `google-api-python-client` — Google API client

2. **Update Database**
   The User model now has new fields:
   - `email_verified` — Whether email is verified
   - `email_verification_token` — Token for email verification
   - `email_verification_expires` — When verification token expires
   - `oauth_google_id` — Google OAuth ID (if linked)
   - `account_deletion_pending` — Whether deletion is scheduled
   - `account_deletion_date` — When account will be deleted
   - `account_deletion_otp` — OTP for deletion verification
   - `account_deletion_otp_expires` — When OTP expires

   If you have an existing database, delete `instance/shophub.db` and the database will be recreated:
   ```bash
   rm instance/shophub.db
   python db_init.py
   ```

## API Endpoints

### Email Verification

**Register User (with Email Verification)**
```
POST /api/register
```
Sends a verification email to the user. Response includes:
```json
{
  "success": true,
  "message": "Account created! Please check your email to verify your account.",
  "user": {...}
}
```

**Verify Email**
```
GET /api/verify-email?token=VERIFICATION_TOKEN
```
Verifies the user's email using the token from the email link.

**Resend Verification Email**
```
POST /api/resend-verification-email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Login

**Login (Email Must Be Verified)**
```
POST /api/login
```
Requirements:
- User must have verified their email
- Returns error if email is not verified

Response:
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {...}
}
```

### Google OAuth

**Google Sign-In/Sign-Up**
```
POST /api/auth/google
Content-Type: application/json

{
  "token": "google-jwt-token",
  "id": "google-user-id",
  "email": "user@gmail.com",
  "name": "User Name"
}
```

Response:
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {...}
}
```

Features:
- Automatically creates account if user doesn't exist
- Links Google OAuth to existing account if email matches
- Email is pre-verified for Google accounts

### Account Deletion

**Request Account Deletion (with 30-day period)**
```
POST /api/request-account-deletion
Authorization: Bearer jwt-token
```

Response:
```json
{
  "success": true,
  "message": "Account deletion initiated. You have 30 days to verify. Deletion date: 2026-03-30...",
  "deletion_date": "2026-03-30T..."
}
```

Sends OTP to user's email. User has 30 days to verify deletion.

**Verify Deletion OTP**
```
POST /api/verify-deletion-otp
Authorization: Bearer jwt-token
Content-Type: application/json

{
  "otp": "123456"
}
```

Confirms the deletion request. Account will be deleted after 30 days.

**Cancel Account Deletion**
```
POST /api/cancel-account-deletion
Authorization: Bearer jwt-token
```

Cancels deletion within the 30-day period. Sends confirmation email.

**Delete Account (After 30 days)**
```
POST /api/delete-account
Authorization: Bearer jwt-token
```

Permanently deletes the account. Can only be called after 30 days from deletion request.

## Email Templates

The application sends professional HTML emails for:

1. **Email Verification** — Welcome email with verification link
2. **Account Deletion Request** — Notifies user and includes OTP
3. **Account Deletion Confirmation** — Confirms cancellation
4. **Account Permanently Deleted** — Final notification

All emails are sent from the configured SMTP account.

## Testing

### Test Email Sending
1. Sign up with a test email address
2. Check your inbox for verification email
3. Click the verification link to verify
4. Login with your credentials

### Test Google OAuth
1. Click "Sign up with Google" on registration page
2. Select your Google account
3. You'll be automatically logged in
4. No email verification needed for Google accounts

### Test Account Deletion
1. Login to your account
2. Request account deletion from profile settings (if implemented)
3. Check email for OTP
4. Verify OTP to confirm deletion
5. After 30 days, account will be automatically deleted
6. Or cancel deletion within 30 days

## Environment Variables Summary

```bash
# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=onlineshoppingandbillingsuppor@gmail.com
SMTP_PASS=your-16-character-app-password
FROM_EMAIL=onlineshoppingandbillingsuppor@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Other (optional)
DEV_MODE=0  # Set to 1 for development
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
```

## Troubleshooting

### Error: "SMTP credentials not configured"
- Make sure `SMTP_USER` and `SMTP_PASS` environment variables are set
- Verify Gmail app password is correct
- Check that 2-Step Verification is enabled on Google account

### Error: "Invalid verification token"
- Token may have expired (24-hour validity)
- User can request to resend verification email

### Error: "Google sign-in failed"
- Make sure `GOOGLE_CLIENT_ID` is updated in HTML files
- Check that Google Cloud project has OAuth 2.0 enabled
- Verify redirect URIs are configured correctly

### Account Deletion Not Working
- Check that OTP was verified
- Ensure 30 days have passed since deletion request
- Verify user is logged in (has valid JWT token)

## Security Notes

1. **Email Verification Tokens** — Expire after 24 hours
2. **OTP Codes** — 6-digit codes, expire after 10 minutes
3. **Account Deletion Period** — 30 days to prevent accidental deletion
4. **Google OAuth** — Email is automatically verified
5. **Password Hashing** — All passwords are bcrypt hashed

## Next Steps

1. Configure Gmail with the app password
2. Set up Google OAuth in Google Cloud Console
3. Update environment variables in `run-server.ps1`
4. Update Client ID in `create_account.html` and `login.html`
5. Delete old database: `rm instance/shophub.db`
6. Start the server: `.\run-server.ps1`
7. Test registration, email verification, and Google OAuth

## Support

For issues or questions:
- Check the troubleshooting section above
- Verify all environment variables are set correctly
- Check email inbox and spam folder for verification emails
- Review server logs for detailed error messages

---

**Last Updated:** February 2026
