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

        // Validate route structure before saving as template
        $route->validateForProduction();

        return DB::transaction(function () use ($route, $data) {
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
                'template_metadata' => $metadata,
                'created_by' => auth()->id(),
            ]);

            // Copy steps and preserve dependencies
            $stepMapping = [];
            $orderedSteps = \App\Models\Production\ManufacturingStep::getOrderedStepsForRoute($route->id);

            foreach ($orderedSteps as $step) {
                $newStep = $template->steps()->create([
                    'step_type' => $step->step_type,
                    'name' => $step->name,
                    'description' => $step->description,
                    'work_cell_id' => $step->work_cell_id,
                    'form_id' => $step->form_id,
                    'setup_time_seconds' => $step->setup_time_seconds,
                    'cycle_time_seconds' => $step->cycle_time_seconds,
                    'use_workcell_throughput' => $step->use_workcell_throughput ?? false,
                    'quality_check_mode' => $step->quality_check_mode,
                    'sampling_size' => $step->sampling_size,
                    // Pass raw attribute to avoid double-encoding
                    'quality_specifications' => $step->getAttributes()['quality_specifications'] ?? null,
                    'can_start_when_dependency' => $step->can_start_when_dependency ?? 'completed',
                    'is_template' => true,
                    'status' => null, // Templates don't have status
                    // Progressive flow fields
                    'dependency_start_condition' => $step->dependency_start_condition ?? 'completed',
                    'dependency_minimum_quantity' => $step->dependency_minimum_quantity,
                    'dependency_minimum_percentage' => $step->dependency_minimum_percentage,
                    // Child order dependency fields
                    'child_order_dependency_type' => $step->child_order_dependency_type ?? 'none',
                    'child_order_minimum_quantity' => $step->child_order_minimum_quantity,
                    // External step fields
                    'execution_location' => $step->execution_location ?? 'internal',
                    'manufacturer_id' => $step->manufacturer_id,
                    'expected_lead_time_days' => $step->expected_lead_time_days,
                ]);

                // Map old step ID to new step for dependency mapping
                $stepMapping[$step->id] = $newStep;
            }

            // Now update dependencies using the mapping
            foreach ($route->steps as $step) {
                if ($step->depends_on_step_id && isset($stepMapping[$step->depends_on_step_id])) {
                    $stepMapping[$step->id]->update([
                        'depends_on_step_id' => $stepMapping[$step->depends_on_step_id]->id,
                    ]);
                }
            }

            return $template;
        });
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
                'template_metadata' => $metadata,
                'created_by' => auth()->id(),
            ]);

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

        // Note: We no longer check if template is in use since we don't track template usage

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

        // Get the most recently updated active template for the category
        return ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->where('is_active', true)
            ->orderBy('updated_at', 'desc')
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
            ->orderBy('name')
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
            'total_uses' => 0, // We no longer track template usage
            'active_uses' => 0, // We no longer track template usage
            'last_used_at' => null, // We no longer track template usage
        ];
    }
}
