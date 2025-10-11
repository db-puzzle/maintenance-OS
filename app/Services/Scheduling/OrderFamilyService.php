<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OrderFamilyService
{
    /**
     * Get the top parent of an order (root of the family tree).
     */
    public function getTopParent(ManufacturingOrder $order): ManufacturingOrder
    {
        $current = $order;
        while ($current->parent_id !== null) {
            $current = $current->parent;
        }

        return $current;
    }

    /**
     * Get all family members for a given order.
     */
    public function getFamilyMembers(ManufacturingOrder $order): Collection
    {
        $topParent = $this->getTopParent($order);

        // Use the withHierarchy scope for efficient retrieval
        return ManufacturingOrder::withHierarchy($topParent->order_number)
            ->with([
                'manufacturingRoute.steps.workCell',
                'manufacturingRoute.steps.dependency',
                'children',
            ])
            ->get();
    }

    /**
     * Get all family members using a top parent.
     */
    public function getFamilyMembersFromTopParent(ManufacturingOrder $topParent): Collection
    {
        return ManufacturingOrder::withHierarchy($topParent->order_number)
            ->with([
                'manufacturingRoute.steps.workCell',
                'manufacturingRoute.steps.dependency',
                'children',
            ])
            ->get();
    }

    /**
     * Group orders by their families.
     */
    public function groupOrdersByFamily(Collection $orders): Collection
    {
        $families = collect();
        $processedOrderIds = [];

        foreach ($orders as $order) {
            // Skip if already processed as part of another family
            if (in_array($order->id, $processedOrderIds)) {
                continue;
            }

            // Get the family for this order
            $familyMembers = $this->getFamilyMembers($order);
            $topParent = $this->getTopParent($order);

            // Track all processed order IDs
            $processedOrderIds = array_merge(
                $processedOrderIds,
                $familyMembers->pluck('id')->toArray()
            );

            // Add family to collection
            $families->push([
                'top_parent' => $topParent,
                'members' => $familyMembers,
                'priority' => $topParent->priority,
                'total_orders' => $familyMembers->count(),
                'total_steps' => $this->countFamilySteps($familyMembers),
            ]);
        }

        // Sort families by priority (highest first)
        return $families->sortByDesc('priority')->values();
    }

    /**
     * Get the hierarchy level of an order (0 for top parent).
     */
    public function getHierarchyLevel(ManufacturingOrder $order): int
    {
        $level = 0;
        $current = $order;

        while ($current->parent_id !== null) {
            $level++;
            $current = $current->parent;
        }

        return $level;
    }

    /**
     * Get all ancestors of an order (from immediate parent to top).
     */
    public function getAncestors(ManufacturingOrder $order): Collection
    {
        $ancestors = collect();
        $current = $order;

        while ($current->parent_id !== null) {
            $current = $current->parent;
            $ancestors->push($current);
        }

        return $ancestors;
    }

    /**
     * Get all descendants of an order (all children, grandchildren, etc.).
     */
    public function getDescendants(ManufacturingOrder $order): Collection
    {
        // Use recursive CTE for efficient retrieval
        $descendants = DB::select('
            WITH RECURSIVE descendants AS (
                -- Start with direct children
                SELECT mo.*
                FROM manufacturing_orders mo
                WHERE mo.parent_id = ?
                
                UNION ALL
                
                -- Recursively get all descendants
                SELECT mo.*
                FROM manufacturing_orders mo
                INNER JOIN descendants d ON mo.parent_id = d.id
            )
            SELECT * FROM descendants
        ', [$order->id]);

        return ManufacturingOrder::hydrate($descendants);
    }

    /**
     * Check if two orders belong to the same family.
     */
    public function areInSameFamily(ManufacturingOrder $order1, ManufacturingOrder $order2): bool
    {
        $topParent1 = $this->getTopParent($order1);
        $topParent2 = $this->getTopParent($order2);

        return $topParent1->id === $topParent2->id;
    }

    /**
     * Get the inherited priority for an order (from its top parent).
     */
    public function getInheritedPriority(ManufacturingOrder $order): int
    {
        return $this->getTopParent($order)->priority;
    }

    /**
     * Count total steps in a family.
     */
    public function countFamilySteps(Collection $familyMembers): int
    {
        return $familyMembers->sum(function ($order) {
            return $order->manufacturingRoute ? $order->manufacturingRoute->steps->count() : 0;
        });
    }

    /**
     * Get all steps for a family in dependency order.
     */
    public function getFamilyStepsInOrder(Collection $familyMembers): Collection
    {
        $allSteps = collect();

        // Collect all steps from all orders in the family
        foreach ($familyMembers as $order) {
            if ($order->manufacturingRoute) {
                foreach ($order->manufacturingRoute->steps as $step) {
                    $step->order = $order; // Attach order reference
                    $allSteps->push($step);
                }
            }
        }

        // Sort by order hierarchy level and then by step display order
        return $allSteps->sortBy([
            function ($step) {
                return $this->getHierarchyLevel($step->order);
            },
            'display_order',
        ])->values();
    }

    /**
     * Validate that all dependencies in a family are internal.
     */
    public function validateFamilyDependencies(Collection $familyMembers): array
    {
        $errors = [];
        $familyStepIds = collect();
        $familyOrderIds = $familyMembers->pluck('id');

        // Collect all step IDs in the family
        foreach ($familyMembers as $order) {
            if ($order->manufacturingRoute) {
                $familyStepIds = $familyStepIds->merge(
                    $order->manufacturingRoute->steps->pluck('id')
                );
            }
        }

        // Check each step's dependencies
        foreach ($familyMembers as $order) {
            if (! $order->manufacturingRoute) {
                continue;
            }

            foreach ($order->manufacturingRoute->steps as $step) {
                // Check step dependencies
                if ($step->depends_on_step_id && ! $familyStepIds->contains($step->depends_on_step_id)) {
                    $errors[] = [
                        'type' => 'external_step_dependency',
                        'order' => $order->order_number,
                        'step' => $step->name,
                        'step_id' => $step->id,
                        'dependency_id' => $step->depends_on_step_id,
                    ];
                }
            }
        }

        return $errors;
    }

    /**
     * Get family statistics for scheduling.
     */
    public function getFamilyStatistics(Collection $familyMembers): array
    {
        $stats = [
            'total_orders' => $familyMembers->count(),
            'total_steps' => 0,
            'total_duration_minutes' => 0,
            'hierarchy_depth' => 0,
            'work_cells_required' => collect(),
            'earliest_requested_date' => null,
            'latest_requested_date' => null,
        ];

        foreach ($familyMembers as $order) {
            // Update hierarchy depth
            $level = $this->getHierarchyLevel($order);
            if ($level > $stats['hierarchy_depth']) {
                $stats['hierarchy_depth'] = $level;
            }

            // Update requested dates
            if ($order->requested_date) {
                if (! $stats['earliest_requested_date'] || $order->requested_date < $stats['earliest_requested_date']) {
                    $stats['earliest_requested_date'] = $order->requested_date;
                }
                if (! $stats['latest_requested_date'] || $order->requested_date > $stats['latest_requested_date']) {
                    $stats['latest_requested_date'] = $order->requested_date;
                }
            }

            // Process steps
            if ($order->manufacturingRoute) {
                foreach ($order->manufacturingRoute->steps as $step) {
                    $stats['total_steps']++;
                    $stats['total_duration_minutes'] += ($step->setup_time_minutes ?? 0) + ($step->cycle_time_minutes ?? 0);

                    if ($step->work_cell_id) {
                        $stats['work_cells_required']->push($step->work_cell_id);
                    }
                }
            }
        }

        $stats['work_cells_required'] = $stats['work_cells_required']->unique()->values()->toArray();

        return $stats;
    }
}
