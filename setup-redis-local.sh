#!/bin/bash

# Redis Setup Script for Local Testing
# Maintenance OS - Multi-Tenancy Cache Isolation

echo "========================================="
echo "Redis Setup for Multi-Tenancy Testing"
echo "========================================="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install Homebrew first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✓ Homebrew found"
echo ""

# Check if Redis is already installed
if brew list redis &>/dev/null; then
    echo "✓ Redis is already installed"
else
    echo "📦 Installing Redis..."
    brew install redis
    
    if [ $? -eq 0 ]; then
        echo "✓ Redis installed successfully"
    else
        echo "❌ Failed to install Redis"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting Redis..."
brew services start redis

# Wait a moment for Redis to start
sleep 2

# Test Redis connection
echo ""
echo "🧪 Testing Redis connection..."
if redis-cli ping &>/dev/null; then
    echo "✓ Redis is running and responding to PING"
else
    echo "❌ Redis is not responding"
    echo "   Try: brew services restart redis"
    exit 1
fi

# Test cache tagging support
echo ""
echo "🧪 Testing cache tagging support..."
php artisan tinker --execute="
try {
    Cache::tags(['test'])->put('key', 'value', 60);
    \$result = Cache::tags(['test'])->get('key');
    if (\$result === 'value') {
        echo '✓ Cache tagging works!\n';
    } else {
        echo '❌ Cache tagging failed\n';
        exit(1);
    }
} catch (Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage() . '\n';
    exit(1);
}
"

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Cache tagging test failed. This might be because:"
    echo "   1. Redis is using array driver in config"
    echo "   2. phpredis extension not installed"
    echo ""
    echo "   To install phpredis:"
    echo "   pecl install redis"
    exit 1
fi

# Update .env.testing if it exists
echo ""
echo "📝 Updating .env.testing..."
if [ -f .env.testing ]; then
    # Backup existing .env.testing
    cp .env.testing .env.testing.backup
    
    # Update CACHE_STORE
    if grep -q "^CACHE_STORE=" .env.testing; then
        sed -i '' 's/^CACHE_STORE=.*/CACHE_STORE=redis/' .env.testing
        echo "   Updated CACHE_STORE=redis"
    else
        echo "CACHE_STORE=redis" >> .env.testing
        echo "   Added CACHE_STORE=redis"
    fi
    
    # Ensure Redis config exists
    if ! grep -q "^REDIS_HOST=" .env.testing; then
        echo "REDIS_HOST=127.0.0.1" >> .env.testing
        echo "REDIS_PORT=6379" >> .env.testing
        echo "REDIS_PASSWORD=null" >> .env.testing
        echo "   Added Redis configuration"
    fi
else
    echo "   .env.testing not found, skipping"
fi

echo ""
echo "========================================="
echo "✅ Redis Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Run cache isolation security tests:"
echo "   php artisan test tests/Feature/MultiTenancy/Security/CacheIsolationSecurityTest.php"
echo ""
echo "2. Run all multi-tenancy cache tests:"
echo "   php artisan test tests/Unit/MultiTenancy/Cache tests/Feature/MultiTenancy/Cache"
echo ""
echo "3. Run complete Phase 7 & 8 test suite:"
echo "   php artisan test tests/Feature/MultiTenancy/Storage tests/Unit/MultiTenancy/Cache tests/Feature/MultiTenancy/Cache tests/Performance/MultiTenancy"
echo ""
echo "4. To stop Redis later:"
echo "   brew services stop redis"
echo ""
echo "Redis Info:"
echo "  Host: 127.0.0.1"
echo "  Port: 6379"
echo "  Status: $(brew services list | grep redis | awk '{print $2}')"
echo ""

