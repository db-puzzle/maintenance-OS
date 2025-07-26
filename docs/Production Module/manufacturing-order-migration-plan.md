# Manufacturing Order System Migration Plan

## Executive Summary

This document outlines the migration plan to transform the current production module data model to support the new Manufacturing Order (MO) system requirements. The key changes involve restructuring how routes relate to items, implementing proper state management for manufacturing steps, adding quality control capabilities, and establishing parent-child MO relationships.

## Current State Analysis

### Existing Schema Issues
1. **Production Routes are tied to BOM Items instead of Manufacturing Orders** - This prevents the same item from having different routes in different MOs
2. **Missing proper state management** - No state tracking for manufacturing steps (Queued, In Progress, Completed, On Hold)
3. **No Quality Check implementation** - Quality checks need to be special manufacturing steps with pass/fail results
4. **No parent-child MO relationships** - When creating MO for BOM, child MOs aren't automatically created
5. **No Form/Task integration with manufacturing steps** - Cannot associate forms with production steps
6. **No rework capability** - No mechanism to handle failed quality checks with rework steps

## Migration Strategy

### Phase 1: Database Schema Changes

#### 1.1 Modify Production Orders Table
```sql
-- Add parent_id for hierarchical MO relationships
ALTER TABLE production_orders ADD COLUMN parent_id BIGINT UNSIGNED NULL;
ALTER TABLE production_orders ADD CONSTRAINT fk_parent_order FOREIGN KEY (parent_id) REFERENCES production_orders(id) ON DELETE CASCADE;
ALTER TABLE production_orders ADD INDEX idx_parent_id (parent_id);

-- Add fields for tracking completion
ALTER TABLE production_orders ADD COLUMN child_orders_count INT DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN completed_child_orders_count INT DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN auto_complete_on_children BOOLEAN DEFAULT TRUE;
```

#### 1.2 Create Manufacturing Routes Table (Replaces production_routings)
```sql
CREATE TABLE manufacturing_routes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    production_order_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    route_template_id BIGINT UNSIGNED NULL, -- Optional template reference
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_production_order (production_order_id),
    INDEX idx_item (item_id)
);
```

#### 1.3 Create Manufacturing Steps Table (Enhanced routing_steps)
```sql
CREATE TABLE manufacturing_steps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    manufacturing_route_id BIGINT UNSIGNED NOT NULL,
    step_number INT NOT NULL,
    step_type ENUM('standard', 'quality_check', 'rework') DEFAULT 'standard',
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    work_cell_id BIGINT UNSIGNED NULL,
    
    -- State management
    status ENUM('pending', 'queued', 'in_progress', 'on_hold', 'completed', 'skipped') DEFAULT 'pending',
    
    -- Form association
    form_id BIGINT UNSIGNED NULL,
    form_version_id BIGINT UNSIGNED NULL,
    
    -- Time tracking
    setup_time_minutes INT DEFAULT 0,
    cycle_time_minutes INT NOT NULL,
    actual_start_time TIMESTAMP NULL,
    actual_end_time TIMESTAMP NULL,
    
    -- Quality check specific fields
    quality_result ENUM('pending', 'passed', 'failed') NULL,
    failure_action ENUM('scrap', 'rework') NULL,
    quality_check_mode ENUM('every_part', 'entire_lot', 'sampling') DEFAULT 'every_part',
    sampling_size INT NULL, -- For ISO 2859 sampling
    
    -- Dependencies
    depends_on_step_id BIGINT UNSIGNED NULL,
    can_start_when_dependency ENUM('completed', 'in_progress') DEFAULT 'completed',
    
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (manufacturing_route_id) REFERENCES manufacturing_routes(id) ON DELETE CASCADE,
    FOREIGN KEY (work_cell_id) REFERENCES work_cells(id),
    FOREIGN KEY (form_id) REFERENCES forms(id),
    FOREIGN KEY (form_version_id) REFERENCES form_versions(id),
    FOREIGN KEY (depends_on_step_id) REFERENCES manufacturing_steps(id),
    UNIQUE KEY unique_route_step (manufacturing_route_id, step_number),
    INDEX idx_status (status),
    INDEX idx_step_type (step_type)
);
```

#### 1.4 Create Manufacturing Step Executions Table
```sql
CREATE TABLE manufacturing_step_executions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    manufacturing_step_id BIGINT UNSIGNED NOT NULL,
    production_order_id BIGINT UNSIGNED NOT NULL,
    
    -- Part tracking for lot production
    part_number INT NULL, -- Which part in the lot (1, 2, 3...)
    total_parts INT NULL, -- Total parts in the lot
    
    -- State and timing
    status ENUM('queued', 'in_progress', 'on_hold', 'completed') NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    on_hold_at TIMESTAMP NULL,
    resumed_at TIMESTAMP NULL,
    total_hold_duration INT DEFAULT 0, -- minutes
    
    -- Execution details
    executed_by BIGINT UNSIGNED NULL,
    work_cell_id BIGINT UNSIGNED NULL,
    
    -- Quality check results
    quality_result ENUM('passed', 'failed') NULL,
    quality_notes TEXT NULL,
    failure_action ENUM('scrap', 'rework') NULL,
    
    -- Form execution reference
    form_execution_id BIGINT UNSIGNED NULL,
    
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (manufacturing_step_id) REFERENCES manufacturing_steps(id),
    FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
    FOREIGN KEY (executed_by) REFERENCES users(id),
    FOREIGN KEY (work_cell_id) REFERENCES work_cells(id),
    INDEX idx_step_order (manufacturing_step_id, production_order_id),
    INDEX idx_status (status),
    INDEX idx_part_tracking (production_order_id, part_number)
);
```

