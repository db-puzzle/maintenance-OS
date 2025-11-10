#!/bin/bash
# Production Database Update Script
# This script safely updates databases WITHOUT deleting data
# It runs migrations on both central and tenant databases

set -e  # Exit on error

# Configuration - UPDATE THESE FOR YOUR ENVIRONMENT
DB_USER="${DB_USER:-postgres}"
CENTRAL_DB="${CENTRAL_DB:-maintenance_os_central}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

echo "🚀 Starting production database update..."
echo ""

# Check if we're in production
if [ "$APP_ENV" != "production" ]; then
    echo "⚠️  Warning: APP_ENV is not 'production' (current: ${APP_ENV:-not set})"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create timestamp for backups
timestamp=$(date +%Y%m%d_%H%M%S)

echo ""
echo "💾 Step 1: Creating database backups..."
echo "----------------------------------------"

# Backup central database
echo "Backing up central database..."
echo "Running: pg_dump -U $DB_USER -d $CENTRAL_DB > ${BACKUP_DIR}/backup_central_${timestamp}.sql"
pg_dump -U "$DB_USER" -d "$CENTRAL_DB" > "${BACKUP_DIR}/backup_central_${timestamp}.sql"
echo "✅ Central database backed up to: ${BACKUP_DIR}/backup_central_${timestamp}.sql"

# Backup tenant databases
echo ""
echo "Backing up tenant databases..."
tenant_count=0
for db in $(psql -U "$DB_USER" -d postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%' AND datistemplate = false"); do
    db_trimmed=$(echo "$db" | xargs)  # Trim whitespace
    echo "Running: pg_dump -U $DB_USER -d $db_trimmed > ${BACKUP_DIR}/backup_${db_trimmed}_${timestamp}.sql"
    pg_dump -U "$DB_USER" -d "$db_trimmed" > "${BACKUP_DIR}/backup_${db_trimmed}_${timestamp}.sql"
    tenant_count=$((tenant_count + 1))
    echo "  ✅ Backed up: $db_trimmed"
done
echo "✅ Backed up $tenant_count tenant databases"

echo ""
echo "🔧 Step 2: Enabling maintenance mode..."
echo "----------------------------------------"
echo "Running: php artisan down --retry=60"
php artisan down --retry=60
echo "✅ Application is now in maintenance mode"

echo ""
echo "🛑 Step 3: Restarting queue workers..."
echo "----------------------------------------"
echo "Running: php artisan queue:restart"
php artisan queue:restart
echo "✅ Queue workers restarted"

echo ""
echo "🗄️  Step 4: Running central database migrations..."
echo "----------------------------------------"
echo "Running: php artisan migrate --database=central --path=database/migrations/central --force"
php artisan migrate --database=central --path=database/migrations/central --force
echo "✅ Central migrations complete"

echo ""
echo "🏢 Step 5: Running tenant database migrations..."
echo "----------------------------------------"
echo "Running: php artisan tenants:migrate --force"
php artisan tenants:migrate --force
echo "✅ Tenant migrations complete"

echo ""
echo "🧹 Step 6: Clearing and rebuilding caches..."
echo "----------------------------------------"
echo "Running: php artisan optimize:clear"
php artisan optimize:clear
echo "Running: php artisan config:cache"
php artisan config:cache
echo "Running: php artisan route:cache"
php artisan route:cache
echo "Running: php artisan view:cache"
php artisan view:cache
echo "✅ Caches rebuilt"

echo ""
echo "✅ Step 7: Disabling maintenance mode..."
echo "----------------------------------------"
echo "Running: php artisan up"
php artisan up
echo "✅ Application is back online"

echo ""
echo "🎉 Production database update complete!"
echo ""
echo "📊 Recommended next steps:"
echo "   1. Monitor application logs: tail -f storage/logs/laravel.log"
echo "   2. Monitor queue workers: php artisan queue:monitor"
echo "   3. Check migration status: php artisan migrate:status --database=central --path=database/migrations/central"
echo "   4. Check tenant migrations: php artisan tenants:run migrate:status"
echo ""
echo "💾 Backups saved to: $BACKUP_DIR"
echo "📝 Backup timestamp: $timestamp"

