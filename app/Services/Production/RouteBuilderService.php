<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingRoute;
use Illuminate\Support\Facades\DB;

class RouteBuilderService
{
    /**
     * Apply a template to a manufacturing order
     */
    public function applyTemplateToOrder(ManufacturingOrder $order, ManufacturingRoute $template): ManufacturingRoute
    {
        return DB::transaction(function () use ($order, $template) {
            // Delete existing route if any
            if ($order->manufacturingRoute) {
                $order->manufacturingRoute->delete();
            }

            // Create new route
            $route = ManufacturingRoute::create([
                'manufacturing_order_id' => $order->id,
                'name' => $template->name,
                'description' => $template->description,
                'template_id' => $template->id,
            ]);

            // Copy steps from template
            foreach ($template->steps as $templateStep) {
                $route->steps()->create([
                    'step_number' => $templateStep->step_number,
                    'display_order' => $templateStep->display_order,
                    'name' => $templateStep->name,
                    'description' => $templateStep->description,
                    'work_cell_id' => $templateStep->work_cell_id,
                    'setup_time_minutes' => $templateStep->setup_time_minutes,
                    'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                    'step_type' => $templateStep->step_type,
                    'status' => 'pending',
                ]);
            }

            return $route;
        });
    }

    /**
     * Copy route from one order to another
     */
    public function copyRoute(ManufacturingOrder $sourceOrder, ManufacturingOrder $targetOrder): ?ManufacturingRoute
    {
        if (!$sourceOrder->manufacturingRoute) {
            return null;
        }

        return DB::transaction(function () use ($sourceOrder, $targetOrder) {
            // Delete existing route if any
            if ($targetOrder->manufacturingRoute) {
                $targetOrder->manufacturingRoute->delete();
            }

            // Create new route
            $sourceRoute = $sourceOrder->manufacturingRoute;
            $route = ManufacturingRoute::create([
                'manufacturing_order_id' => $targetOrder->id,
                'name' => $sourceRoute->name . ' (Copy)',
                'description' => $sourceRoute->description,
                'template_id' => $sourceRoute->template_id,
            ]);

            // Copy steps
            foreach ($sourceRoute->steps as $step) {
                $route->steps()->create([
                    'step_number' => $step->step_number,
                    'display_order' => $step->display_order,
                    'name' => $step->name,
                    'description' => $step->description,
                    'work_cell_id' => $step->work_cell_id,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'step_type' => $step->step_type,
                    'status' => 'pending',
                ]);
            }

            return $route;
        });
    }

    /**
     * Calculate route metrics
     */
    public function calculateRouteMetrics(ManufacturingRoute $route): array
    {
        $steps = $route->steps;
        
        $totalSetupTime = $steps->sum('setup_time_minutes');
        $totalCycleTime = $steps->sum('cycle_time_minutes');
        $totalTime = $totalSetupTime + $totalCycleTime;
        
        $configuredSteps = $steps->filter(fn($step) => $step->work_cell_id !== null)->count();
        $requiredSteps = $steps->filter(fn($step) => $step->is_required)->count();
        
        return [
            'total_steps' => $steps->count(),
            'configured_steps' => $configuredSteps,
            'required_steps' => $requiredSteps,
            'total_setup_time' => $totalSetupTime,
            'total_cycle_time' => $totalCycleTime,
            'total_time' => $totalTime,
            'is_complete' => $configuredSteps === $steps->count() && $steps->count() > 0,
            'completion_percentage' => $steps->count() > 0 ? round(($configuredSteps / $steps->count()) * 100) : 0,
        ];
    }

    /**
     * Validate route configuration
     */
    public function validateRoute(ManufacturingRoute $route): array
    {
        $errors = [];
        $warnings = [];
        
        // Check if route has steps
        if ($route->steps->count() === 0) {
            $errors[] = 'Route has no steps configured.';
        }
        
        // Check if all required steps have work cells
        $requiredStepsWithoutWorkCell = $route->steps
            ->filter(fn($step) => $step->is_required && !$step->work_cell_id)
            ->count();
            
        if ($requiredStepsWithoutWorkCell > 0) {
            $errors[] = "{$requiredStepsWithoutWorkCell} required step(s) do not have work cells assigned.";
        }
        
        // Check for duplicate sequences
        $sequences = $route->steps->pluck('sequence')->toArray();
        if (count($sequences) !== count(array_unique($sequences))) {
            $errors[] = 'Route has duplicate sequence numbers.';
        }
        
        // Check for gaps in sequence
        if ($route->steps->count() > 0) {
            $expectedSequences = range(1, $route->steps->count());
            $actualSequences = $route->steps->pluck('sequence')->sort()->values()->toArray();
            if ($expectedSequences !== $actualSequences) {
                $warnings[] = 'Route has gaps in sequence numbers.';
            }
        }
        
        // Check for missing time estimates
        $stepsWithoutTime = $route->steps
            ->filter(fn($step) => !$step->setup_time_minutes && !$step->cycle_time_minutes)
            ->count();
            
        if ($stepsWithoutTime > 0) {
            $warnings[] = "{$stepsWithoutTime} step(s) do not have time estimates.";
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }
}
