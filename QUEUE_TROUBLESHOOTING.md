# Queue Troubleshooting

## Issue: Jobs were not being processed automatically

### Root Causes Found:

1. **Queue Worker Not Running Properly**
   - `composer run dev` includes `php artisan queue:listen --tries=1` in the concurrently command
   - However, the actual PHP queue worker process was not found running
   - This suggests the queue worker might have crashed or failed to start

2. **Jobs Were Queued But Not Processed**
   - Multiple GenerateMediaMetadata jobs were pending in the database
   - Jobs only ran when manually executing `php artisan queue:work`
   - Some jobs failed (3 failed jobs found)

### Solutions:

1. **Immediate Fix**
   - Run `php artisan queue:work --stop-when-empty` to process pending jobs
   - This successfully processed most jobs and generated blurhashes

2. **Long-term Fix**
   - Monitor the queue worker in the `composer run dev` output
   - Consider running queue worker separately: `php artisan queue:work --daemon`
   - Or use supervisor to manage the queue worker process

3. **Failed Jobs**
   - Run `php artisan queue:retry all` to retry failed jobs
   - Check logs for specific failure reasons

### Verification:
- File hashes are correctly loaded from custom_properties
- Blurhashes are now generated after running the queue worker
- Both hash status indicators should now show correctly in the UI
