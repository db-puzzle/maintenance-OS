<?php

namespace App\Services\Production;

use App\Models\Production\BomItem;
use App\Models\Production\ProductionRouting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class RoutingInheritanceService
{
    /**
     * Resolve routing for a BOM item.
     */
    public function resolveRouting(BomItem $item): ?ProductionRouting
    {
        // Check cache first
        $cacheKey = "routing.resolved.{$item->id}";
        
        return Cache::tags(['routing', "item-{$item->id}"])->remember(
            $cacheKey,
            3600,
            function () use ($item) {
                return $this->findRoutingForItem($item);
            }
        );
    }

    /**
     * Get effective routing steps for an item.
     */
    public function getEffectiveRouting(BomItem $item): Collection
    {
        $routing = $this->resolveRouting($item);
        
        if (!$routing) {
            return collect();
        }

        // Get the routing steps
        $steps = $routing->getEffectiveSteps();
        
        // Apply any item-specific overrides
        return $this->applyItemOverrides($item, $steps);
    }

    /**
     * Validate routing dependencies for an item.
     */
    public function validateRoutingDependencies(BomItem $item): array
    {
        $errors = [];
        
        // Check if item has routing (own or inherited)
        $itemRouting = $this->resolveRouting($item);
        
        if ($itemRouting) {
            // Check all children have routing before parent
            foreach ($item->children as $child) {
                $childRouting = $this->resolveRouting($child);
                
                if ($childRouting) {
                    // Check if child is complete
                    if (!$this->isRoutingComplete($child)) {
                        $errors[] = [
                            'type' => 'dependency',
                            'message' => "Child item {$child->item_number} must be completed before parent {$item->item_number}",
                            'child_item' => $child->item_number,
                            'parent_item' => $item->item_number,
                        ];
                    }
                }
            }
        }
        
        // Validate routing resources
        if ($itemRouting) {
            $resourceErrors = $this->validateRoutingResources($itemRouting);
            $errors = array_merge($errors, $resourceErrors);
        }
        
        return $errors;
    }

    /**
     * Check if all items in a BOM have routing.
     */
    public function validateBomRouting(int $bomVersionId): array
    {
        $items = BomItem::where('bom_version_id', $bomVersionId)->get();
        $missingRouting = [];
        
        foreach ($items as $item) {
            if (!$this->resolveRouting($item)) {
                $missingRouting[] = [
                    'item_id' => $item->id,
                    'item_number' => $item->item_number,
                    'item_name' => $item->name,
                    'level' => $item->level,
                ];
            }
        }
        
        return $missingRouting;
    }

    /**
     * Create inherited routing for an item.
     */
    public function createInheritedRouting(BomItem $item, ProductionRouting $parentRouting): ProductionRouting
    {
        return ProductionRouting::create([
            'bom_item_id' => $item->id,
            'routing_number' => $this->generateRoutingNumber($item),
            'name' => "Inherited: {$parentRouting->name}",
            'description' => "Inherited from parent routing {$parentRouting->routing_number}",
            'routing_type' => 'inherited',
            'parent_routing_id' => $parentRouting->id,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);
    }

    /**
     * Override inherited routing with custom routing.
     */
    public function overrideInheritedRouting(BomItem $item): ProductionRouting
    {
        $currentRouting = $item->routing;
        
        if (!$currentRouting || $currentRouting->routing_type !== 'inherited') {
            throw new \Exception('Item does not have inherited routing to override.');
        }

        // Create new defined routing
        $newRouting = ProductionRouting::create([
            'bom_item_id' => $item->id,
            'routing_number' => $this->generateRoutingNumber($item),
            'name' => "Custom routing for {$item->name}",
            'description' => "Overrides inherited routing",
            'routing_type' => 'defined',
            'parent_routing_id' => null,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        // Copy steps from inherited routing if desired
        if ($currentRouting->parent_routing_id) {
            $parentSteps = ProductionRouting::find($currentRouting->parent_routing_id)->steps;
            
            foreach ($parentSteps as $step) {
                $newStep = $step->replicate(['production_routing_id']);
                $newStep->production_routing_id = $newRouting->id;
                $newStep->save();
            }
        }

        // Deactivate old routing
        $currentRouting->update(['is_active' => false]);
        
        // Clear cache
        $this->clearRoutingCache($item);

        return $newRouting;
    }

    /**
     * Get routing inheritance tree for an item.
     */
    public function getInheritanceTree(BomItem $item): array
    {
        $tree = [];
        $current = $item;
        
        while ($current) {
            $routing = $current->routing;
            
            $tree[] = [
                'level' => $current->level,
                'item_id' => $current->id,
                'item_number' => $current->item_number,
                'item_name' => $current->name,
                'has_routing' => $routing !== null,
                'routing_type' => $routing?->routing_type,
                'routing_number' => $routing?->routing_number,
            ];
            
            if ($routing && $routing->routing_type === 'defined') {
                break; // Found defined routing, stop traversing
            }
            
            $current = $current->parent;
        }
        
        return $tree;
    }

    /**
     * Find routing for an item (checking inheritance).
     */
    protected function findRoutingForItem(BomItem $item): ?ProductionRouting
    {
        // Check if item has direct routing
        $routing = $item->routing()->active()->first();
        
        if ($routing) {
            return $routing;
        }
        
        // Check parent for routing
        if ($item->parent) {
            return $this->findRoutingForItem($item->parent);
        }
        
        return null;
    }

    /**
     * Apply item-specific overrides to routing steps.
     */
    protected function applyItemOverrides(BomItem $item, Collection $steps): Collection
    {
        // This is where you could apply item-specific modifications
        // For example, different cycle times based on quantity
        
        return $steps->map(function ($step) use ($item) {
            // Clone the step to avoid modifying the original
            $modifiedStep = clone $step;
            
            // Apply any item-specific modifications
            // Example: Adjust cycle time based on item properties
            if ($item->custom_attributes && isset($item->custom_attributes['cycle_time_multiplier'])) {
                $modifiedStep->cycle_time_minutes *= $item->custom_attributes['cycle_time_multiplier'];
            }
            
            return $modifiedStep;
        });
    }

    /**
     * Check if routing is complete for an item.
     */
    protected function isRoutingComplete(BomItem $item): bool
    {
        // This would check production executions
        // For now, return false as placeholder
        return false;
    }

    /**
     * Validate routing resources.
     */
    protected function validateRoutingResources(ProductionRouting $routing): array
    {
        $errors = [];
        
        foreach ($routing->steps as $step) {
            // Check work cell availability
            if (!$step->workCell || !$step->workCell->is_active) {
                $errors[] = [
                    'type' => 'resource',
                    'message' => "Work cell not available for step {$step->step_number}",
                    'routing_id' => $routing->id,
                    'step_number' => $step->step_number,
                ];
            }
            
            // Additional resource checks can be added here
        }
        
        return $errors;
    }

    /**
     * Generate routing number.
     */
    protected function generateRoutingNumber(BomItem $item): string
    {
        return 'RT-' . $item->item_number . '-' . time();
    }

    /**
     * Clear routing cache for an item.
     */
    protected function clearRoutingCache(BomItem $item): void
    {
        Cache::tags(['routing', "item-{$item->id}"])->flush();
        
        // Also clear parent items' cache
        $parent = $item->parent;
        while ($parent) {
            Cache::tags(['routing', "item-{$parent->id}"])->flush();
            $parent = $parent->parent;
        }
    }

    /**
     * Get all items using a specific routing.
     */
    public function getItemsUsingRouting(ProductionRouting $routing): Collection
    {
        $items = collect();
        
        // Direct usage
        $items->push($routing->bomItem);
        
        // Inherited usage
        $inheritedRoutings = ProductionRouting::where('parent_routing_id', $routing->id)
            ->with('bomItem')
            ->get();
            
        foreach ($inheritedRoutings as $inherited) {
            $items->push($inherited->bomItem);
        }
        
        return $items->filter()->unique('id');
    }
}