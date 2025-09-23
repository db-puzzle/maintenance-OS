#!/bin/bash
# Test Laravel Scheduler

echo "Testing Laravel Scheduler..."
cd /Users/danilobibancos/Laravel/maintenance-OS

# Create a test expired chunk directory
mkdir -p storage/app/chunks/test-expired-chunk
touch storage/app/chunks/test-expired-chunk/test.txt
touch -t 202301010000 storage/app/chunks/test-expired-chunk/test.txt

echo "Created test expired chunk directory"
ls -la storage/app/chunks/test-expired-chunk/

# Run the cleanup
echo "Running cleanup..."
php artisan media:cleanup-chunked-uploads

# Check if it was deleted
echo "Checking if cleaned up..."
if [ -d "storage/app/chunks/test-expired-chunk" ]; then
    echo "ERROR: Directory still exists!"
else
    echo "SUCCESS: Directory was cleaned up!"
fi
