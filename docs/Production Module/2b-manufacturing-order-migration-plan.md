# Manufacturing Order System Migration Plan

## Executive Summary

This document outlines the migration plan to update the current production module migration files to support the new Manufacturing Order (MO) system requirements. The key changes involve restructuring how routes relate to items, implementing proper state management for manufacturing steps, adding quality control capabilities, and establishing parent-child MO relationships.

## Current State Analysis

### Existing Schema Issues
1. **Production Routes are tied to BOM Items instead of Manufacturing Orders** - This prevents the same item from having different routes in different MOs
2. **Missing proper state management** - No state tracking for manufacturing steps (Queued, In Progress, Completed, On Hold)
3. **No Quality Check implementation** - Quality checks need to be special manufacturing steps with pass/fail results
4. **No parent-child MO relationships** - When creating MO for BOM, child MOs aren't automatically created
5. **No Form/Task integration with manufacturing steps** - Cannot associate forms with production steps
6. **No rework capability** - No mechanism to handle failed quality checks with rework steps

## Migration Strategy

### Phase 1: Database Migration File Updates

#### 1.1 Update `2025_01_10_000009_create_production_orders_table.php`
```php
Schema::create('manufacturing_orders', function (Blueprint $table) {
    $table->id();
    $table->string('order_number', 100)->unique();
    $table->foreignId('parent_id')->nullable()->constrained('manufacturing_orders')->cascadeOnDelete();
    $table->foreignId('item_id')->nullable()->constrained('items');
    $table->foreignId('bill_of_material_id')->nullable()->constrained('bill_of_materials');
    $table->decimal('quantity', 10, 2);
    $table->decimal('quantity_completed', 10, 2)->default(0);
    $table->decimal('quantity_scrapped', 10, 2)->default(0);
    $table->string('unit_of_measure', 20)->default('EA');
    
    // Status tracking
    $table->enum('status', ['draft', 'planned', 'released', 'in_progress', 'completed', 'cancelled'])->default('draft');
    $table->integer('priority')->default(50); // 0-100
    
    // Child order tracking
    $table->integer('child_orders_count')->default(0);
    $table->integer('completed_child_orders_count')->default(0);
    $table->boolean('auto_complete_on_children')->default(true);
    
    // Dates
    $table->date('requested_date')->nullable();
    $table->timestamp('planned_start_date')->nullable();
    $table->timestamp('planned_end_date')->nullable();
    $table->timestamp('actual_start_date')->nullable();
    $table->timestamp('actual_end_date')->nullable();
    
    // Source
    $table->string('source_type', 50)->nullable(); // 'manual', 'sales_order', 'forecast'
    $table->string('source_reference', 100)->nullable();
    
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->timestamps();
    
    $table->index(['status', 'priority']);
    $table->index(['planned_start_date', 'planned_end_date']);
    $table->index('item_id');
    $table->index('bill_of_material_id');
    $table->index('parent_id');
});
```

#### 1.2 Create New Migration `2025_01_10_000015_create_manufacturing_routes_table.php`
```php
Schema::create('manufacturing_routes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('manufacturing_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
    $table->foreignId('item_id')->constrained('items');
    $table->foreignId('route_template_id')->nullable()->constrained('route_templates');
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->timestamps();
    
    $table->index('manufacturing_order_id');
    $table->index('item_id');
});
```

