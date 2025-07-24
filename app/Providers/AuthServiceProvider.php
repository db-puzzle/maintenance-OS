<?php

namespace App\Providers;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Part;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
use App\Models\Production\ProductionExecution;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionRouting;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\QrTracking;
use App\Models\Production\Shipment;
use App\Models\Production\WorkCell;
use App\Models\WorkOrders\WorkOrder;
use App\Policies\AreaPolicy;
use App\Policies\AssetPolicy;
use App\Policies\PartPolicy;
use App\Policies\PlantPolicy;
use App\Policies\Production\BillOfMaterialPolicy;
use App\Policies\Production\ItemPolicy;
use App\Policies\Production\ProductionExecutionPolicy;
use App\Policies\Production\ProductionOrderPolicy;
use App\Policies\Production\ProductionRoutingPolicy;
use App\Policies\Production\ProductionSchedulePolicy;
use App\Policies\Production\QrTrackingPolicy;
use App\Policies\Production\ShipmentPolicy;
use App\Policies\Production\WorkCellPolicy;
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
        Part::class => PartPolicy::class,
        Plant::class => PlantPolicy::class,
        Sector::class => SectorPolicy::class,
        WorkOrder::class => WorkOrderPolicy::class,
        // Production Module
        Item::class => ItemPolicy::class,
        BillOfMaterial::class => BillOfMaterialPolicy::class,
        WorkCell::class => WorkCellPolicy::class,
        ProductionRouting::class => ProductionRoutingPolicy::class,
        ProductionOrder::class => ProductionOrderPolicy::class,
        ProductionSchedule::class => ProductionSchedulePolicy::class,
        ProductionExecution::class => ProductionExecutionPolicy::class,
        QrTracking::class => QrTrackingPolicy::class,
        Shipment::class => ShipmentPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
} 