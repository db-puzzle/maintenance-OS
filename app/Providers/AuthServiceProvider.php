<?php

namespace App\Providers;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\WorkOrders\WorkOrder;
use App\Policies\AreaPolicy;
use App\Policies\AssetPolicy;
use App\Policies\PlantPolicy;
use App\Policies\SectorPolicy;
use App\Policies\WorkOrderPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Area::class => AreaPolicy::class,
        Asset::class => AssetPolicy::class,
        Plant::class => PlantPolicy::class,
        Sector::class => SectorPolicy::class,
        WorkOrder::class => WorkOrderPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
} 