#### 1.3 Update `2025_01_10_000008_create_routing_steps_table.php` to `create_manufacturing_steps_table.php`
```php
Schema::create('manufacturing_steps', function (Blueprint $table) {
    $table->id();
    $table->foreignId('manufacturing_route_id')->constrained('manufacturing_routes')->cascadeOnDelete();
    $table->integer('step_number');
    $table->enum('step_type', ['standard', 'quality_check', 'rework'])->default('standard');
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
    
    // State management
    $table->enum('status', ['pending', 'queued', 'in_progress', 'on_hold', 'completed', 'skipped'])->default('pending');
    
    // Form association
    $table->foreignId('form_id')->nullable()->constrained('forms');
    $table->foreignId('form_version_id')->nullable()->constrained('form_versions');
    
    // Time tracking
    $table->integer('setup_time_minutes')->default(0);
    $table->integer('cycle_time_minutes');
    $table->timestamp('actual_start_time')->nullable();
    $table->timestamp('actual_end_time')->nullable();
    
    // Quality check specific fields
    $table->enum('quality_result', ['pending', 'passed', 'failed'])->nullable();
    $table->enum('failure_action', ['scrap', 'rework'])->nullable();
    $table->enum('quality_check_mode', ['every_part', 'entire_lot', 'sampling'])->default('every_part');
    $table->integer('sampling_size')->nullable();
    
    // Dependencies
    $table->foreignId('depends_on_step_id')->nullable()->constrained('manufacturing_steps');
    $table->enum('can_start_when_dependency', ['completed', 'in_progress'])->default('completed');
    
    $table->timestamps();
    
    $table->unique(['manufacturing_route_id', 'step_number']);
    $table->index('status');
    $table->index('step_type');
});
```

#### 1.4 Create New Migration `2025_01_10_000016_create_manufacturing_step_executions_table.php`
```php
Schema::create('manufacturing_step_executions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('manufacturing_step_id')->constrained('manufacturing_steps');
    $table->foreignId('manufacturing_order_id')->constrained('manufacturing_orders');
    
    // Part tracking for lot production
    $table->integer('part_number')->nullable(); // Which part in the lot (1, 2, 3...)
    $table->integer('total_parts')->nullable(); // Total parts in the lot
    
    // State and timing
    $table->enum('status', ['queued', 'in_progress', 'on_hold', 'completed']);
    $table->timestamp('started_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamp('on_hold_at')->nullable();
    $table->timestamp('resumed_at')->nullable();
    $table->integer('total_hold_duration')->default(0); // minutes
    
    // Execution details
    $table->foreignId('executed_by')->nullable()->constrained('users');
    $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
    
    // Quality check results
    $table->enum('quality_result', ['passed', 'failed'])->nullable();
    $table->text('quality_notes')->nullable();
    $table->enum('failure_action', ['scrap', 'rework'])->nullable();
    
    // Form execution reference
    $table->foreignId('form_execution_id')->nullable();
    
    $table->timestamps();
    
    $table->index(['manufacturing_step_id', 'manufacturing_order_id']);
    $table->index('status');
    $table->index(['manufacturing_order_id', 'part_number']);
});
```

#### 1.5 Update Form-related Migration Files
Add these columns to the existing form_executions and task_responses migration files:

**In form_executions migration:**
```php
$table->foreignId('manufacturing_step_execution_id')->nullable()
    ->constrained('manufacturing_step_executions');
```

**In task_responses migration:**
```php
$table->foreignId('manufacturing_step_execution_id')->nullable()
    ->constrained('manufacturing_step_executions');
```

#### 1.6 Create New Migration `2025_01_10_000014_create_route_templates_table.php` (For reusable routes)
```php
Schema::create('route_templates', function (Blueprint $table) {
    $table->id();
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->string('item_category', 100)->nullable();
    $table->boolean('is_active')->default(true);
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->timestamps();
    
    $table->index('name');
    $table->index('item_category');
});

Schema::create('route_template_steps', function (Blueprint $table) {
    $table->id();
    $table->foreignId('route_template_id')->constrained('route_templates')->cascadeOnDelete();
    $table->integer('step_number');
    $table->enum('step_type', ['standard', 'quality_check', 'rework'])->default('standard');
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->integer('setup_time_minutes')->default(0);
    $table->integer('cycle_time_minutes');
    $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
    $table->foreignId('form_id')->nullable()->constrained('forms');
    $table->enum('quality_check_mode', ['every_part', 'entire_lot', 'sampling'])->default('every_part');
    $table->integer('sampling_size')->nullable();
    $table->timestamps();
    
    $table->unique(['route_template_id', 'step_number']);
});
```

#### 1.7 Delete Old Migration Files
Remove these files as they're being replaced:
- `2025_01_10_000007_create_production_routings_table.php`
- `2025_01_10_000011_create_production_executions_table.php`

