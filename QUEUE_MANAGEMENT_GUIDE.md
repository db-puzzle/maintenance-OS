# Queue Management Guide

## Overview
This Laravel application uses database queue driver to process background jobs asynchronously, preventing the application from blocking during heavy operations like image processing.

## Quick Status Check

Run the queue status script:
```bash
./queue-status.sh
```

## Verifying Queue Worker is Running

### 1. Check Active Workers
```bash
ps aux | grep "artisan queue" | grep -v grep
```

You should see a process like:
```
php artisan queue:listen --tries=1
```

### 2. Monitor Queue in Real-Time
Open a new terminal and run:
```bash
php artisan queue:listen --tries=3 --timeout=300
```

This will show jobs being processed in real-time.

### 3. Check Queue Statistics
```bash
# Pending jobs
php artisan tinker --execute="echo 'Pending: ' . DB::table('jobs')->count();"

# Failed jobs  
php artisan tinker --execute="echo 'Failed: ' . DB::table('failed_jobs')->count();"
```

## Starting Queue Worker

### For Development (Already Running)
The development environment starts a queue worker automatically via npm scripts. You can see it in the process list.

### For Production
Use Supervisor or systemd to ensure the queue worker stays running:

```bash
# Basic queue worker
php artisan queue:work --tries=3 --timeout=300

# With specific queue
php artisan queue:work --queue=high,default --tries=3 --timeout=300

# Process single job and exit
php artisan queue:work --once
```

### Supervisor Configuration Example
Create `/etc/supervisor/conf.d/laravel-worker.conf`:
```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/worker.log
stopwaitsecs=3600
```

## Troubleshooting

### Queue Worker Not Processing Jobs

1. **Check if worker is running:**
   ```bash
   ps aux | grep "queue:work\|queue:listen"
   ```

2. **Check for errors in failed jobs:**
   ```bash
   php artisan queue:failed
   ```

3. **Check Laravel logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

4. **Restart queue worker:**
   ```bash
   php artisan queue:restart
   ```

### Clearing Stuck Jobs

If you have many old/stuck jobs:
```bash
# Clear all pending jobs
php artisan queue:clear

# Clear specific queue
php artisan queue:clear --queue=high

# Retry all failed jobs
php artisan queue:retry all

# Delete all failed jobs
php artisan queue:flush
```

### Testing Queue Processing

1. Create a test job:
   ```bash
   php artisan make:job TestJob
   ```

2. Dispatch it:
   ```bash
   php artisan tinker
   >>> dispatch(new \App\Jobs\TestJob());
   ```

3. Watch the queue worker terminal to see it process.

## Image Import Specific

For the image import feature, jobs are dispatched when:
1. All chunks for a file are uploaded (`AssembleChunkedUpload`)
2. Import session needs processing (`ProcessImageImportSession`)

Monitor these specific jobs:
```bash
# Check for chunked upload assembly jobs
php artisan tinker --execute="
    DB::table('jobs')
        ->where('payload', 'like', '%AssembleChunkedUpload%')
        ->count();
"
```

## Best Practices

1. **Set appropriate timeouts** for long-running jobs (image processing)
2. **Use job retries** with exponential backoff
3. **Monitor failed jobs** regularly
4. **Set queue priorities** for critical vs. background tasks
5. **Use horizon** for Redis-based queues (production)

## Environment Variables

Ensure these are set in `.env`:
```
QUEUE_CONNECTION=database
QUEUE_FAILED_DRIVER=database
```

For production with Redis:
```
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```
