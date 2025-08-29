<?php

namespace App\Traits;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait SmartProgressCalculator
{
    /**
     * Calculate smart progress based on work units across hierarchy.
     *
     * @param bool $useCache Whether to use cached value if available
     * @return float Progress percentage (0-100)
     */
    public function calculateSmartProgress(bool $useCache = true): float
    {
        // Check cache first if enabled
        if ($useCache && $this->isProgressCacheFresh()) {
            return $this->smart_progress_percentage;
        }

        try {
            $expectedUnits = $this->calculateExpectedWorkUnits();
            $completedUnits = $this->calculateCompletedWorkUnits();
            
            if ($expectedUnits == 0) {
                return $this->status === 'completed' ? 100.0 : 0.0;
            }
            
            $progress = round(($completedUnits / $expectedUnits) * 100, 2);
            
            // Ensure progress is within bounds
            $progress = max(0, min(100, $progress));
            
            // Cache the result
            $this->cacheSmartProgress($progress);
            
            return $progress;
        } catch (\Exception $e) {
            Log::error('Smart progress calculation failed', [
                'order_id' => $this->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Fallback to simple progress
            return $this->getSimpleProgressPercentage();
        }
    }
    
    /**
     * Calculate expected work units for this order and its hierarchy.
     *
     * @return int Total expected work units
     */
    protected function calculateExpectedWorkUnits(): int
    {
        $units = 0;
        
        // This order's work units
        if ($this->has_route) {
            // Load steps count if not already loaded
            if (!$this->relationLoaded('manufacturingRoute')) {
                $this->load('manufacturingRoute.steps');
            }
            
            $stepCount = $this->manufacturingRoute->steps->count();
            $units += $this->quantity * $stepCount;
        } else {
            // Orders without routes count as single step
            $units += $this->quantity;
        }
        
        // Child orders' work units (recursive)
        if ($this->child_orders_count > 0) {
            // Eager load children with their routes and steps
            if (!$this->relationLoaded('children')) {
                $this->load(['children.manufacturingRoute.steps']);
            }
            
            foreach ($this->children as $child) {
                $units += $child->calculateExpectedWorkUnits();
            }
        }
        
        return $units;
    }
    
    /**
     * Calculate completed work units for this order and its hierarchy.
     *
     * @return float Total completed work units
     */
    protected function calculateCompletedWorkUnits(): float
    {
        $units = 0;
        
        // This order's completed units
        if ($this->has_route) {
            // Sum cumulative quantity completed across all steps
            if (!$this->relationLoaded('manufacturingRoute.steps')) {
                $this->load('manufacturingRoute.steps');
            }
            
            $units += $this->manufacturingRoute->steps->sum('cumulative_quantity_completed');
        } else {
            // Orders without routes use quantity_completed
            $units += $this->quantity_completed;
        }
        
        // Child orders' completed units (recursive)
        if ($this->child_orders_count > 0) {
            if (!$this->relationLoaded('children')) {
                $this->load(['children.manufacturingRoute.steps']);
            }
            
            foreach ($this->children as $child) {
                $units += $child->calculateCompletedWorkUnits();
            }
        }
        
        return $units;
    }
    
    /**
     * Check if cached progress is still fresh.
     *
     * @return bool
     */
    protected function isProgressCacheFresh(): bool
    {
        if (!$this->progress_calculated_at) {
            return false;
        }
        
        // Consider cache fresh if calculated within last hour
        return $this->progress_calculated_at->gt(now()->subHour());
    }
    
    /**
     * Cache the calculated smart progress.
     *
     * @param float $progress
     * @return void
     */
    protected function cacheSmartProgress(float $progress): void
    {
        $this->smart_progress_percentage = $progress;
        $this->progress_calculated_at = now();
        
        // Save without triggering events to avoid recursion
        $this->saveQuietly();
    }
    
    /**
     * Get simple progress percentage (fallback).
     *
     * @return float
     */
    protected function getSimpleProgressPercentage(): float
    {
        if ($this->quantity == 0) {
            return 100.0;
        }
        
        return round(($this->quantity_completed / $this->quantity) * 100, 2);
    }
    
    /**
     * Invalidate smart progress cache for this order and ancestors.
     *
     * @return void
     */
    public function invalidateSmartProgress(): void
    {
        // Clear this order's cache
        $this->progress_calculated_at = null;
        $this->saveQuietly();
        
        // Invalidate parent's cache
        if ($this->parent_id) {
            $this->parent->invalidateSmartProgress();
        }
        
        // Clear any additional caches
        Cache::forget("mo_progress_{$this->id}");
    }
    
    /**
     * Calculate smart progress using database query (more efficient for large hierarchies).
     *
     * @return float
     */
    public function calculateSmartProgressViaQuery(): float
    {
        $result = DB::selectOne("
            WITH RECURSIVE mo_hierarchy AS (
                -- Base case: start with this order
                SELECT 
                    mo.id,
                    mo.parent_id,
                    mo.quantity,
                    mo.quantity_completed,
                    mo.status,
                    0 as level
                FROM manufacturing_orders mo
                WHERE mo.id = ?
                
                UNION ALL
                
                -- Recursive case: get all children
                SELECT 
                    mo.id,
                    mo.parent_id,
                    mo.quantity,
                    mo.quantity_completed,
                    mo.status,
                    h.level + 1
                FROM manufacturing_orders mo
                JOIN mo_hierarchy h ON mo.parent_id = h.id
            ),
            work_units AS (
                SELECT 
                    mh.id,
                    mh.quantity * COALESCE(COUNT(ms.id), 1) as expected_units,
                    COALESCE(SUM(ms.cumulative_quantity_completed), mh.quantity_completed) as completed_units
                FROM mo_hierarchy mh
                LEFT JOIN manufacturing_routes mr ON mr.manufacturing_order_id = mh.id
                LEFT JOIN manufacturing_steps ms ON ms.manufacturing_route_id = mr.id
                GROUP BY mh.id, mh.quantity, mh.quantity_completed, mh.status
            )
            SELECT 
                CASE 
                    WHEN SUM(expected_units) = 0 THEN 
                        CASE WHEN MAX(CASE WHEN id = ? THEN status END) = 'completed' THEN 100 ELSE 0 END
                    ELSE ROUND((SUM(completed_units)::numeric / SUM(expected_units)) * 100, 2)
                END as progress
            FROM work_units
        ", [$this->id, $this->id]);
        
        $progress = (float) $result->progress;
        
        // Cache the result
        $this->cacheSmartProgress($progress);
        
        return $progress;
    }
    
    /**
     * Get detailed work units breakdown.
     *
     * @return array
     */
    public function getWorkUnitsBreakdown(): array
    {
        $breakdown = [
            'order_id' => $this->id,
            'order_number' => $this->order_number,
            'expected_units' => 0,
            'completed_units' => 0,
            'children' => []
        ];
        
        // This order's units
        if ($this->has_route) {
            $stepCount = $this->manufacturingRoute->steps->count();
            $breakdown['expected_units'] = $this->quantity * $stepCount;
            $breakdown['completed_units'] = $this->manufacturingRoute->steps->sum('cumulative_quantity_completed');
            $breakdown['step_count'] = $stepCount;
        } else {
            $breakdown['expected_units'] = $this->quantity;
            $breakdown['completed_units'] = $this->quantity_completed;
            $breakdown['step_count'] = 1;
        }
        
        // Children breakdown
        if ($this->child_orders_count > 0) {
            foreach ($this->children as $child) {
                $childBreakdown = $child->getWorkUnitsBreakdown();
                $breakdown['children'][] = $childBreakdown;
                $breakdown['expected_units'] += $childBreakdown['expected_units'];
                $breakdown['completed_units'] += $childBreakdown['completed_units'];
            }
        }
        
        $breakdown['progress'] = $breakdown['expected_units'] > 0 
            ? round(($breakdown['completed_units'] / $breakdown['expected_units']) * 100, 2)
            : 0;
        
        return $breakdown;
    }
}