#### 1.5 Modify Form-related Tables
```sql
-- Add manufacturing context to form executions
ALTER TABLE form_executions ADD COLUMN manufacturing_step_execution_id BIGINT UNSIGNED NULL;
ALTER TABLE form_executions ADD CONSTRAINT fk_manufacturing_step_execution 
    FOREIGN KEY (manufacturing_step_execution_id) REFERENCES manufacturing_step_executions(id);

-- Add manufacturing context to task responses
ALTER TABLE task_responses ADD COLUMN manufacturing_step_execution_id BIGINT UNSIGNED NULL;
ALTER TABLE task_responses ADD CONSTRAINT fk_task_manufacturing_step 
    FOREIGN KEY (manufacturing_step_execution_id) REFERENCES manufacturing_step_executions(id);
```

#### 1.6 Create Route Templates Table (For reusable routes)
```sql
CREATE TABLE route_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    item_category VARCHAR(100) NULL, -- Optional category filter
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_name (name),
    INDEX idx_category (item_category)
);

CREATE TABLE route_template_steps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    route_template_id BIGINT UNSIGNED NOT NULL,
    step_number INT NOT NULL,
    step_type ENUM('standard', 'quality_check', 'rework') DEFAULT 'standard',
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    setup_time_minutes INT DEFAULT 0,
    cycle_time_minutes INT NOT NULL,
    work_cell_id BIGINT UNSIGNED NULL,
    form_id BIGINT UNSIGNED NULL,
    quality_check_mode ENUM('every_part', 'entire_lot', 'sampling') DEFAULT 'every_part',
    sampling_size INT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (route_template_id) REFERENCES route_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (work_cell_id) REFERENCES work_cells(id),
    FOREIGN KEY (form_id) REFERENCES forms(id),
    UNIQUE KEY unique_template_step (route_template_id, step_number)
);
```

### Phase 2: Model Updates

#### 2.1 Update ProductionOrder Model
```php
// Add relationships
public function parent()
{
    return $this->belongsTo(ProductionOrder::class, 'parent_id');
}

public function children()
{
    return $this->hasMany(ProductionOrder::class, 'parent_id');
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
        $childOrder = ProductionOrder::create([
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

#### 2.2 Create ManufacturingRoute Model
```php
class ManufacturingRoute extends Model
{
    protected $fillable = [
        'production_order_id',
        'item_id',
        'route_template_id',
        'name',
        'description',
        'is_active',
        'created_by',
    ];
    
    public function productionOrder()
    {
        return $this->belongsTo(ProductionOrder::class);
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

#### 2.3 Create ManufacturingStep Model
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
            'production_order_id' => $this->route->production_order_id,
            'part_number' => $partNumber,
            'total_parts' => $totalParts,
            'status' => 'in_progress',
            'started_at' => now(),
            'work_cell_id' => $this->work_cell_id,
        ]);
    }
}
```

### Phase 3: Service Layer Updates

#### 3.1 ManufacturingOrderService
```php
class ManufacturingOrderService
{
    public function createOrder($data)
    {
        DB::transaction(function () use ($data) {
            $order = ProductionOrder::create($data);
            
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
        $productionQuantity = $step->route->productionOrder->quantity;
        
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
            $order = $execution->productionOrder;
            $order->quantity_scrapped += 1;
            $order->save();
        }
    }
}
```

### Phase 4: Migration Steps

#### 4.1 Data Migration Script
```php
class MigrateProductionData extends Command
{
    public function handle()
    {
        DB::transaction(function () {
            // 1. Migrate existing production_routings to route templates
            $this->migrateRoutingTemplates();
            
            // 2. Update existing production orders
            $this->updateProductionOrders();
            
            // 3. Create manufacturing routes for existing orders
            $this->createManufacturingRoutes();
            
            // 4. Migrate routing steps to manufacturing steps
            $this->migrateRoutingSteps();
            
            // 5. Update form associations
            $this->updateFormAssociations();
        });
    }
    
    private function migrateRoutingTemplates()
    {
        $routings = DB::table('production_routings')->get();
        
        foreach ($routings as $routing) {
            $template = RouteTemplate::create([
                'name' => $routing->name,
                'description' => $routing->description,
                'is_active' => $routing->is_active,
                'created_by' => $routing->created_by,
                'created_at' => $routing->created_at,
            ]);
            
            // Migrate steps
            $steps = DB::table('routing_steps')
                ->where('production_routing_id', $routing->id)
                ->get();
                
            foreach ($steps as $step) {
                RouteTemplateStep::create([
                    'route_template_id' => $template->id,
                    'step_number' => $step->step_number,
                    'name' => $step->name,
                    'description' => $step->description,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'work_cell_id' => $step->work_cell_id,
                ]);
            }
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

### Phase 6: Rollback Plan

1. **Database Backup** - Full backup before migration
2. **Feature Flag** - Use feature flags to control new system activation
3. **Parallel Run** - Run old and new systems in parallel for validation
4. **Rollback Scripts** - Prepare scripts to revert schema changes
5. **Data Preservation** - Keep old tables for 30 days after migration

### Timeline

- **Week 1-2**: Schema changes and model updates
- **Week 3**: Service layer implementation
- **Week 4**: Data migration scripts
- **Week 5**: Testing and validation
- **Week 6**: Staged rollout with feature flags

### Risk Mitigation

1. **Data Integrity** - Extensive validation during migration
2. **Performance** - Index optimization and query analysis
3. **User Training** - Prepare training materials for new workflow
4. **Backward Compatibility** - API versioning for gradual transition

## Conclusion

This migration plan transforms the production module to support flexible manufacturing routes tied to orders rather than items, implements comprehensive state management, adds quality control capabilities, and establishes proper parent-child relationships for BOM-based manufacturing orders. The phased approach ensures minimal disruption while providing powerful new capabilities for production management.