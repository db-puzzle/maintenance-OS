<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\Asset;
use App\Models\WorkOrders\WorkOrder;
use App\Observers\PlantObserver;
use App\Observers\AreaObserver;
use App\Observers\SectorObserver;
use App\Observers\AssetObserver;
use App\Observers\WorkOrderObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Model::preventLazyLoading(! $this->app->isProduction());
        
        // Register entity observers for dynamic permission management
        Plant::observe(PlantObserver::class);
        Area::observe(AreaObserver::class);
        Sector::observe(SectorObserver::class);
        Asset::observe(AssetObserver::class);
        
        // Register work order observer
        WorkOrder::observe(WorkOrderObserver::class);
    }
}
