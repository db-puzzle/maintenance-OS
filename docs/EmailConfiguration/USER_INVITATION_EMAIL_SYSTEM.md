# User Invitation Email System Guide

## Overview

The Laravel application uses a queue-based system to send user invitation emails. This ensures that the application doesn't block while sending emails and provides reliability through retry mechanisms.

## System Components

### 1. Email Queue System

The system consists of several key components:

- **Notification Class**: `App\Notifications\UserInvitation` - Implements `ShouldQueue` interface
- **Mailable Class**: `App\Mail\UserInvitationMail` - Also implements `ShouldQueue`
- **Queue Driver**: Configured via `QUEUE_CONNECTION` in `.env` (defaults to `database`)
- **Mail Driver**: Configured via `MAIL_MAILER` in `.env` (defaults to `log`)

### 2. How It Works

When a user invitation is created:

1. `UserInvitationController@store` creates a new `UserInvitation` model
2. A notification is sent using Laravel's notification system:
   ```php
   Notification::route('mail', $validated['email'])
       ->notify(new UserInvitationNotification($invitation));
   ```
3. Because the notification implements `ShouldQueue`, it's automatically queued
4. A queue worker picks up the job and processes it
5. The email is sent through the configured mail driver

### 3. Queue Configuration

The queue system is configured in `config/queue.php`:
- Default connection: `database` (stores jobs in the database)
- Jobs table: `jobs`
- Failed jobs table: `failed_jobs`
- Retry after: 90 seconds

## Checking Queue Status

### 1. Use the Built-in Script

```bash
./queue-status.sh
```

This script shows:
- Queue worker status
- Pending job count
- Failed job count
- Recent jobs

### 2. Manual Checks

```bash
# Check if queue worker is running
ps aux | grep "artisan queue" | grep -v grep

# Check pending jobs
php artisan tinker --execute="echo DB::table('jobs')->count();"

# Check failed jobs
php artisan tinker --execute="echo DB::table('failed_jobs')->count();"

# List failed jobs
php artisan queue:failed
```

## Starting the Queue Worker

### Development Mode

For development, you need to manually start a queue worker:

```bash
# Basic worker (recommended for development)
php artisan queue:work --tries=3

# Worker with more visibility
php artisan queue:listen --tries=3

# Process a single job and exit (for testing)
php artisan queue:work --once
```

**Note**: In development, the queue worker needs to be running in a separate terminal window for emails to be sent.

### Production Mode

For production, use a process supervisor to ensure the queue worker is always running:

#### Option 1: Supervisor (Recommended)

Create `/etc/supervisor/conf.d/laravel-worker.conf`:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/maintenance-OS/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/maintenance-OS/storage/logs/worker.log
stopwaitsecs=3600
```

Then reload supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
```

#### Option 2: Systemd

Create `/etc/systemd/system/laravel-queue.service`:

```ini
[Unit]
Description=Laravel Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /path/to/maintenance-OS/artisan queue:work --sleep=3 --tries=3 --max-time=3600
StandardOutput=append:/path/to/maintenance-OS/storage/logs/worker.log
StandardError=append:/path/to/maintenance-OS/storage/logs/worker.log

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable laravel-queue
sudo systemctl start laravel-queue
sudo systemctl status laravel-queue
```

## Email Configuration

### Development

For development, emails are typically logged instead of sent. Check `.env`:

```env
MAIL_MAILER=log
```

Logged emails appear in `storage/logs/laravel.log`.

### Production

For production, configure a real mail driver:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

Or use a service like Resend:

```env
MAIL_MAILER=resend
RESEND_API_KEY=your-api-key
```

## Troubleshooting

### Emails Not Being Sent

1. **Check queue worker is running**:
   ```bash
   ps aux | grep queue:work
   ```

2. **Check for failed jobs**:
   ```bash
   php artisan queue:failed
   ```

3. **Check Laravel logs**:
   ```bash
   tail -f storage/logs/laravel.log
   ```

4. **Retry failed jobs**:
   ```bash
   php artisan queue:retry all
   ```

5. **Clear and restart**:
   ```bash
   php artisan queue:clear
   php artisan queue:restart
   ```

### Testing Email Sending

1. Create a test invitation via Artisan:
   ```bash
   php artisan user:invite test@example.com --role="Operator" --message="Welcome!"
   ```

2. Monitor the queue worker output to see the job being processed

3. Check the configured mail destination (log file, mailbox, etc.)

## Best Practices

1. **Always run a queue worker** in both development and production
2. **Monitor failed jobs** regularly
3. **Set appropriate retry limits** to avoid infinite loops
4. **Use queue priorities** if you have different types of jobs
5. **Configure dead letter queues** for jobs that fail repeatedly
6. **Set up monitoring alerts** for queue health in production

## Environment Variables Summary

```env
# Queue Configuration
QUEUE_CONNECTION=database  # Use 'redis' for production
QUEUE_FAILED_DRIVER=database

# Mail Configuration (Development)
MAIL_MAILER=log

# Mail Configuration (Production - SMTP)
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"
```

## Quick Commands Reference

```bash
# Start queue worker
php artisan queue:work

# Check status
./queue-status.sh

# Process single job
php artisan queue:work --once

# Monitor in real-time
php artisan queue:listen

# Retry failed jobs
php artisan queue:retry all

# Clear all jobs
php artisan queue:clear

# Restart workers
php artisan queue:restart
```
