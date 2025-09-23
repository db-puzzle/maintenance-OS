#!/bin/bash

echo "=== Queue Worker Status ==="
echo ""

# Check if queue worker is running
WORKER_COUNT=$(ps aux | grep -E "(artisan queue:work|queue:listen)" | grep -v grep | wc -l)
if [ $WORKER_COUNT -gt 0 ]; then
    echo "✅ Queue worker is RUNNING ($WORKER_COUNT processes)"
    ps aux | grep -E "(artisan queue:work|queue:listen)" | grep -v grep
else
    echo "❌ No queue worker found running"
fi

echo ""
echo "=== Queue Statistics ==="

# Get job counts
cd /Users/danilobibancos/Laravel/maintenance-OS
PENDING=$(php artisan tinker --execute="echo DB::table('jobs')->count();" 2>/dev/null | grep -v ">>>" | tail -1)
FAILED=$(php artisan tinker --execute="echo DB::table('failed_jobs')->count();" 2>/dev/null | grep -v ">>>" | tail -1)

echo "📊 Pending jobs: $PENDING"
echo "❌ Failed jobs: $FAILED"

echo ""
echo "=== Recent Jobs (Last 5) ==="
php artisan tinker --execute="
    DB::table('jobs')
        ->orderBy('created_at', 'desc')
        ->limit(5)
        ->get(['id', 'queue', 'attempts', 'created_at'])
        ->each(function(\$job) {
            \$created = date('Y-m-d H:i:s', \$job->created_at);
            echo \"ID: {\$job->id} | Queue: {\$job->queue} | Attempts: {\$job->attempts} | Created: {\$created}\n\";
        });
" 2>/dev/null | grep -v ">>>"

echo ""
echo "=== Commands ==="
echo "Start queue worker:    php artisan queue:work --tries=3"
echo "Clear all jobs:        php artisan queue:clear"
echo "Retry failed jobs:     php artisan queue:retry all"
echo "Monitor in real-time:  php artisan queue:listen --tries=3"
