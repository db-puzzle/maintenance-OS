<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'product_id',
        'bill_of_material_id',
        'quantity',
        'unit_of_measure',
        'status',
        'priority',
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
        'requested_date' => 'date',
        'planned_start_date' => 'datetime',
        'planned_end_date' => 'datetime',
        'actual_start_date' => 'datetime',
        'actual_end_date' => 'datetime',
    ];

    /**
     * Get the product for this order.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
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
     * Scope for orders with a specific status.
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for active orders (not cancelled or completed).
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }

    /**
     * Scope for orders due within a date range.
     */
    public function scopeDueBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('requested_date', [$startDate, $endDate]);
    }

    /**
     * Scope for high priority orders.
     */
    public function scopeHighPriority($query)
    {
        return $query->where('priority', '>=', 80);
    }

    /**
     * Get the progress percentage of the order.
     */
    public function getProgressPercentageAttribute()
    {
        if ($this->status === 'completed') {
            return 100;
        }

        if ($this->status === 'cancelled') {
            return 0;
        }

        $totalSteps = $this->productionSchedules()->count();
        if ($totalSteps === 0) {
            return 0;
        }

        $completedSteps = $this->productionSchedules()
            ->where('status', 'completed')
            ->count();

        return round(($completedSteps / $totalSteps) * 100);
    }

    /**
     * Check if the order is overdue.
     */
    public function getIsOverdueAttribute()
    {
        return $this->requested_date && 
               $this->requested_date < now() && 
               !in_array($this->status, ['completed', 'cancelled']);
    }

    /**
     * Get the days until due (negative if overdue).
     */
    public function getDaysUntilDueAttribute()
    {
        if (!$this->requested_date) {
            return null;
        }

        return now()->diffInDays($this->requested_date, false);
    }

    /**
     * Release the order for production.
     */
    public function release()
    {
        if ($this->status !== 'planned') {
            throw new \Exception('Only planned orders can be released.');
        }

        $this->update([
            'status' => 'released',
            'actual_start_date' => now(),
        ]);

        // Update schedules to ready status
        $this->productionSchedules()
            ->where('status', 'scheduled')
            ->update(['status' => 'ready']);
    }

    /**
     * Complete the order.
     */
    public function complete()
    {
        $this->update([
            'status' => 'completed',
            'actual_end_date' => now(),
        ]);
    }

    /**
     * Cancel the order.
     */
    public function cancel()
    {
        $this->update(['status' => 'cancelled']);

        // Cancel all schedules
        $this->productionSchedules()
            ->whereIn('status', ['scheduled', 'ready'])
            ->update(['status' => 'delayed']);
    }

    /**
     * Generate a unique order number.
     */
    public static function generateOrderNumber()
    {
        $year = now()->format('Y');
        $lastOrder = static::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastOrder ? intval(substr($lastOrder->order_number, -5)) + 1 : 1;
        
        return sprintf('PO-%s-%05d', $year, $sequence);
    }
}