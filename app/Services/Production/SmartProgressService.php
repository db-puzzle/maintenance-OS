<?php

namespace App\Services\Production;

use App\Jobs\Production\BatchUpdateSmartProgress;
use App\Jobs\Production\UpdateSmartProgress;
use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SmartProgressService
{
    /**
     * Update smart progress for a single order.
     *
     * @param ManufacturingOrder $order
     * @param bool $propagateToParent Whether to update parent orders
     * @return float The calculated progress
     */
    public function updateProgress(ManufacturingOrder $order, bool $propagateToParent = true): float
    {
        try {
            // Calculate progress
            $progress = $order->calculateSmartProgress(false);
            
            // If we should propagate and this order has a parent
            if ($propagateToParent && $order->parent_id) {
                // Queue parent update with slight delay to debounce
                UpdateSmartProgress::dispatch($order->parent)
                    ->delay(now()->addSeconds(5))
                    ->onQueue('low');
            }
            
            return $progress;
        } catch (\Exception $e) {
            Log::error('Failed to update smart progress', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            
            return 0;
        }
    }
    
    /**
     * Batch update smart progress for multiple orders.
     *
     * @param Collection|array $orderIds
     * @return int Number of orders updated
     */
    public function batchUpdateProgress($orderIds): int
    {
        if ($orderIds instanceof Collection) {
            $orderIds = $orderIds->pluck('id')->toArray();
        }
        
        $updated = 0;
        
        // Process in chunks to avoid memory issues
        foreach (array_chunk($orderIds, 50) as $chunk) {
            $orders = ManufacturingOrder::whereIn('id', $chunk)
                ->withFullProgress()
                ->get();
            
            foreach ($orders as $order) {
                $this->updateProgress($order, false);
                $updated++;
            }
        }
        
        return $updated;
    }
    
    /**
     * Find and update all orders with stale progress.
     *
     * @param int $staleHours Orders with progress older than this many hours
     * @return int Number of orders updated
     */
    public function updateStaleProgress(int $staleHours = 24): int
    {
        $staleOrders = ManufacturingOrder::withStaleProgress($staleHours)
            ->pluck('id');
        
        if ($staleOrders->isEmpty()) {
            return 0;
        }
        
        // Dispatch batch job
        BatchUpdateSmartProgress::dispatch($staleOrders->toArray())
            ->onQueue('low');
        
        return $staleOrders->count();
    }
    
    /**
     * Recalculate progress for an entire hierarchy starting from root.
     *
     * @param ManufacturingOrder $rootOrder
     * @return array Progress breakdown
     */
    public function recalculateHierarchy(ManufacturingOrder $rootOrder): array
    {
        // Find the actual root if this isn't it
        $root = $rootOrder;
        while ($root->parent_id) {
            $root = $root->parent;
        }
        
        // Load full hierarchy
        $root->load(['children' => function ($query) {
            $query->withFullProgress();
        }]);
        
        // Calculate from bottom up
        $breakdown = $this->calculateHierarchyBottomUp($root);
        
        return $breakdown;
    }
    
    /**
     * Calculate hierarchy progress from bottom up.
     *
     * @param ManufacturingOrder $order
     * @return array
     */
    protected function calculateHierarchyBottomUp(ManufacturingOrder $order): array
    {
        $breakdown = [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'progress' => 0,
            'children' => []
        ];
        
        // Process children first (bottom-up)
        if ($order->children->isNotEmpty()) {
            foreach ($order->children as $child) {
                $childBreakdown = $this->calculateHierarchyBottomUp($child);
                $breakdown['children'][] = $childBreakdown;
            }
        }
        
        // Now calculate this order's progress
        $progress = $order->calculateSmartProgress(false);
        $breakdown['progress'] = $progress;
        $breakdown['work_units'] = $order->getWorkUnitsBreakdown();
        
        return $breakdown;
    }
    
    /**
     * Get all orders affected by a step update.
     *
     * @param int $orderId
     * @return Collection
     */
    public function getAffectedOrders(int $orderId): Collection
    {
        // Use recursive CTE to find all ancestors
        $results = DB::select("
            WITH RECURSIVE ancestors AS (
                -- Start with the given order
                SELECT id, parent_id
                FROM manufacturing_orders
                WHERE id = ?
                
                UNION ALL
                
                -- Recursively get all ancestors
                SELECT mo.id, mo.parent_id
                FROM manufacturing_orders mo
                INNER JOIN ancestors a ON mo.id = a.parent_id
            )
            SELECT DISTINCT id FROM ancestors
        ", [$orderId]);
        
        return collect($results)->pluck('id');
    }
    
    /**
     * Invalidate progress cache for order and its ancestors.
     *
     * @param ManufacturingOrder $order
     * @return void
     */
    public function invalidateProgressCache(ManufacturingOrder $order): void
    {
        // Invalidate this order
        $order->invalidateSmartProgress();
        
        // Clear any additional caches
        Cache::tags(['manufacturing_orders', 'progress'])
            ->forget("mo_progress_{$order->id}");
        
        // Queue recalculation
        UpdateSmartProgress::dispatch($order)
            ->delay(now()->addSeconds(10))
            ->onQueue('low');
    }
    
    /**
     * Get progress statistics for dashboard.
     *
     * @return array
     */
    public function getProgressStatistics(): array
    {
        $stats = [
            'total_orders' => ManufacturingOrder::count(),
            'stale_progress_count' => ManufacturingOrder::withStaleProgress()->count(),
            'average_progress' => ManufacturingOrder::avg('smart_progress_percentage') ?? 0,
            'orders_by_progress' => []
        ];
        
        // Group orders by progress ranges
        $ranges = [
            '0-25' => [0, 25],
            '26-50' => [26, 50],
            '51-75' => [51, 75],
            '76-99' => [76, 99],
            '100' => [100, 100]
        ];
        
        foreach ($ranges as $label => [$min, $max]) {
            $stats['orders_by_progress'][$label] = ManufacturingOrder::whereBetween('smart_progress_percentage', [$min, $max])
                ->count();
        }
        
        return $stats;
    }
    
    /**
     * Optimize progress calculation for large hierarchies.
     *
     * @param int $maxDepth Maximum hierarchy depth to process
     * @return void
     */
    public function optimizeHierarchies(int $maxDepth = 10): void
    {
        // Find deep hierarchies that might benefit from optimization
        $deepHierarchies = DB::select("
            WITH RECURSIVE hierarchy_depth AS (
                SELECT id, parent_id, 0 as depth
                FROM manufacturing_orders
                WHERE parent_id IS NULL
                
                UNION ALL
                
                SELECT mo.id, mo.parent_id, hd.depth + 1
                FROM manufacturing_orders mo
                JOIN hierarchy_depth hd ON mo.parent_id = hd.id
                WHERE hd.depth < ?
            )
            SELECT id, MAX(depth) as max_depth
            FROM hierarchy_depth
            GROUP BY id
            HAVING MAX(depth) >= ?
        ", [$maxDepth, $maxDepth - 2]);
        
        foreach ($deepHierarchies as $hierarchy) {
            Log::warning('Deep hierarchy detected', [
                'root_order_id' => $hierarchy->id,
                'depth' => $hierarchy->max_depth
            ]);
        }
    }
}
