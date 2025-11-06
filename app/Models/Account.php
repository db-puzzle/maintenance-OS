<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\CentralConnection;
use Stancl\Tenancy\Database\Concerns\GeneratesIds;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Concerns\HasInternalKeys;
use Stancl\Tenancy\Database\Concerns\InvalidatesResolverCache;
use Stancl\Tenancy\Database\Concerns\TenantRun;

/**
 * Account model - represents a tenant in the multi-tenant system.
 */
class Account extends Model implements \Stancl\Tenancy\Contracts\Tenant, TenantWithDatabase
{
    use CentralConnection;
    use GeneratesIds;
    use HasDatabase;
    use HasDomains;
    use HasFactory;
    use HasInternalKeys;
    use InvalidatesResolverCache;
    use TenantRun;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'accounts';

    /**
     * The connection name for the model.
     *
     * @var string|null
     */
    protected $connection = 'central';

    /**
     * The primary key for the model.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Indicates if the IDs are auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The event map for the model.
     *
     * @var array<string, class-string>
     */
    protected $dispatchesEvents = [
        'created' => \Stancl\Tenancy\Events\TenantCreated::class,
        'deleted' => \Stancl\Tenancy\Events\TenantDeleted::class,
        'updated' => \Stancl\Tenancy\Events\TenantUpdated::class,
    ];

    /**
     * Get the custom columns for the tenant model.
     *
     * @return array<int, string>
     */
    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'subdomain',
            'status',
            'trial_ends_at',
            'suspension_reason',
            'suspended_at',
            'metadata',
        ];
    }

    /**
     * Get tenant key name.
     */
    public function getTenantKeyName(): string
    {
        return 'id';
    }

    /**
     * Get tenant key value.
     *
     * @return mixed
     */
    public function getTenantKey()
    {
        return $this->getAttribute($this->getTenantKeyName());
    }

    /**
     * Get database name attribute.
     */
    public function getDatabaseNameAttribute(): string
    {
        // Laravel Tenancy expects this to be stored as an internal key
        return $this->getInternal('db_name') ?: 'tenant_' . $this->id;
    }

    /**
     * Set database name attribute.
     */
    public function setDatabaseNameAttribute(string $value): void
    {
        // Laravel Tenancy expects this to be stored as an internal key
        $this->setInternal('db_name', $value);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'subdomain',
        'status',
        'trial_ends_at',
        'suspension_reason',
        'suspended_at',
        'metadata',
    ];

    /**
     * The attributes that should be guarded.
     *
     * @var array<int, string>|bool
     */
    protected $guarded = [];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'metadata' => 'array',
        'trial_ends_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    /**
     * Get database statistics for the tenant.
     *
     * @return array<string, mixed>
     */
    public function getDatabaseStats(): array
    {
        // Use cache key with tenant ID for isolation
        // In production with Redis, cache tags provide automatic isolation via CacheTenancyBootstrapper
        $cacheKey = "tenant_{$this->id}_stats_database_stats";

        return Cache::remember($cacheKey, 60, function () {
            // Get formatted size and connections from central connection
            $stats = DB::connection('central')->selectOne('
                SELECT 
                    pg_size_pretty(pg_database_size(?)) as size,
                    (SELECT count(*) FROM pg_stat_activity WHERE datname = ?) as connections
            ', [$this->database_name, $this->database_name]);

            // Get tenant-specific stats with longer cache
            $tenantStats = $this->run(function () {
                $cacheKey = 'tenant_' . tenant()->id . '_counts_entity_counts';

                return Cache::remember($cacheKey, 300, function () {
                    // Get table count using PostgreSQL query
                    $tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");

                    return [
                        'table_count' => count($tables),
                        'user_count' => \App\Models\User::count(),
                        'work_order_count' => \App\Models\WorkOrders\WorkOrder::count(),
                        'asset_count' => \App\Models\AssetHierarchy\Asset::count(),
                    ];
                });
            });

            return [
                'database_size' => $stats->size ?? 'N/A',
                'connections' => $stats->connections ?? 0,
                'created_at' => $this->created_at->diffForHumans(),
                ...$tenantStats,
            ];
        });
    }

    /**
     * Clear cache when needed.
     */
    public function clearStatsCache(): void
    {
        // Clear cache entries for this tenant's stats using specific keys
        // In production with Redis, cache tags provide more elegant clearing via CacheTenancyBootstrapper
        Cache::forget("tenant_{$this->id}_stats_database_stats");
        Cache::forget("tenant_{$this->id}_counts_entity_counts");
    }

    /**
     * Get the subscription for the account.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne<\App\Models\Central\Subscription>
     */
    public function subscription(): HasOne
    {
        return $this->hasOne(\App\Models\Central\Subscription::class, 'account_id');
    }

    /**
     * Boot the model.
     */
    protected static function booted(): void
    {
        // Create domain automatically when account is created
        static::created(function (Account $account) {
            $account->domains()->create([
                'domain' => $account->subdomain . '.' . config('app.domain', 'maintenance-os.com'),
            ]);
        });
    }
}
