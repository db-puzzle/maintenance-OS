# Laravel Cloud Queue Configuration

## Overview
This document outlines how to configure queue workers in Laravel Cloud for the maintenance OS application, specifically for handling the `scheduling` queue alongside the `default` queue.

## Queue Configuration

### Required Queues
1. **default** - For general background jobs
2. **scheduling** - For production scheduling jobs (ASAPScheduler, etc.)

### Laravel Cloud Setup

#### Option 1: Single Worker with Multiple Queues
1. In Laravel Cloud dashboard, navigate to your production environment
2. Add a new background process
3. Select "Queue Worker"
4. Configure with command: `php artisan queue:work --queue=scheduling,default`
5. Set appropriate number of processes (start with 1-2)

#### Option 2: Dedicated Workers (Recommended)
Create two separate queue workers for better isolation and monitoring:

**Scheduling Queue Worker:**
- Process Type: Queue Worker
- Command: `php artisan queue:work --queue=scheduling`
- Processes: 1-2 (scheduling jobs are typically less frequent)
- Memory: 256MB (adjust based on your scheduling complexity)

**Default Queue Worker:**
- Process Type: Queue Worker  
- Command: `php artisan queue:work --queue=default`
- Processes: 2-4 (adjust based on load)
- Memory: 128MB (standard jobs)

### Monitoring
- Laravel Cloud automatically monitors queue size and worker health
- Set up notifications for queue failures
- Monitor the Laravel Cloud logs for queue processing issues

### Important Notes
1. The `ScheduleProductionJob` is configured to use the `scheduling` queue (see `app/Jobs/Production/ScheduleProductionJob.php`)
2. Queue workers will automatically restart if they fail
3. Laravel Cloud handles zero-downtime deployments for queue workers
4. No server management is required - Laravel Cloud manages the infrastructure

### Deployment Checklist
- [ ] Configure queue workers in Laravel Cloud dashboard
- [ ] Verify both `scheduling` and `default` queues are being processed
- [ ] Test scheduling job execution in production
- [ ] Set up monitoring alerts for queue failures
- [ ] Document any custom queue configurations

### References
- [Laravel Cloud Documentation](https://cloud.laravel.com/docs/intro)
- [Laravel Cloud Queues Documentation](https://cloud.laravel.com/docs/queues)
