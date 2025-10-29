<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingStepExecution;
use Illuminate\Support\Facades\DB;

class ManufacturingStepExecutionService
{
    /**
     * Report progress on a step execution with photos.
     */
    public function reportProgress(
        ManufacturingStepExecution $execution,
        array $data,
        array $photos = []
    ): ManufacturingStepExecution {
        DB::transaction(function () use ($execution, $data, $photos) {
            // Update execution quantities and notes
            $execution->update([
                'quantity_completed' => $execution->quantity_completed + ($data['quantity_completed'] ?? 0),
                'quantity_scrapped' => $execution->quantity_scrapped + ($data['quantity_scrapped'] ?? 0),
                'production_notes' => $data['notes'] ?? null,
                'scrap_reason' => $data['scrap_reason'] ?? null,
                'time_spent_minutes' => $data['time_spent'] ?? null,
            ]);

            // Update cumulative quantities on the step
            $step = $execution->manufacturingStep;
            $step->update([
                'cumulative_quantity_completed' => $step->cumulative_quantity_completed + ($data['quantity_completed'] ?? 0),
                'cumulative_quantity_scrapped' => $step->cumulative_quantity_scrapped + ($data['quantity_scrapped'] ?? 0),
            ]);

            // Handle photo uploads (max 3)
            if (! empty($photos)) {
                $existingPhotos = $execution->getMedia('step_photos')->count();
                $photosToAdd = array_slice($photos, 0, max(0, 3 - $existingPhotos));

                foreach ($photosToAdd as $photo) {
                    $execution->addMediaWithDiskSelection($photo, 'step_photos');
                }

                $execution->update([
                    'photo_count' => $execution->getMedia('step_photos')->count(),
                    'last_photo_at' => now(),
                ]);
            }

            // Check if step should be marked complete
            if ($data['mark_complete'] ?? false) {
                $this->completeStepExecution($execution);
            }

            // Log activity
            activity()
                ->performedOn($execution)
                ->causedBy(auth()->user())
                ->withProperties([
                    'quantity_completed' => $data['quantity_completed'] ?? 0,
                    'quantity_scrapped' => $data['quantity_scrapped'] ?? 0,
                    'time_spent_minutes' => $data['time_spent'] ?? null,
                    'photos_added' => count($photos),
                ])
                ->log('Step progress reported');
        });

        return $execution->fresh();
    }

    /**
     * Complete a step execution.
     */
    private function completeStepExecution(ManufacturingStepExecution $execution): void
    {
        $execution->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Update step status
        $step = $execution->manufacturingStep;
        $step->update([
            'status' => 'completed',
            'actual_end_time' => now(),
        ]);

        // Check and activate next step if gate requirements are met
        $this->checkAndActivateNextStep($execution);
    }

    /**
     * Check if next step can be activated based on gate requirements.
     */
    private function checkAndActivateNextStep(ManufacturingStepExecution $execution): void
    {
        $nextStep = $execution->manufacturingStep->getNextStep();

        if (! $nextStep || ! $execution->canProceedToNextStep()) {
            return;
        }

        // Create execution for next step if it doesn't exist
        $nextExecution = ManufacturingStepExecution::firstOrCreate([
            'manufacturing_step_id' => $nextStep->id,
            'manufacturing_order_id' => $execution->manufacturing_order_id,
        ], [
            'status' => 'queued',
            'work_cell_id' => $nextStep->work_cell_id,
        ]);

        // Update next step status
        $nextStep->update(['status' => 'queued']);
    }

    /**
     * Create a rework step after quality failure.
     */
    public function createReworkStep(\App\Models\Production\ManufacturingStep $originalStep, string $reason): \App\Models\Production\ManufacturingStep
    {
        $route = $originalStep->manufacturingRoute;

        // Find the highest display order
        $maxDisplayOrder = $route->steps()->max('display_order');

        // Create the rework step
        $reworkStep = \App\Models\Production\ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'display_order' => $maxDisplayOrder + 1,
            'step_type' => 'rework',
            'name' => "Rework: {$originalStep->name}",
            'description' => "Rework required due to: {$reason}",
            'work_cell_id' => $originalStep->work_cell_id,
            'status' => 'queued',
            'setup_time_seconds' => $originalStep->setup_time_seconds,
            'cycle_time_seconds' => $originalStep->cycle_time_seconds,
            'use_workcell_throughput' => $originalStep->use_workcell_throughput,
            'depends_on_step_id' => $originalStep->id,
            'dependency_start_condition' => 'completed',
            'original_step_id' => $originalStep->id,
            'rework_reason' => $reason,
        ]);

        // Update the original step's next step reference if it had one
        if ($originalStep->next_step_id) {
            $nextStep = \App\Models\Production\ManufacturingStep::find($originalStep->next_step_id);
            if ($nextStep) {
                $nextStep->update(['depends_on_step_id' => $reworkStep->id]);
            }
            $reworkStep->update(['next_step_id' => $originalStep->next_step_id]);
        }

        return $reworkStep;
    }
}