### Phase 2: Permissions and Roles Setup

#### 2.1 Create Production Permissions Seeder
```php
class ProductionPermissionSeeder extends Seeder
{
    public function run()
    {
        // Manufacturing Orders
        $orderPermissions = [
            'production.orders.viewAny' => 'View all manufacturing orders',
            'production.orders.view' => 'View specific manufacturing order',
            'production.orders.create' => 'Create manufacturing orders',
            'production.orders.update' => 'Update manufacturing orders',
            'production.orders.delete' => 'Delete manufacturing orders',
            'production.orders.release' => 'Release orders for production',
            'production.orders.cancel' => 'Cancel manufacturing orders',
        ];

        // Manufacturing Routes
        $routePermissions = [
            'production.routes.viewAny' => 'View all manufacturing routes',
            'production.routes.view' => 'View specific route',
            'production.routes.create' => 'Create manufacturing routes',
            'production.routes.update' => 'Update manufacturing routes',
            'production.routes.delete' => 'Delete manufacturing routes',
            'production.routes.createFromTemplate' => 'Create routes from templates',
        ];

        // Manufacturing Steps
        $stepPermissions = [
            'production.steps.viewAny' => 'View all manufacturing steps',
            'production.steps.view' => 'View specific step',
            'production.steps.update' => 'Update step details',
            'production.steps.execute' => 'Execute manufacturing steps',
            'production.steps.executeQualityCheck' => 'Execute quality checks',
            'production.steps.handleRework' => 'Handle rework decisions',
        ];

        // Items and BOMs
        $itemPermissions = [
            'production.items.viewAny' => 'View all items',
            'production.items.view' => 'View specific item',
            'production.items.create' => 'Create items',
            'production.items.update' => 'Update items',
            'production.items.delete' => 'Delete items',
            'production.bom.import' => 'Import BOMs from CAD',
            'production.bom.manage' => 'Manage BOM structures',
        ];

        // Quality Control
        $qualityPermissions = [
            'production.quality.executeCheck' => 'Execute quality checks',
            'production.quality.recordResult' => 'Record quality results',
            'production.quality.initiateRework' => 'Initiate rework process',
            'production.quality.scrapPart' => 'Scrap failed parts',
        ];

        // Shipments
        $shipmentPermissions = [
            'production.shipments.viewAny' => 'View all shipments',
            'production.shipments.view' => 'View specific shipment',
            'production.shipments.create' => 'Create shipments',
            'production.shipments.update' => 'Update shipments',
            'production.shipments.delete' => 'Delete shipments',
            'production.shipments.uploadPhotos' => 'Upload shipment photos',
            'production.shipments.markDelivered' => 'Mark shipments as delivered',
        ];

        // Create all permissions
        $allPermissions = array_merge(
            $orderPermissions,
            $routePermissions,
            $stepPermissions,
            $itemPermissions,
            $qualityPermissions,
            $shipmentPermissions
        );

        foreach ($allPermissions as $name => $description) {
            Permission::create([
                'name' => $name,
                'display_name' => $description,
                'guard_name' => 'web',
            ]);
        }
    }
}
```

