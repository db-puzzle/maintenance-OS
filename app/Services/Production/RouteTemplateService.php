<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use Illuminate\Support\Facades\DB;

class RouteTemplateService
{
    /**
     * Save a production route as a template.
     */
    public function saveAsTemplate(ManufacturingRoute $route, array $data): ManufacturingRoute
    {
        if ($route->is_template) {
            throw new \InvalidArgumentException('Route is already a template');
        }

        return DB::transaction(function () use ($route, $data) {
            // Determine version number
            $version = 1;
            if (isset($data['item_category_id'])) {
                $version = $this->getNextVersionForCategory($data['item_category_id']);
            }

            // Create template metadata
            $metadata = [
                'source_type' => 'production_route',
                'source_order_number' => $route->manufacturingOrder->order_number,
                'created_date' => now()->toIso8601String(),
                'created_by_user' => auth()->user()->name,
                'tags' => $data['tags'] ?? [],
                'notes' => $data['notes'] ?? null,
            ];

            // Create the template
            $template = ManufacturingRoute::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? $route->description,
                'is_template' => true,
                'is_active' => true,
                'item_category_id' => $data['item_category_id'] ?? null,
                'version' => $version,
                'is_latest_for_category' => true,
                'created_from_route_id' => $route->id,
                'template_metadata' => $metadata,
                'created_by' => auth()->id(),
            ]);

            // Mark previous versions as not latest
            if (isset($data['item_category_id'])) {
                ManufacturingRoute::templates()
                    ->where('item_category_id', $data['item_category_id'])
                    ->where('id', '!=', $template->id)
                    ->update(['is_latest_for_category' => false]);
            }

            // Copy steps
            foreach ($route->steps as $step) {
                $template->steps()->create([
                    'step_number' => $step->display_order / 10, // Convert display_order to step_number
                    'display_order' => $step->display_order,
                    'step_type' => $step->step_type,
                    'name' => $step->name,
                    'description' => $step->description,
                    'work_cell_id' => $step->work_cell_id,
                    'form_id' => $step->form_id,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'quality_check_mode' => $step->quality_check_mode,
                    'sampling_size' => $step->sampling_size,
                    'is_template' => true,
                    'status' => null, // Templates don't have status
                ]);
            }

            return $template;
        });
    }

    /**
     * Get next version number for a category.
     */
    protected function getNextVersionForCategory(?int $categoryId): int
    {
        if (! $categoryId) {
            return 1;
        }

        $maxVersion = ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->max('version');

        return ($maxVersion ?? 0) + 1;
    }

    /**
     * Copy a template to a manufacturing order, regardless of item type.
     */
    public function copyTemplateToOrder(ManufacturingRoute $template, ManufacturingOrder $order, bool $force = false): ManufacturingRoute
    {
        if (! $template->is_template) {
            throw new \InvalidArgumentException('Source must be a template');
        }

        // Check if order already has steps
        if (! $force && $order->manufacturingRoute && $order->manufacturingRoute->steps()->exists()) {
            throw new \Exception('Order already has route steps. Use force=true to replace.');
        }

        return DB::transaction(function () use ($template, $order) {
            // Get or create route
            $route = $order->manufacturingRoute;
            if (! $route) {
                $route = $order->manufacturingRoute()->create([
                    'item_id' => $order->item_id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'is_active' => true,
                    'is_template' => false,
                    'template_source_id' => $template->id,
                    'created_by' => auth()->id(),
                ]);
            } else {
                // Update existing route
                $route->update([
                    'template_source_id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                ]);

                // Clear existing steps if forcing
                if ($force) {
                    $route->steps()->delete();
                }
            }

            // Copy template steps
            $route->createFromTemplate($template);

            return $route;
        });
    }

    /**
     * Create a template from scratch.
     */
    public function createTemplate(array $data): ManufacturingRoute
    {
        return DB::transaction(function () use ($data) {
            // Determine version number
            $version = 1;
            if (isset($data['item_category_id'])) {
                $version = $this->getNextVersionForCategory($data['item_category_id']);
            }

            // Create template metadata
            $metadata = [
                'source_type' => 'manual',
                'created_date' => now()->toIso8601String(),
                'created_by_user' => auth()->user()->name,
                'tags' => $data['tags'] ?? [],
                'notes' => $data['notes'] ?? null,
            ];

            // Create the template
            $template = ManufacturingRoute::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_template' => true,
                'is_active' => true,
                'item_category_id' => $data['item_category_id'] ?? null,
                'version' => $version,
                'is_latest_for_category' => true,
                'template_metadata' => $metadata,
                'created_by' => auth()->id(),
            ]);

            // Mark previous versions as not latest
            if (isset($data['item_category_id'])) {
                ManufacturingRoute::templates()
                    ->where('item_category_id', $data['item_category_id'])
                    ->where('id', '!=', $template->id)
                    ->update(['is_latest_for_category' => false]);
            }

            return $template;
        });
    }

    /**
     * Update a template.
     */
    public function updateTemplate(ManufacturingRoute $template, array $data): ManufacturingRoute
    {
        if (! $template->is_template) {
            throw new \InvalidArgumentException('Route is not a template');
        }

        return DB::transaction(function () use ($template, $data) {
            // Update basic info
            $template->update([
                'name' => $data['name'] ?? $template->name,
                'description' => $data['description'] ?? $template->description,
                'is_active' => $data['is_active'] ?? $template->is_active,
            ]);

            // Update metadata if provided
            if (isset($data['tags']) || isset($data['notes'])) {
                $metadata = $template->template_metadata ?? [];
                if (isset($data['tags'])) {
                    $metadata['tags'] = $data['tags'];
                }
                if (isset($data['notes'])) {
                    $metadata['notes'] = $data['notes'];
                }
                $template->update(['template_metadata' => $metadata]);
            }

            return $template;
        });
    }

    /**
     * Delete a template.
     */
    public function deleteTemplate(ManufacturingRoute $template): bool
    {
        if (! $template->is_template) {
            throw new \InvalidArgumentException('Route is not a template');
        }

        // Check if template is in use
        if ($template->derivedRoutes()->exists()) {
            throw new \Exception('Cannot delete template that is in use by production routes');
        }

        return DB::transaction(function () use ($template) {
            // Delete steps first
            $template->steps()->delete();

            // Delete the template
            return $template->delete();
        });
    }

    /**
     * Find best template for an item category.
     */
    public function findBestTemplateForCategory(?int $categoryId): ?ManufacturingRoute
    {
        if (! $categoryId) {
            return null;
        }

        // First, try exact category match with latest version
        $template = ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->where('is_latest_for_category', true)
            ->where('is_active', true)
            ->first();

        if ($template) {
            return $template;
        }

        // Second, try any template for the category
        return ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->where('is_active', true)
            ->orderBy('version', 'desc')
            ->first();
    }

    /**
     * Get available templates for a category.
     */
    public function getTemplatesForCategory(?int $categoryId)
    {
        return ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->where('is_active', true)
            ->orderBy('version', 'desc')
            ->get();
    }

    /**
     * Get template usage statistics.
     */
    public function getTemplateUsageStats(ManufacturingRoute $template): array
    {
        if (! $template->is_template) {
            throw new \InvalidArgumentException('Route is not a template');
        }

        return [
            'total_uses' => $template->derivedRoutes()->count(),
            'active_uses' => $template->derivedRoutes()
                ->whereHas('manufacturingOrder', function ($q) {
                    $q->whereNotIn('status', ['completed', 'cancelled']);
                })
                ->count(),
            'last_used_at' => $template->derivedRoutes()
                ->orderBy('created_at', 'desc')
                ->first()
                ?->created_at,
        ];
    }
}
