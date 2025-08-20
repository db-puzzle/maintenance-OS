<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturingOrderDependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_order_id',
        'child_order_id',
        'dependency_type',
        'minimum_quantity',
        'minimum_percentage',
        'quantity_completed',
        'is_satisfied',
        'satisfied_at'
    ];

    protected $casts = [
        'minimum_quantity' => 'decimal:2',
        'minimum_percentage' => 'decimal:2',
        'quantity_completed' => 'decimal:2',
        'is_satisfied' => 'boolean',
        'satisfied_at' => 'datetime'
    ];

    /**
     * Get the parent manufacturing order.
     */
    public function parentOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'parent_order_id');
    }

    /**
     * Get the child manufacturing order.
     */
    public function childOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class, 'child_order_id');
    }

    /**
     * Update progress from child order completion.
     */
    public function updateProgress(float $additionalQuantity): void
    {
        $this->increment('quantity_completed', $additionalQuantity);

        // Check if dependency is now satisfied
        if ($this->shouldBeSatisfied()) {
            $this->update([
                'is_satisfied' => true,
                'satisfied_at' => now()
            ]);
        }
    }

    /**
     * Check if the dependency should be satisfied based on current progress.
     */
    protected function shouldBeSatisfied(): bool
    {
        if ($this->minimum_quantity) {
            return $this->quantity_completed >= $this->minimum_quantity;
        }

        if ($this->minimum_percentage) {
            $childTotal = $this->childOrder->quantity;
            if ($childTotal == 0) {
                return true; // No quantity required
            }
            $percentage = ($this->quantity_completed / $childTotal) * 100;
            return $percentage >= $this->minimum_percentage;
        }

        return false;
    }

    /**
     * Get the current completion percentage.
     */
    public function getCompletionPercentageAttribute(): float
    {
        $childTotal = $this->childOrder->quantity;
        if ($childTotal == 0) {
            return 100.0;
        }

        return round(($this->quantity_completed / $childTotal) * 100, 2);
    }

    /**
     * Check if this dependency blocks parent execution.
     */
    public function blocksExecution(): bool
    {
        return $this->dependency_type === 'required' && !$this->is_satisfied;
    }
}