#### 2.2 Update Production Roles Seeder
```php
class UpdatedProductionRoleSeeder extends Seeder
{
    public function run()
    {
        // Production Manager
        $productionManager = Role::updateOrCreate(
            ['name' => 'production-manager'],
            [
                'display_name' => 'Production Manager',
                'description' => 'Full control over production module'
            ]
        );

        $productionManager->syncPermissions([
            'production.orders.*',
            'production.routes.*',
            'production.steps.*',
            'production.items.*',
            'production.bom.*',
            'production.quality.*',
            'production.shipments.*',
        ]);

        // Production Planner
        $productionPlanner = Role::updateOrCreate(
            ['name' => 'production-planner'],
            [
                'display_name' => 'Production Planner',
                'description' => 'Plans and schedules production'
            ]
        );

        $productionPlanner->syncPermissions([
            'production.items.viewAny',
            'production.items.view',
            'production.items.create',
            'production.items.update',
            'production.bom.*',
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.create',
            'production.orders.update',
            'production.orders.cancel',
            'production.routes.*',
            'production.steps.viewAny',
            'production.steps.view',
        ]);

        // Shop Floor Supervisor
        $shopFloorSupervisor = Role::updateOrCreate(
            ['name' => 'shop-floor-supervisor'],
            [
                'display_name' => 'Shop Floor Supervisor',
                'description' => 'Supervises production execution'
            ]
        );

        $shopFloorSupervisor->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.orders.release',
            'production.routes.viewAny',
            'production.routes.view',
            'production.steps.*',
            'production.quality.*',
        ]);

        // Machine Operator
        $machineOperator = Role::updateOrCreate(
            ['name' => 'machine-operator'],
            [
                'display_name' => 'Machine Operator',
                'description' => 'Executes manufacturing steps'
            ]
        );

        $machineOperator->syncPermissions([
            'production.orders.view',
            'production.steps.view',
            'production.steps.execute',
        ]);

        // Quality Inspector
        $qualityInspector = Role::updateOrCreate(
            ['name' => 'quality-inspector'],
            [
                'display_name' => 'Quality Inspector',
                'description' => 'Performs quality checks'
            ]
        );

        $qualityInspector->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.steps.viewAny',
            'production.steps.view',
            'production.quality.*',
        ]);

        // Shipping Coordinator
        $shippingCoordinator = Role::updateOrCreate(
            ['name' => 'shipping-coordinator'],
            [
                'display_name' => 'Shipping Coordinator',
                'description' => 'Manages shipments'
            ]
        );

        $shippingCoordinator->syncPermissions([
            'production.orders.viewAny',
            'production.orders.view',
            'production.shipments.*',
        ]);
    }
}
```

#### 2.3 Dynamic Permission Generation for Entity Scoping
When a new Plant, Area, or Sector is created, generate production permissions:

```php
class EntityPermissionGenerator
{
    public function generateProductionPermissions($entity, $entityType, $entityId)
    {
        $scopedPermissions = [
            // Orders
            "production.orders.viewAny.{$entityType}.{$entityId}",
            "production.orders.create.{$entityType}.{$entityId}",
            
            // Items
            "production.items.viewAny.{$entityType}.{$entityId}",
            "production.items.create.{$entityType}.{$entityId}",
            
            // BOMs
            "production.bom.import.{$entityType}.{$entityId}",
            
            // Shipments
            "production.shipments.viewAny.{$entityType}.{$entityId}",
            "production.shipments.create.{$entityType}.{$entityId}",
        ];

        foreach ($scopedPermissions as $permissionName) {
            Permission::create([
                'name' => $permissionName,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'is_dynamic' => true,
                'guard_name' => 'web',
            ]);
        }
    }
}
```

### Phase 3: Model Updates

#### 3.1 Update ManufacturingOrder Model
```php
// Add relationships
public function parent()
{
    return $this->belongsTo(ManufacturingOrder::class, 'parent_id');
}

public function children()
{
    return $this->hasMany(ManufacturingOrder::class, 'parent_id');
}

public function manufacturingRoute()
{
    return $this->hasOne(ManufacturingRoute::class);
}

// Add methods
public function createChildOrders()
{
    if (!$this->bill_of_material_id) {
        return;
    }
    
    $bomItems = $this->billOfMaterial->currentVersion->items;
    
    foreach ($bomItems as $bomItem) {
        $childOrder = ManufacturingOrder::create([
            'order_number' => $this->generateChildOrderNumber($bomItem),
            'parent_id' => $this->id,
            'item_id' => $bomItem->item_id,
            'quantity' => $bomItem->quantity * $this->quantity,
            'unit_of_measure' => $bomItem->unit_of_measure,
            'status' => 'draft',
            'priority' => $this->priority,
            'requested_date' => $this->requested_date,
            'created_by' => $this->created_by,
        ]);
        
        // Recursively create orders for nested BOMs
        if ($bomItem->item->current_bom_id) {
            $childOrder->bill_of_material_id = $bomItem->item->current_bom_id;
            $childOrder->save();
            $childOrder->createChildOrders();
        }
    }
    
    $this->updateChildOrderCounts();
}

public function checkAutoComplete()
{
    if ($this->auto_complete_on_children && 
        $this->child_orders_count > 0 && 
        $this->child_orders_count === $this->completed_child_orders_count) {
        $this->status = 'completed';
        $this->actual_end_date = now();
        $this->save();
        
        // Notify parent if exists
        if ($this->parent) {
            $this->parent->incrementCompletedChildren();
        }
    }
}
```

