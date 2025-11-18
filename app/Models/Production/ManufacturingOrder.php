<?php

namespace App\Models\Production;

use App\Models\Settings\UnitOfMeasure;
use App\Models\User;
use App\Traits\SmartProgressCalculator;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class ManufacturingOrder extends Model
{
    use HasFactory;
    use SmartProgressCalculator;

    /**
     * Get the factory name for the model.
     */
    protected static function newFactory()
    {
        return \Database\Factories\Production\ProductionOrderFactory::new();
    }

    public const STATUSES = [
        'draft' => 'Draft',
        'planned' => 'Planned',
        'scheduled' => 'Scheduled',
        'released' => 'Released',
        'in_progress' => 'In Progress',
        'on_hold' => 'On Hold',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
    ];

    public const SOURCE_TYPES = [
        'manual' => 'Manual',
        'sales_order' => 'Sales Order',
        'forecast' => 'Forecast',
    ];

    protected $fillable = [
        'order_number',
        'parent_id',
        'item_id',
        'bill_of_material_id',
        'quantity',
        'quantity_completed',
        'quantity_scrapped',
        'unit_of_measure_code',
        'status',
        'hold_reason',
        'hold_at',
        'priority',
        'child_orders_count',
        'completed_child_orders_count',
        'requested_date',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'source_type',
        'source_reference',
        'created_by',
        // Smart progress fields
        'smart_progress_percentage',
        'progress_calculated_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'quantity_completed' => 'integer',
        'quantity_scrapped' => 'integer',
        'requested_date' => 'date',
        'planned_start_date' => 'datetime',
        'planned_end_date' => 'datetime',
        'actual_start_date' => 'datetime',
        'actual_end_date' => 'datetime',
        'hold_at' => 'datetime',
        // Smart progress casts
        'smart_progress_percentage' => 'decimal:2',
        'progress_calculated_at' => 'datetime',
    ];

    protected $appends = [];

    /**
     * Get the parent production order.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'parent_id');
    }

    /**
     * Get the child production orders.
     */
    public function children(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class, 'parent_id');
    }

    /**
     * Get the manufacturing route for this order.
     */
    public function manufacturingRoute(): HasOne
    {
        return $this->hasOne(ManufacturingRoute::class, 'manufacturing_order_id');
    }

    /**
     * Get the item for this order.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get the BOM for this order.
     */
    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'bill_of_material_id');
    }

    /**
     * Get the unit of measure.
     */
    public function unitOfMeasure(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'unit_of_measure_code', 'code');
    }

    /**
     * Get the user who created the order.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the production schedules for this order.
     */
    public function productionSchedules(): HasMany
    {
        return $this->hasMany(ProductionSchedule::class);
    }

    /**
     * Get the shipment items for this order.
     */
    public function shipmentItems(): HasMany
    {
        return $this->hasMany(ShipmentItem::class, 'manufacturing_order_id');
    }

    /**
     * Get the parent dependencies where this order is a child.
     */
    public function parentDependencies(): HasMany
    {
        return $this->hasMany(ManufacturingOrderDependency::class, 'child_order_id');
    }

    /**
     * Get the child dependencies where this order is a parent.
     */
    public function childDependencies(): HasMany
    {
        return $this->hasMany(ManufacturingOrderDependency::class, 'parent_order_id');
    }

    /**
     * Get the material flows into or out of this order.
     */
    public function materialFlows(): HasMany
    {
        return $this->hasMany(ManufacturingOrderFlow::class, 'source_order_id')
            ->orWhere('destination_order_id', $this->id);
    }

    /**
     * Create child orders based on BOM items.
     */
    public function createChildOrders(): void
    {
        if (! $this->bill_of_material_id) {
            return;
        }

        $this->load(['billOfMaterial.items']);

        DB::transaction(function () {
            // Get the root BOM item
            $rootBomItem = $this->billOfMaterial->items()
                ->whereNull('parent_item_id')
                ->first();

            if (! $rootBomItem) {
                throw new \Exception('BOM has no root item');
            }

            // Verify this MO is for the root item
            if ($this->item_id !== $rootBomItem->item_id) {
                throw new \Exception('Manufacturing order item does not match BOM root item');
            }

            // Create orders for the root item's children only
            $this->createChildOrdersFromBomItems(
                $this->billOfMaterial->id,
                $rootBomItem->id, // Use root BOM item as parent, not null
                $this->id, // This order represents the root item
                1 // Initial quantity multiplier
            );

            $this->updateChildOrderCounts();
        });
    }

    /**
     * Recursively create child orders from BOM items hierarchy.
     */
    private function createChildOrdersFromBomItems($billOfMaterialId, $parentItemId, $parentOrderId, $parentQuantity = 1): void
    {
        // Get BOM items that are children of the specified parent
        $bomItems = \App\Models\Production\BomItem::where('bill_of_material_id', $billOfMaterialId)
            ->where('parent_item_id', $parentItemId) // Always has a parent now
            ->with(['item.primaryBom']) // Eager load the primaryBom relationship
            ->get();

        $parentOrder = ManufacturingOrder::find($parentOrderId);

        foreach ($bomItems as $bomItem) {
            // Calculate quantity based on parent quantity
            // Round up to ensure we have enough parts
            $orderQuantity = (int) ceil($bomItem->quantity * $this->quantity * $parentQuantity);

            // Prepare child order data
            $childOrderData = [
                'order_number' => $this->generateChildOrderNumberForParent($bomItem, $parentOrder),
                'parent_id' => $parentOrderId,
                'item_id' => $bomItem->item_id,
                'quantity' => $orderQuantity,
                'unit_of_measure' => $bomItem->unit_of_measure,
                'status' => 'draft',
                'priority' => $this->priority,
                'requested_date' => $this->requested_date,
                'created_by' => $this->created_by,
            ];

            // Create manufacturing order for this BOM item
            $childOrder = ManufacturingOrder::create($childOrderData);

            // Ensure child order has a route
            $this->ensureChildOrderHasRoute($childOrder, $bomItem);

            // Check if this item has its own separate BOM
            $primaryBom = $bomItem->item->primaryBom;
            if ($primaryBom) {
                $childOrder->bill_of_material_id = $primaryBom->id;
                $childOrder->save();
                $childOrder->createChildOrders();
            } else {
                // Recursively create orders for children within the same BOM
                $this->createChildOrdersFromBomItems(
                    $billOfMaterialId,
                    $bomItem->id, // This BOM item is now the parent
                    $childOrder->id, // The newly created order is the parent order
                    $bomItem->quantity // Pass down the quantity multiplier
                );
            }

            // Update child order counts for the newly created order
            $childOrder->updateChildOrderCounts();
        }
    }

    /**
     * Ensure child order has a route.
     */
    protected function ensureChildOrderHasRoute(ManufacturingOrder $childOrder, BomItem $bomItem): void
    {
        // Load the item with its category
        $childOrder->load('item.category');

        // Try to find a template for the item
        $template = null;
        if ($childOrder->item && $childOrder->item->item_category_id) {
            $template = ManufacturingRoute::templates()
                ->where('item_category_id', $childOrder->item->item_category_id)
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->first();
        }

        if ($template) {
            // Create route from template
            $route = $childOrder->manufacturingRoute()->create([
                'item_id' => $childOrder->item_id,
                'template_source_id' => $template->id,
                'name' => $template->name,
                'description' => $template->description,
                'is_active' => true,
                'is_template' => false,
                'created_by' => $childOrder->created_by,
            ]);

            $route->createFromTemplate($template);
        } else {
            // Create empty route
            $childOrder->manufacturingRoute()->create([
                'item_id' => $childOrder->item_id,
                'name' => "Route for {$childOrder->order_number}",
                'description' => 'Empty route - add steps or execute without steps',
                'is_active' => true,
                'is_template' => false,
                'created_by' => $childOrder->created_by,
            ]);
        }
    }

    /**
     * Generate a unique order number for child orders.
     */
    protected function generateChildOrderNumber(BomItem $bomItem): string
    {
        return $this->generateChildOrderNumberForParent($bomItem, $this);
    }

    /**
     * Generate a unique order number for child orders with specific parent.
     * Format: parent_number.N where N is the child sequence
     * Examples:
     * - Root order: MO-25234-001
     * - First child: MO-25234-001.1
     * - Second child: MO-25234-001.2
     * - Sub-child: MO-25234-001.2.1.
     */
    protected function generateChildOrderNumberForParent(BomItem $bomItem, ManufacturingOrder $parentOrder): string
    {
        $parentNumber = $parentOrder->order_number;

        // Count existing direct children for this parent to generate sequence
        $existingCount = ManufacturingOrder::where('parent_id', $parentOrder->id)->count();
        $sequence = $existingCount + 1;

        return sprintf('%s.%d', $parentNumber, $sequence);
    }

    /**
     * Update child order counts.
     */
    public function updateChildOrderCounts(): void
    {
        $this->child_orders_count = $this->children()->count();
        $this->completed_child_orders_count = $this->children()
            ->where('status', 'completed')
            ->count();
        $this->save();
    }

    /**
     * Scope for active orders.
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }

    /**
     * Scope for orders with a specific status.
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for root orders (no parent).
     */
    public function scopeRootOrders($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope to eager load all relations needed for smart progress calculation.
     */
    public function scopeWithFullProgress($query)
    {
        return $query->with([
            'manufacturingRoute.steps',
            'children' => function ($q) {
                // Recursively load children with their progress data
                $q->withFullProgress();
            },
        ])->withCount([
            'children',
            'manufacturingRoute.steps' => function ($q) {
                $q->whereNotIn('status', ['cancelled', 'skipped']);
            },
        ]);
    }

    /**
     * Scope for orders with stale progress.
     */
    public function scopeWithStaleProgress($query, $hours = 24)
    {
        return $query->where(function ($q) use ($hours) {
            $q->whereNull('progress_calculated_at')
                ->orWhere('progress_calculated_at', '<', now()->subHours($hours));
        });
    }

    /**
     * Scope for planning view - optimized eager loading.
     * Loads only necessary data for the planning interface.
     */
    public function scopeForPlanningView($query)
    {
        return $query->with([
            // Load item with minimal columns
            'item:id,item_number,name,item_category_id,description,can_be_manufactured,can_be_purchased,can_be_sold,is_active',
            'item.category:id,name',
            'item.media' => function ($q) {
                $q->where('collection_name', 'images')
                    ->orderBy('order_column');
            },
            'item.primaryBom:id,bom_number,name,output_item_id,is_active',

            // Load parent with minimal data
            'parent:id,order_number,item_id',
            'parent.item:id,item_number,name',

            // Load route with steps efficiently
            'manufacturingRoute' => function ($q) {
                $q->select('id', 'manufacturing_order_id', 'name', 'is_active')
                    ->with(['steps' => function ($stepQuery) {
                        $stepQuery->select(
                            'id',
                            'manufacturing_route_id',
                            'name',
                            'description',
                            'work_cell_id',
                            'step_type',
                            'setup_time_seconds',
                            'cycle_time_seconds',
                            'use_workcell_throughput',
                            'quality_check_mode',
                            'sampling_size',
                            'form_id',
                            'depends_on_step_id',
                            'can_start_when_dependency',
                            'dependency_start_condition',
                            'dependency_minimum_quantity',
                            'dependency_minimum_percentage',
                            'child_order_dependency_type',
                            'child_order_minimum_quantity',
                            'status',
                            'execution_location',
                            'manufacturer_id',
                            'expected_lead_time_days'
                        )
                            ->with([
                                'workCell',
                                // Eager load dependency chain to avoid N+1 in getDisplayPositionAttribute
                                // Loading 5 levels deep to handle complex dependency chains
                                'dependency' => function ($depQuery) {
                                    $depQuery->select('id', 'manufacturing_route_id', 'depends_on_step_id')
                                        ->with(['dependency' => function ($depQuery2) {
                                            $depQuery2->select('id', 'manufacturing_route_id', 'depends_on_step_id')
                                                ->with(['dependency' => function ($depQuery3) {
                                                    $depQuery3->select('id', 'manufacturing_route_id', 'depends_on_step_id')
                                                        ->with(['dependency' => function ($depQuery4) {
                                                            $depQuery4->select('id', 'manufacturing_route_id', 'depends_on_step_id')
                                                                ->with(['dependency' => function ($depQuery5) {
                                                                    $depQuery5->select('id', 'manufacturing_route_id', 'depends_on_step_id');
                                                                }]);
                                                        }]);
                                                }]);
                                        }]);
                                },
                            ]);
                    }]);
            },
        ])->withExists([
            // Check if manufacturing route has steps with executions (for canRevertStatus)
            'manufacturingRoute as has_steps_with_executions' => function ($query) {
                $query->whereHas('steps', function ($q) {
                    $q->whereHas('executions');
                });
            },
        ]);
    }

    /**
     * Scope to filter orders for planning status.
     */
    public function scopePlanningStatus($query)
    {
        return $query->whereIn('status', ['draft', 'planned']);
    }

    /**
     * Scope to get orders with their hierarchy using order number pattern.
     * More efficient than recursive parent/child queries.
     */
    public function scopeWithHierarchy($query, $orderNumber)
    {
        return $query->where(function ($q) use ($orderNumber) {
            $q->where('order_number', $orderNumber)
                ->orWhere('order_number', 'like', $orderNumber . '.%');
        });
    }

    /**
     * Scope for searching orders by text.
     */
    public function scopeSearchByText($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('order_number', 'like', "%{$search}%")
                ->orWhere('source_reference', 'like', "%{$search}%")
                ->orWhereHas('item', function ($itemQuery) use ($search) {
                    $itemQuery->where('item_number', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
        });
    }

    /**
     * Calculate total duration in minutes.
     */
    public function getTotalDurationAttribute()
    {
        if (! $this->actual_start_date || ! $this->actual_end_date) {
            return null;
        }

        return $this->actual_start_date->diffInMinutes($this->actual_end_date);
    }

    /**
     * Get the progress percentage (simple calculation).
     */
    public function getProgressPercentageAttribute()
    {
        if ($this->quantity == 0) {
            return 100;
        }

        return round(($this->quantity_completed / $this->quantity) * 100, 2);
    }

    /**
     * Get smart progress percentage (considers hierarchy and steps).
     * This accessor provides a convenient way to get smart progress with automatic calculation.
     */
    public function getSmartProgressAttribute()
    {
        // Use cached value if fresh, otherwise calculate
        return $this->calculateSmartProgress(true);
    }

    /**
     * Check if order can be released.
     */
    public function canBeReleased(): bool
    {
        // Order must be in draft, planned, or scheduled status
        if (! in_array($this->status, ['draft', 'planned', 'scheduled'])) {
            return false;
        }

        // Check hierarchical dependency constraints
        if ($this->dependency_type !== 'none' && ! $this->can_release_before_children) {
            return $this->checkChildOrderDependencies();
        }

        // Route is now optional for release
        return true;
    }

    /**
     * Check child order dependencies for release.
     */
    protected function checkChildOrderDependencies(): bool
    {
        switch ($this->dependency_type) {
            case 'all_children_released':
                return $this->children()
                    ->whereNotIn('status', ['released', 'in_progress', 'completed'])
                    ->count() === 0;

            case 'children_quantity':
            case 'children_percentage':
                // For release, we might have different rules than execution
                return true; // Can release but not execute

            case 'progressive':
                return $this->checkProgressiveReleaseDependencies();
        }

        return true;
    }

    /**
     * Get hierarchical Work In Progress.
     */
    public function getHierarchicalWipAttribute(): array
    {
        $orderWip = $this->quantity_completed - $this->getShippedQuantity();
        $childrenWip = 0;

        foreach ($this->children as $child) {
            $childData = $child->hierarchical_wip;
            $childrenWip += $childData['total_hierarchy_wip'];
        }

        return [
            'order_level' => $orderWip,
            'children_wip' => $childrenWip,
            'total_hierarchy_wip' => $orderWip + $childrenWip,
        ];
    }

    /**
     * Get total quantity that has been shipped.
     */
    protected function getShippedQuantity(): float
    {
        return $this->shipmentItems()
            ->whereHas('shipment', function ($query) {
                $query->where('status', 'shipped');
            })
            ->sum('quantity_shipped');
    }

    /**
     * Calculate Work In Progress quantity for step-level progressive flow.
     */
    public function getWorkInProgressQuantityAttribute(): int
    {
        // Handle orders without routes
        if (! $this->manufacturingRoute || $this->manufacturingRoute->steps->isEmpty()) {
            return 0;
        }

        // Get first steps (may be multiple with parallel execution)
        $firstSteps = $this->manufacturingRoute->steps()
            ->whereNull('depends_on_step_id')
            ->get();

        // Get last steps (no dependent steps)
        $lastSteps = $this->manufacturingRoute->steps()
            ->whereDoesntHave('dependentSteps')
            ->get();

        if ($firstSteps->isEmpty() || $lastSteps->isEmpty()) {
            return 0;
        }

        // For parallel first steps, sum their completed quantities
        $enteredProduction = $firstSteps->sum('cumulative_quantity_completed');

        // For parallel last steps, sum their completed quantities
        $exitedProduction = $lastSteps->sum('cumulative_quantity_completed');

        // WIP = Total entered - Total exited
        return max(0, $enteredProduction - $exitedProduction);
    }

    /**
     * Get total quantity that has entered production (first steps).
     */
    public function getFirstStepCompletedQuantityAttribute(): int
    {
        if (! $this->manufacturingRoute) {
            return 0;
        }

        return $this->manufacturingRoute->steps()
            ->whereNull('depends_on_step_id')
            ->sum('cumulative_quantity_completed');
    }

    /**
     * Get total quantity that has exited production (last steps).
     */
    public function getLastStepCompletedQuantityAttribute(): int
    {
        if (! $this->manufacturingRoute) {
            return 0;
        }

        return $this->manufacturingRoute->steps()
            ->whereDoesntHave('dependentSteps')
            ->sum('cumulative_quantity_completed');
    }

    /**
     * Get detailed Work In Progress breakdown by step.
     */
    public function getDetailedWorkInProgressAttribute(): array
    {
        if (! $this->manufacturingRoute) {
            return [];
        }

        $steps = $this->manufacturingRoute->steps()
            ->with('dependentSteps')
            ->get();

        $wipByStep = [];
        $cumulativeIn = 0;

        foreach ($steps as $step) {
            $cumulativeIn += $step->cumulative_quantity_completed;
            $dependentCompleted = $step->dependentSteps->sum('cumulative_quantity_completed');

            $wipByStep[] = [
                'step_id' => $step->id,
                'step_name' => $step->name,
                'cumulative_in' => $cumulativeIn,
                'cumulative_out' => $dependentCompleted,
                'wip_at_step' => max(0, $cumulativeIn - $dependentCompleted),
            ];
        }

        return $wipByStep;
    }

    /**
     * Check if order can be cancelled.
     * Draft orders should be deleted, not cancelled.
     */
    public function canBeCancelled(): bool
    {
        return ! in_array($this->status, ['draft', 'completed', 'cancelled']);
    }

    /**
     * Check if order can be planned.
     *
     * Requirements for planning:
     * 1. Order must be in draft status
     * 2. Must have a manufacturing route
     * 3. Route must have at least one step
     * 4. All internal steps must have work cells assigned
     * 5. All external steps must have manufacturers assigned
     */
    public function canBePlanned(): bool
    {
        // Order must be in draft status
        if ($this->status !== 'draft') {
            return false;
        }

        // Must have a manufacturing route
        if (! $this->manufacturingRoute) {
            return false;
        }

        // Route must have at least one step
        $stepsCount = $this->manufacturingRoute->steps()->count();
        if ($stepsCount === 0) {
            return false;
        }

        // All internal steps must have work cells assigned
        $internalStepsWithoutWorkCell = $this->manufacturingRoute->steps()
            ->where('execution_location', 'internal')
            ->whereNull('work_cell_id')
            ->count();

        if ($internalStepsWithoutWorkCell > 0) {
            return false;
        }

        // All external steps must have manufacturers assigned
        $externalStepsWithoutManufacturer = $this->manufacturingRoute->steps()
            ->where('execution_location', 'external')
            ->whereNull('manufacturer_id')
            ->count();

        if ($externalStepsWithoutManufacturer > 0) {
            return false;
        }

        return true;
    }

    /**
     * Check if order can be scheduled.
     */
    public function canBeScheduled(): bool
    {
        // Order must be in planned status
        return $this->status === 'planned';
    }

    /**
     * Check if order can be put on hold.
     */
    public function canBePutOnHold(): bool
    {
        // Order must be in progress
        return $this->status === 'in_progress';
    }

    /**
     * Check if order can be resumed from hold.
     */
    public function canBeResumed(): bool
    {
        // Order must be on hold
        return $this->status === 'on_hold';
    }

    /**
     * Check if order can start production.
     */
    public function canStartProduction(): bool
    {
        // Order must be released
        if ($this->status !== 'released') {
            return false;
        }

        // Check if execution dependencies are met
        return true; // Manufacturing orders can always start - dependencies are at step level now
    }

    /**
     * Get the created by user (alias for createdBy relationship).
     */
    public function getCreatedByUserAttribute()
    {
        return $this->createdBy;
    }

    /**
     * Get the has_route attribute.
     * Checks if this order has a manufacturing route.
     */
    public function getHasRouteAttribute(): bool
    {
        // If relationship is already loaded, check without query
        if ($this->relationLoaded('manufacturingRoute')) {
            return $this->manufacturingRoute !== null;
        }

        // Otherwise, use exists() which is a single query
        return $this->manufacturingRoute()->exists();
    }

    /**
     * Get the current step in the manufacturing process.
     * Returns the first non-completed step in sequence.
     */
    public function getCurrentStep()
    {
        if (! $this->has_route) {
            return null;
        }

        return $this->manufacturingRoute->steps()
            ->whereNotIn('status', ['completed', 'skipped', 'cancelled'])
            ->first();
    }

    /**
     * Get the current available step for a specific work cell.
     * Returns the step that is ready to be executed at the given work cell.
     */
    public function getCurrentStepForWorkCell($workCellId)
    {
        if (! $this->has_route) {
            return null;
        }

        // Get all steps for this work cell that aren't completed
        $stepsQuery = $this->manufacturingRoute->steps()
            ->where('work_cell_id', $workCellId)
            ->whereNotIn('status', ['completed', 'skipped', 'cancelled'])
            ->with(['dependency']);

        $steps = $stepsQuery->get();

        // Find the first step that can actually be started
        foreach ($steps as $step) {
            // Check if this step is blocked by its dependencies
            if ($step->depends_on_step_id) {
                $dependency = $step->dependency;
                if ($dependency && ! in_array($dependency->status, ['completed', 'skipped', 'cancelled'])) {
                    continue; // This step is not ready yet
                }
            }

            // Check if the step's dependencies are met
            if ($step->canStart()) {
                return $step;
            }
        }

        return null;
    }

    /**
     * Check if this order has any quality check steps.
     */
    public function hasQualityChecks(): bool
    {
        if (! $this->has_route) {
            return false;
        }

        return $this->manufacturingRoute->steps()
            ->where('step_type', 'quality_check')
            ->exists();
    }

    /**
     * Get the parent order.
     * Alias for the parent relationship.
     */
    public function getParentOrderAttribute()
    {
        return $this->parent;
    }

    /**
     * Get the route relationship.
     * Alias for manufacturingRoute relationship.
     */
    public function getRouteAttribute()
    {
        return $this->manufacturingRoute;
    }

    /**
     * Check if production can be reported on this order.
     */
    public function canReportProduction(): bool
    {
        return in_array($this->status, ['released', 'in_progress'])
            && ! $this->is_completed
            && ! $this->is_cancelled;
    }

    /**
     * Check if this order has an active route with steps.
     */
    public function hasActiveRoute(): bool
    {
        return $this->manufacturingRoute
            && $this->manufacturingRoute->steps()->count() > 0;
    }

    /**
     * Check if order should be auto-completed based on child orders.
     */
    public function checkAutoCompletion(): void
    {
        // If order has routing steps, it should not auto-complete based on children
        // It will be completed when all routing steps are completed
        if ($this->hasActiveRoute()) {
            return;
        }

        if (! $this->auto_complete_on_children) {
            return;
        }

        // Check if all child orders are completed
        $allChildrenCompleted = $this->children()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->count() === 0;

        if ($allChildrenCompleted && $this->children()->exists()) {
            $this->update([
                'status' => 'completed',
                'actual_end_date' => now(),
                'quantity_completed' => $this->quantity,
            ]);
        }
    }

    /**
     * Increment the completed child orders count and check if dependent steps can start.
     *
     * Called when a child manufacturing order is completed to notify the parent order.
     * This triggers dependency checks on parent order steps that may be waiting for children.
     */
    public function incrementCompletedChildren(): void
    {
        // Recalculate from database to ensure accuracy (prevents double-increment issues)
        $actualCompletedCount = $this->children()
            ->where('status', 'completed')
            ->count();

        // Only update if the count changed
        if ($this->completed_child_orders_count !== $actualCompletedCount) {
            $this->completed_child_orders_count = $actualCompletedCount;
            $this->saveQuietly(); // Use saveQuietly to avoid triggering observers recursively
        }

        // If parent order is not active, no need to check steps
        if (! in_array($this->status, ['released', 'in_progress'])) {
            return;
        }

        // Check if any pending steps can now be queued due to child order dependencies being met
        $this->manufacturingRoute?->steps()
            ->where('status', 'pending')
            ->with(['manufacturingRoute.manufacturingOrder'])
            ->each(function ($step) {
                if ($step->canStart()) {
                    $step->moveToQueued();
                }
            });
    }

    /**
     * Get the is_completed attribute.
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Get the is_cancelled attribute.
     */
    public function getIsCancelledAttribute(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Check if this order has started production.
     * An order is considered started if it has an actual start date
     * or if any of its manufacturing steps have executions.
     */
    public function hasStartedProduction(): bool
    {
        // Check if order has actual_start_date
        if ($this->actual_start_date) {
            return true;
        }

        // Check if any steps have executions
        // Use the eager-loaded exists attribute if available to avoid N+1 queries
        if (isset($this->has_steps_with_executions)) {
            return $this->has_steps_with_executions;
        }

        // Fallback to query if not eager-loaded (e.g., when called outside planning view)
        if ($this->manufacturingRoute) {
            return $this->manufacturingRoute->steps()
                ->whereHas('executions')
                ->exists();
        }

        return false;
    }

    /**
     * Check if this order's status can be reverted.
     * Orders can only be reverted if they haven't started production
     * and are not in a terminal state (completed/cancelled).
     */
    public function canRevertStatus(): bool
    {
        // Can't revert if order has started production
        if ($this->hasStartedProduction()) {
            return false;
        }

        // Can't revert completed or cancelled orders
        if (in_array($this->status, ['completed', 'cancelled'])) {
            return false;
        }

        return true;
    }

    /**
     * Backward compatibility accessor for old column name.
     */
    public function getUnitOfMeasureAttribute()
    {
        return $this->unit_of_measure_code;
    }

    /**
     * Backward compatibility mutator for old column name.
     */
    public function setUnitOfMeasureAttribute($value)
    {
        $this->attributes['unit_of_measure_code'] = $value;
    }
}
