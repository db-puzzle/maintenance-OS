#!/bin/bash
# Development Database Reset Script
# This script will COMPLETELY RESET all databases (central and tenants)
# WARNING: This will DELETE ALL DATA!

set -e  # Exit on error

echo "⚠️  WARNING: This will DELETE ALL DATA in your databases!"
echo "This script is for DEVELOPMENT ONLY"
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🔄 Starting complete database reset..."
echo ""

# Clear caches
echo "📦 Step 1: Clearing caches..."
echo "----------------------------------------"
echo "Running: php artisan optimize:clear"
php artisan optimize:clear

# Stop queue workers
echo ""
echo "🛑 Step 2: Restarting queue workers..."
echo "----------------------------------------"
echo "Running: php artisan queue:restart"
php artisan queue:restart

echo ""
echo "🗄️  Step 3: Resetting central database..."
echo "----------------------------------------"
echo "Running: php artisan migrate:fresh --database=central --path=database/migrations/central"
php artisan migrate:fresh --database=central --path=database/migrations/central

echo ""
echo "🌱 Step 4: Seeding central database..."
echo "----------------------------------------"
echo "Running: php artisan db:seed --class=CentralDatabaseSeeder --database=central"
php artisan db:seed --class=CentralDatabaseSeeder --database=central

echo ""
echo "🧹 Step 5: Cleaning up all tenant databases..."
echo "----------------------------------------"
echo "Running: php artisan test:clean-db --no-interaction"
php artisan test:clean-db --no-interaction

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Create a test tenant via the registration page"
echo "   2. Or create one via Tinker (see DATABASE_MIGRATION_GUIDE.md)"
echo ""
echo "🔗 Admin portal: http://admin.localhost:8000"
echo "📚 Documentation: docs/MultiTenancy/DATABASE_MIGRATION_GUIDE.md"