#### 3.2 Create ManufacturingRoute Model
```php
class ManufacturingRoute extends Model
{
    protected $fillable = [
        'manufacturing_order_id',
        'item_id',
        'route_template_id',
        'name',
        'description',
        'is_active',
        'created_by',
    ];
    
    public function manufacturingOrder()
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }
    
    public function item()
    {
        return $this->belongsTo(Item::class);
    }
    
    public function steps()
    {
        return $this->hasMany(ManufacturingStep::class)->orderBy('step_number');
    }
    
    public function createFromTemplate(RouteTemplate $template)
    {
        foreach ($template->steps as $templateStep) {
            $this->steps()->create([
                'step_number' => $templateStep->step_number,
                'step_type' => $templateStep->step_type,
                'name' => $templateStep->name,
                'description' => $templateStep->description,
                'work_cell_id' => $templateStep->work_cell_id,
                'form_id' => $templateStep->form_id,
                'setup_time_minutes' => $templateStep->setup_time_minutes,
                'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                'quality_check_mode' => $templateStep->quality_check_mode,
                'sampling_size' => $templateStep->sampling_size,
            ]);
        }
    }
}
```

#### 3.3 Create ManufacturingStep Model
```php
class ManufacturingStep extends Model
{
    protected $fillable = [
        'manufacturing_route_id',
        'step_number',
        'step_type',
        'name',
        'description',
        'work_cell_id',
        'status',
        'form_id',
        'form_version_id',
        'setup_time_minutes',
        'cycle_time_minutes',
        'quality_check_mode',
        'sampling_size',
        'depends_on_step_id',
    ];
    
    protected $casts = [
        'status' => 'string',
        'step_type' => 'string',
        'quality_result' => 'string',
        'quality_check_mode' => 'string',
    ];
    
    public function canStart(): bool
    {
        if (!$this->depends_on_step_id) {
            return true;
        }
        
        $dependency = $this->dependency;
        
        if ($this->can_start_when_dependency === 'completed') {
            return $dependency->status === 'completed';
        }
        
        return in_array($dependency->status, ['in_progress', 'completed']);
    }
    
    public function createReworkStep()
    {
        $maxStepNumber = $this->route->steps()->max('step_number');
        
        return $this->route->steps()->create([
            'step_number' => $maxStepNumber + 1,
            'step_type' => 'rework',
            'name' => "Rework for {$this->name}",
            'description' => "Rework step for failed quality check on {$this->name}",
            'work_cell_id' => $this->work_cell_id,
            'cycle_time_minutes' => $this->cycle_time_minutes * 2, // Estimate
            'depends_on_step_id' => $this->id,
        ]);
    }
    
    public function startExecution($partNumber = null, $totalParts = null)
    {
        return ManufacturingStepExecution::create([
            'manufacturing_step_id' => $this->id,
            'manufacturing_order_id' => $this->route->manufacturing_order_id,
            'part_number' => $partNumber,
            'total_parts' => $totalParts,
            'status' => 'in_progress',
            'started_at' => now(),
            'work_cell_id' => $this->work_cell_id,
        ]);
    }
}
```

### Phase 4: Service Layer Updates

