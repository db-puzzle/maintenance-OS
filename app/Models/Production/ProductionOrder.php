<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class ProductionOrder extends Model
{
    use HasFactory;

    public const STATUSES = [
        'draft' => 'Draft',
        'planned' => 'Planned',
        'released' => 'Released',
        'in_progress' => 'In Progress',
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
        'unit_of_measure',
        'status',
        'priority',
        'child_orders_count',
        'completed_child_orders_count',
        'auto_complete_on_children',
        'requested_date',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'source_type',
        'source_reference',
        'created_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'quantity_completed' => 'decimal:2',
        'quantity_scrapped' => 'decimal:2',
        'auto_complete_on_children' => 'boolean',
        'requested_date' => 'date',
        'planned_start_date' => 'datetime',
        'planned_end_date' => 'datetime',
        'actual_start_date' => 'datetime',
        'actual_end_date' => 'datetime',
    ];

    /**
     * Get the parent production order.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class, 'parent_id');
    }

    /**
     * Get the child production orders.
     */
    public function children(): HasMany
    {
        return $this->hasMany(ProductionOrder::class, 'parent_id');
    }

    /**
     * Get the manufacturing route for this order.
     */
    public function manufacturingRoute(): HasOne
    {
        return $this->hasOne(ManufacturingRoute::class);
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
        return $this->hasMany(ShipmentItem::class);
    }

    /**
     * Create child orders based on BOM items.
     */
    public function createChildOrders(): void
    {
        if (!$this->bill_of_material_id) {
            return;
        }
        
        $bomItems = $this->billOfMaterial->currentVersion->items;
        
        DB::transaction(function () use ($bomItems) {
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
        });
    }

    /**
     * Generate a unique order number for child orders.
     */
    protected function generateChildOrderNumber(BomItem $bomItem): string
    {
        $parentNumber = $this->order_number;
        $sequence = $this->children()->count() + 1;
        
        return sprintf('%s-%03d', $parentNumber, $sequence);
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
     * Check if order should auto-complete based on children.
     */
    public function checkAutoComplete(): void
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

    /**
     * Increment completed children count and check for auto-completion.
     */
    public function incrementCompletedChildren(): void
    {
        $this->increment('completed_child_orders_count');
        $this->checkAutoComplete();
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
     * Calculate total duration in minutes.
     */
    public function getTotalDurationAttribute()
    {
        if (!$this->actual_start_date || !$this->actual_end_date) {
            return null;
        }

        return $this->actual_start_date->diffInMinutes($this->actual_end_date);
    }

    /**
     * Get the progress percentage.
     */
    public function getProgressPercentageAttribute()
    {
        if ($this->quantity == 0) {
            return 100;
        }

        return round(($this->quantity_completed / $this->quantity) * 100, 2);
    }

    /**
     * Check if order can be released.
     */
    public function canBeReleased(): bool
    {
        return in_array($this->status, ['draft', 'planned']);
    }

    /**
     * Check if order can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return !in_array($this->status, ['completed', 'cancelled']);
    }
}