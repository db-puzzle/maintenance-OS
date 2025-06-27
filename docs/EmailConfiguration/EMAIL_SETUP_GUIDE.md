# Email Configuration Guide

This guide will help you set up email functionality in your Laravel maintenance management system.

## Overview

Your Laravel project already has email functionality implemented through notifications (like user invitations). However, you need to configure a mail driver to actually send emails instead of just logging them.

## Step 1: Choose Your Email Service

### Option A: SMTP (Gmail, Outlook, or Custom SMTP)

Add these lines to your `.env` file:

```env
# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD="your-app-password"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

**For Gmail:**
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the generated app password as `MAIL_PASSWORD`

**For Outlook/Office365:**
```env
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
```

### Option B: Mailgun

1. Sign up at https://www.mailgun.com
2. Add your domain and verify it
3. Configure your `.env`:

```env
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=your-domain.com
MAILGUN_SECRET=your-mailgun-api-key
MAILGUN_ENDPOINT=api.mailgun.net
MAIL_FROM_ADDRESS="noreply@your-domain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Option C: Amazon SES

```env
MAIL_MAILER=ses
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Option D: Postmark

```env
MAIL_MAILER=postmark
POSTMARK_TOKEN=your-postmark-server-token
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Option E: Development/Testing (Mailtrap)

For development, use Mailtrap (https://mailtrap.io):

```env
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

## Step 2: Clear Configuration Cache

After updating your `.env` file, clear the configuration cache:

```bash
php artisan config:clear
php artisan cache:clear
```

## Step 3: Test Email Sending

### Using Tinker

```bash
php artisan tinker
```

Then in tinker:

```php
Mail::raw('Test email', function ($message) {
    $message->to('test@example.com')
            ->subject('Test Email');
});
```

### Using the Existing Invitation System

The project already has a command-line tool to invite users:

```bash
php artisan user:invite test@example.com --role=admin --message="Welcome to the system!"
```

## Step 4: Queue Configuration (Optional but Recommended)

For better performance, emails are already configured to use queues. To process queued emails:

1. Make sure your `.env` has:
```env
QUEUE_CONNECTION=database
```

2. Run migrations if not already done:
```bash
php artisan migrate
```

3. Start the queue worker:
```bash
php artisan queue:work
```

Or for development:
```bash
php artisan queue:listen
```

## Existing Email Features

Your project already supports sending emails for:

1. **User Invitations** - When inviting new users to the system
2. **Password Reset** - Password recovery emails
3. **Email Verification** - Verify user email addresses
4. **PDF Export Notifications** - Notify when export is complete (if configured)

## Troubleshooting

### Common Issues

1. **"Connection could not be established with host"**
   - Check your firewall/antivirus settings
   - Verify SMTP credentials
   - Try using port 465 with SSL encryption instead

2. **"Authentication failed"**
   - For Gmail: Make sure you're using an App Password, not your regular password
   - Check username format (full email address)

3. **Emails going to spam**
   - Set proper FROM address matching your domain
   - Configure SPF/DKIM records for your domain
   - Use a reputable email service

### Debug Mode

To debug email issues, temporarily set in `.env`:

```env
MAIL_LOG_CHANNEL=single
```

Then check `storage/logs/laravel.log` for email details.

## Security Best Practices

1. **Never commit `.env` file** to version control
2. Use **App Passwords** instead of regular passwords
3. Use **encrypted connections** (TLS/SSL)
4. Set up **SPF, DKIM, and DMARC** records for your domain
5. Use **queue workers** to avoid blocking requests
6. **Rate limit** email sending to avoid being flagged as spam

## Next Steps

After configuring email:

1. Test the invitation system
2. Test password reset functionality
3. Set up email templates customization if needed
4. Configure queue workers for production
5. Monitor email delivery rates and bounces 