#### 4.1 ManufacturingOrderService
```php
class ManufacturingOrderService
{
    public function createOrder($data)
    {
        DB::transaction(function () use ($data) {
            $order = ManufacturingOrder::create($data);
            
            // If BOM-based order, create child orders
            if ($order->bill_of_material_id) {
                $order->createChildOrders();
            }
            
            // Create route if template specified
            if (isset($data['route_template_id'])) {
                $this->createRouteFromTemplate($order, $data['route_template_id']);
            }
            
            return $order;
        });
    }
    
    public function executeStep(ManufacturingStep $step, $data)
    {
        // Validate step can be started
        if (!$step->canStart()) {
            throw new \Exception('Step dependencies not met');
        }
        
        // Handle different execution modes for quality checks
        if ($step->step_type === 'quality_check') {
            return $this->executeQualityCheck($step, $data);
        }
        
        // Standard step execution
        $execution = $step->startExecution(
            $data['part_number'] ?? null,
            $data['total_parts'] ?? null
        );
        
        // Execute associated form if exists
        if ($step->form_id) {
            $this->executeStepForm($execution, $step);
        }
        
        return $execution;
    }
    
    private function executeQualityCheck(ManufacturingStep $step, $data)
    {
        $productionQuantity = $step->route->manufacturingOrder->quantity;
        
        switch ($step->quality_check_mode) {
            case 'every_part':
                // Create execution for each part
                for ($i = 1; $i <= $productionQuantity; $i++) {
                    $step->startExecution($i, $productionQuantity);
                }
                break;
                
            case 'entire_lot':
                // Single execution for entire lot
                $step->startExecution(null, $productionQuantity);
                break;
                
            case 'sampling':
                // ISO 2859 sampling
                $sampleSize = $this->calculateSampleSize($productionQuantity, $step->sampling_size);
                for ($i = 1; $i <= $sampleSize; $i++) {
                    $step->startExecution($i, $sampleSize);
                }
                break;
        }
    }
    
    public function handleQualityFailure(ManufacturingStepExecution $execution, $action)
    {
        $execution->failure_action = $action;
        $execution->save();
        
        if ($action === 'rework') {
            // Create rework step if doesn't exist
            $reworkStep = $execution->step->route->steps()
                ->where('step_type', 'rework')
                ->where('depends_on_step_id', $execution->manufacturing_step_id)
                ->first();
                
            if (!$reworkStep) {
                $reworkStep = $execution->step->createReworkStep();
            }
            
            // Queue rework step
            $reworkStep->status = 'queued';
            $reworkStep->save();
        } else {
            // Scrap - update production order quantity
            $order = $execution->manufacturingOrder;
            $order->quantity_scrapped += 1;
            $order->save();
        }
    }
}
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests
- Test MO parent-child relationships
- Test route-to-MO association
- Test step state transitions
- Test quality check logic
- Test auto-completion logic

#### 5.2 Integration Tests
- Test complete MO creation flow with BOM
- Test routing execution with forms
- Test quality check failure scenarios
- Test rework flow
- Test parent MO completion

#### 5.3 Performance Tests
- Test with 10,000+ item BOMs
- Test concurrent step executions
- Test cascading completions

### Phase 6: Implementation Timeline

- **Week 1**: Update database migration files and create new ones
- **Week 2**: Update model relationships and methods
- **Week 3**: Implement service layer and business logic
- **Week 4**: Create controllers and API endpoints
- **Week 5**: Build frontend components and views
- **Week 6**: Testing and bug fixes

### Phase 7: Deployment Strategy

1. **Fresh Installation** - Run `php artisan migrate:fresh` to create all tables with new structure
2. **Seed Test Data** - Create seeders for testing the new functionality
3. **Integration Testing** - Verify all new features work correctly
4. **Documentation** - Update API documentation and user guides

## Key Changes Summary

### Migration Files to Update:
1. **manufacturing_orders** - Add parent_id, child tracking fields, quantity tracking
2. **routing_steps** → **manufacturing_steps** - Rename and enhance with state management, quality checks
3. **production_executions** → **manufacturing_step_executions** - Complete restructure for step-level execution
4. **form_executions & task_responses** - Add manufacturing context fields

### New Migration Files to Create:
1. **manufacturing_routes** - Routes tied to MOs instead of BOM items
2. **route_templates** - Reusable route definitions
3. **route_template_steps** - Template step definitions

### Migration Files to Delete:
1. **production_routings** - Replaced by manufacturing_routes
2. **production_executions** - Replaced by manufacturing_step_executions

## Permission-Based Access Control

### Implementing Entity-Scoped Permissions

#### Authorization in Controllers
```php
class ManufacturingOrderController extends Controller
{
    public function index(Request $request)
    {
        // Check for any viewAny permission at any scope
        $user = $request->user();
        $plant = $request->get('plant_id');
        $area = $request->get('area_id');
        $sector = $request->get('sector_id');
        
        if ($plant && $user->can("production.orders.viewAny.plant.{$plant}")) {
            $orders = ManufacturingOrder::whereHas('item', function($q) use ($plant) {
                $q->whereHas('sector.area.plant', function($q2) use ($plant) {
                    $q2->where('id', $plant);
                });
            })->get();
        } elseif ($area && $user->can("production.orders.viewAny.area.{$area}")) {
            $orders = ManufacturingOrder::whereHas('item', function($q) use ($area) {
                $q->whereHas('sector.area', function($q2) use ($area) {
                    $q2->where('id', $area);
                });
            })->get();
        } else {
            abort(403, 'No permission to view manufacturing orders');
        }
        
        return $orders;
    }
    
