#!/bin/bash

echo "Starting Laravel development environment..."

# Start the queue worker in the background
echo "Starting queue worker..."
php artisan queue:work --tries=3 &
QUEUE_PID=$!

# Store the PID so we can stop it later
echo $QUEUE_PID > .queue.pid

echo "Queue worker started with PID: $QUEUE_PID"
echo ""
echo "To stop the queue worker later, run: kill \$(cat .queue.pid)"
echo ""
echo "Your Laravel app is ready! The queue worker is running in the background."
echo "Remember: You still need to run 'php artisan serve' or use Laravel Herd/Valet." 