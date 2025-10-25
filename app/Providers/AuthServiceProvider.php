<?php

namespace App\Providers;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\AssetHierarchy\System;
use App\Models\Certification;
use App\Models\Media;
use App\Models\Part;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingOrderDependency;
use App\Models\Production\ManufacturingOrderFlow;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\QrTracking;
use App\Models\Production\ScheduleVersion;
use App\Models\Production\Shipment;
use App\Models\Production\WorkCell;
use App\Models\Role;
use App\Models\Skill;
use App\Models\WorkOrders\WorkOrder;
use App\Policies\AreaPolicy;
use App\Policies\AssetPolicy;
use App\Policies\CertificationPolicy;
use App\Policies\MediaPolicy;
use App\Policies\PartPolicy;
use App\Policies\PlantPolicy;
use App\Policies\Production\BillOfMaterialPolicy;
use App\Policies\Production\ItemCategoryPolicy;
use App\Policies\Production\ItemPolicy;
use App\Policies\Production\ManufacturingOrderDependencyPolicy;
use App\Policies\Production\ManufacturingOrderFlowPolicy;
use App\Policies\Production\ManufacturingOrderPolicy;
use App\Policies\Production\ManufacturingRoutePolicy;
use App\Policies\Production\ManufacturingStepExecutionPolicy;
use App\Policies\Production\ManufacturingStepPolicy;
use App\Policies\Production\ProductionSchedulePolicy;
use App\Policies\Production\QrTrackingPolicy;
use App\Policies\Production\ScheduleVersionPolicy;
use App\Policies\Production\ShipmentPolicy;
use App\Policies\Production\WorkCellPolicy;
use App\Policies\RolePolicy;
use App\Policies\SectorPolicy;
use App\Policies\SkillPolicy;
use App\Policies\SystemPolicy;
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
        // Media
        Media::class => MediaPolicy::class,

        // User Management
        Role::class => RolePolicy::class,

        // Asset Hierarchy
        Plant::class => PlantPolicy::class,
        Area::class => AreaPolicy::class,
        Sector::class => SectorPolicy::class,
        System::class => SystemPolicy::class,
        Asset::class => AssetPolicy::class,

        // Work Orders
        WorkOrder::class => WorkOrderPolicy::class,

        // Parts
        Part::class => PartPolicy::class,

        // Skills & Certifications
        Skill::class => SkillPolicy::class,
        Certification::class => CertificationPolicy::class,

        // Production Module
        ManufacturingOrder::class => ManufacturingOrderPolicy::class,
        ManufacturingOrderDependency::class => ManufacturingOrderDependencyPolicy::class,
        ManufacturingOrderFlow::class => ManufacturingOrderFlowPolicy::class,
        ManufacturingRoute::class => ManufacturingRoutePolicy::class,
        ManufacturingStep::class => ManufacturingStepPolicy::class,
        ManufacturingStepExecution::class => ManufacturingStepExecutionPolicy::class,
        Item::class => ItemPolicy::class,
        ItemCategory::class => ItemCategoryPolicy::class,
        BillOfMaterial::class => BillOfMaterialPolicy::class,
        WorkCell::class => WorkCellPolicy::class,
        QrTracking::class => QrTrackingPolicy::class,
        Shipment::class => ShipmentPolicy::class,
        ScheduleVersion::class => ScheduleVersionPolicy::class,
        ProductionSchedule::class => ProductionSchedulePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void {}
}