    public function create(Request $request)
    {
        $itemId = $request->get('item_id');
        $item = Item::findOrFail($itemId);
        
        // Check if user can create orders in the item's scope
        $sector = $item->sector;
        $area = $sector->area;
        $plant = $area->plant;
        
        if (!$request->user()->canAny([
            "production.orders.create.plant.{$plant->id}",
            "production.orders.create.area.{$area->id}",
            "production.orders.create.sector.{$sector->id}",
        ])) {
            abort(403, 'No permission to create manufacturing orders for this item');
        }
        
        // Create the order...
    }
}
```

#### Work Cell-Based Access for Operators
```php
class ManufacturingStepController extends Controller
{
    public function execute(Request $request, ManufacturingStep $step)
    {
        $user = $request->user();
        
        // Machine operators can only execute steps in their assigned work cells
        if ($user->hasRole('machine-operator')) {
            $assignedWorkCells = $user->assignedWorkCells()->pluck('id');
            
            if (!$assignedWorkCells->contains($step->work_cell_id)) {
                abort(403, 'You are not assigned to this work cell');
            }
        }
        
        // Check general execute permission
        if (!$user->can('production.steps.execute')) {
            abort(403, 'No permission to execute manufacturing steps');
        }
        
        // Execute the step...
    }
}
```

#### Quality Check Permissions
```php
class QualityCheckController extends Controller
{
    public function recordResult(Request $request, ManufacturingStep $step)
    {
        // Only quality inspectors and supervisors can record quality results
        if (!$request->user()->canAny([
            'production.quality.recordResult',
            'production.steps.executeQualityCheck'
        ])) {
            abort(403, 'No permission to record quality results');
        }
        
        // Record the result...
    }
    
    public function handleRework(Request $request, ManufacturingStepExecution $execution)
    {
        // Only supervisors can make rework decisions
        if (!$request->user()->can('production.steps.handleRework')) {
            abort(403, 'No permission to handle rework decisions');
        }
        
        // Process rework...
    }
}
```

### Middleware for Production Module
```php
class ProductionAccessMiddleware
{
    public function handle($request, Closure $next)
    {
        $user = $request->user();
        
        // Check if user has any production permissions
        if (!$user->hasAnyPermission(Permission::where('name', 'like', 'production.%')->pluck('name'))) {
            abort(403, 'No access to production module');
        }
        
        return $next($request);
    }
}
```

## Conclusion

This migration plan updates the production module to support flexible manufacturing routes tied to orders rather than items, implements comprehensive state management, adds quality control capabilities, and establishes proper parent-child relationships for BOM-based manufacturing orders. Since this is a new project, we can make these changes directly to the migration files and run `migrate:fresh` for a clean implementation.