<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingStepExecution;
use App\Services\Production\ManufacturingStepExecutionService;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class StepExecutionController extends Controller
{
    private ManufacturingStepExecutionService $executionService;

    public function __construct(ManufacturingStepExecutionService $executionService)
    {
        $this->executionService = $executionService;
    }

    /**
     * Start a new execution for a step.
     */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'manufacturing_step_id' => 'required|exists:manufacturing_steps,id',
        ]);

        $order = \App\Models\Production\ManufacturingOrder::findOrFail($validated['manufacturing_order_id']);
        $step = \App\Models\Production\ManufacturingStep::findOrFail($validated['manufacturing_step_id']);

        // Verify the step belongs to this order
        if ($step->manufacturingRoute->manufacturing_order_id !== $order->id) {
            return back()->withErrors(['error' => 'Step does not belong to this order']);
        }

        // Check if user has permission for this work cell
        $this->authorize('executeInWorkCell', [$step, $step->workCell]);

        // Check if step can be started
        if ($step->status === 'completed') {
            return back()->withErrors(['error' => 'Step is already completed']);
        }

        if ($step->status === 'on_hold') {
            return back()->withErrors(['error' => 'Step is on hold']);
        }

        // Check if there's already an active execution
        $activeExecution = $step->executions()
            ->whereIn('status', ['in_progress', 'queued'])
            ->first();

        if ($activeExecution) {
            return back()->withErrors(['error' => 'Step already has an active execution']);
        }

        // Check dependencies
        if (! $step->canStart()) {
            // Get detailed dependency information
            $dependencyInfo = [];

            // Check step dependencies
            if ($step->depends_on_step_id) {
                $dependencyStep = $step->dependency;
                if ($dependencyStep && $dependencyStep->status !== 'completed') {
                    $dependencyInfo[] = "Previous step '{$dependencyStep->name}' must be completed first";
                }
            }

            // Check child order dependencies
            if ($step->depends_on_child_orders) {
                $incompleteChildOrders = $order->childOrders()
                    ->where('status', '!=', 'completed')
                    ->get();

                if ($incompleteChildOrders->count() > 0) {
                    $childOrderNumbers = $incompleteChildOrders->pluck('order_number')->join(', ');
                    $dependencyInfo[] = "Child orders must be completed first: {$childOrderNumbers}";
                }
            }

            return back()->withErrors([
                'error' => 'Dependencies not met: ' . implode(', ', $dependencyInfo),
            ]);
        }

        try {
            // Start the execution
            if ($step->status === 'in_progress') {
                // Step is already in progress (maybe from manual update), just create execution
                $execution = ManufacturingStepExecution::create([
                    'manufacturing_step_id' => $step->id,
                    'manufacturing_order_id' => $order->id,
                    'executed_by' => auth()->id(),
                    'status' => 'in_progress',
                    'started_at' => now(),
                    'work_cell_id' => $step->work_cell_id,
                ]);
            } else {
                // Use the step's startExecution method which handles status update
                $execution = $step->startExecution(
                    null,
                    $order->quantity_remaining ?: $order->quantity
                );
                $execution->update(['executed_by' => auth()->id()]);
            }

            // Load relationships
            $execution->load(['manufacturingStep.workCell', 'executedBy', 'media']);

            return back()
                ->with('success', 'Execution started successfully')
                ->with('execution', $execution);
        } catch (\Exception $e) {
            \Log::error('[StepExecutionController::start] Failed to start execution', [
                'error' => $e->getMessage(),
                'step_id' => $step->id,
                'order_id' => $order->id,
            ]);

            return back()->withErrors([
                'error' => 'Failed to start execution: ' . $e->getMessage(),
            ]);
        }
    }

    public function reportProgress(Request $request, ManufacturingStepExecution $execution)
    {
        $this->authorize('update', $execution);

        $validated = $request->validate([
            'quantity_completed' => 'nullable|integer|min:0',
            'quantity_scrapped' => 'nullable|integer|min:0',
            'scrap_reason' => [
                'nullable',
                'string',
                'max:500',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->input('quantity_scrapped', 0) > 0 && empty($value)) {
                        $fail('The scrap reason field is required when quantity scrapped is greater than 0.');
                    }
                },
            ],
            'notes' => 'nullable|string|max:500',
            'time_spent' => 'nullable|integer|min:0',
            'mark_complete' => 'boolean',
            'photos' => 'nullable|array|max:3',
            'photos.*' => 'image|mimes:jpeg,jpg,png,webp,heic|max:10240', // 10MB max
        ]);

        // Validate quantities don't exceed limits
        $remainingQty = $execution->manufacturingOrder->quantity -
                        $execution->manufacturingStep->cumulative_quantity_completed -
                        $execution->manufacturingStep->cumulative_quantity_scrapped;

        $totalReported = ($validated['quantity_completed'] ?? 0) + ($validated['quantity_scrapped'] ?? 0);

        if ($totalReported > $remainingQty) {
            return back()->withErrors(['quantity' => 'Total reported exceeds remaining quantity.']);
        }

        $execution = $this->executionService->reportProgress(
            $execution,
            $validated,
            $request->file('photos', [])
        );

        // Return updated order data via Inertia
        return back()->with('success', 'Progress reported successfully.')
            ->with('activeExecution', $execution->load(['manufacturingStep', 'media']));
    }

    public function uploadPhoto(Request $request, ManufacturingStepExecution $execution)
    {
        $this->authorize('takePhotos', $execution);

        $validated = $request->validate([
            'photo' => 'required|image|mimes:jpeg,jpg,png,webp,heic|max:10240',
        ]);

        // Check photo limit
        if ($execution->getMedia('step_photos')->count() >= 3) {
            return back()->withErrors(['photo' => 'Maximum of 3 photos allowed per step.']);
        }

        $media = $execution->addMediaWithDiskSelection($validated['photo'], 'step_photos');

        $execution->update([
            'photo_count' => $execution->getMedia('step_photos')->count(),
            'last_photo_at' => now(),
        ]);

        // Return with the new photo data
        return back()->with('newPhoto', [
            'id' => $media->id,
            'url' => $media->getUrl(),
            'display_url' => $media->getUrl('display'),
        ]);
    }

    public function deletePhoto(ManufacturingStepExecution $execution, Media $media)
    {
        $this->authorize('deletePhotos', $execution);

        // Verify media belongs to this execution
        if ($media->model_id !== $execution->id || $media->collection_name !== 'step_photos') {
            abort(403, 'Unauthorized');
        }

        $media->delete();

        $execution->update([
            'photo_count' => $execution->getMedia('step_photos')->count(),
        ]);

        return back()->with('success', 'Photo deleted successfully.');
    }

    /**
     * Force start a step, overriding dependencies.
     */
    public function forceStart(Request $request)
    {
        $validated = $request->validate([
            'manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'manufacturing_step_id' => 'required|exists:manufacturing_steps,id',
        ]);

        $order = \App\Models\Production\ManufacturingOrder::findOrFail($validated['manufacturing_order_id']);
        $step = \App\Models\Production\ManufacturingStep::findOrFail($validated['manufacturing_step_id']);

        // Check permission
        $this->authorize('forceStart', $step);

        // Force start the execution
        try {
            $execution = $step->startExecution(
                null,
                $order->quantity_remaining ?: $order->quantity
            );
            $execution->update([
                'executed_by' => auth()->id(),
                'force_started' => true,
                'force_start_reason' => 'Dependencies overridden by authorized user',
            ]);

            // Load relationships
            $execution->load(['manufacturingStep.workCell', 'executedBy', 'media']);

            return back()
                ->with('success', 'Execution force started successfully')
                ->with('execution', $execution);
        } catch (\Exception $e) {
            return back()->withErrors([
                'error' => 'Failed to force start execution: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Skip a step.
     */
    public function skipStep(Request $request, \App\Models\Production\ManufacturingStep $step)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        // Check permission
        $this->authorize('skip', $step);

        try {
            $step->updateStatus('skipped', [
                'skip_reason' => $validated['reason'],
                'skipped_by' => auth()->id(),
                'skipped_at' => now(),
            ]);

            return back()->with('success', 'Step skipped successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to skip step: ' . $e->getMessage()]);
        }
    }

    /**
     * Put a step on hold.
     */
    public function putOnHold(Request $request, \App\Models\Production\ManufacturingStep $step)
    {
        $validated = $request->validate([
            'execution_id' => 'required|exists:manufacturing_step_executions,id',
            'reason' => 'required|string|max:500',
        ]);

        $execution = ManufacturingStepExecution::findOrFail($validated['execution_id']);

        // Verify execution belongs to this step
        if ($execution->manufacturing_step_id !== $step->id) {
            abort(403, 'Execution does not belong to this step');
        }

        $this->authorize('putOnHold', $step);

        try {
            // Store previous state
            $previousState = $step->status;

            // Put step on hold
            $step->putOnHold();

            // Update execution with hold info
            $execution->update([
                'hold_reason' => $validated['reason'],
                'held_by' => auth()->id(),
                'held_at' => now(),
                'previous_state' => $previousState,
            ]);

            return back()->with('success', 'Step put on hold successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to put step on hold: ' . $e->getMessage()]);
        }
    }

    /**
     * Resume a step from hold.
     */
    public function resumeFromHold(\App\Models\Production\ManufacturingStep $step)
    {
        $this->authorize('resume', $step);

        if ($step->status !== 'on_hold') {
            return back()->withErrors(['error' => 'Step is not on hold.']);
        }

        try {
            // Get the active execution
            $execution = $step->executions()
                ->where('previous_state', '!=', null)
                ->latest()
                ->first();

            if ($execution) {
                // Resume to previous state
                $step->resumeFromHold();

                // Clear hold info
                $execution->update([
                    'hold_reason' => null,
                    'held_by' => null,
                    'held_at' => null,
                    'resumed_at' => now(),
                    'resumed_by' => auth()->id(),
                ]);
            } else {
                // No execution with previous state, resume to queued
                $step->updateStatus('queued');
            }

            return back()->with('success', 'Step resumed successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to resume step: ' . $e->getMessage()]);
        }
    }

    /**
     * Cancel a step.
     */
    public function cancelStep(Request $request, \App\Models\Production\ManufacturingStep $step)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        // Check permission
        $this->authorize('cancel', $step);

        try {
            $step->cancel();
            $step->update([
                'cancellation_reason' => $validated['reason'],
                'cancelled_by' => auth()->id(),
                'cancelled_at' => now(),
            ]);

            return back()->with('success', 'Step cancelled successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to cancel step: ' . $e->getMessage()]);
        }
    }

    /**
     * Record quality check result.
     */
    public function recordQualityResult(Request $request, \App\Models\Production\ManufacturingStep $step)
    {
        $validated = $request->validate([
            'execution_id' => 'required|exists:manufacturing_step_executions,id',
            'result' => 'required|in:passed,failed',
            'action' => 'required_if:result,failed|in:scrap,rework',
            'reason' => 'required_if:result,failed|string|max:500',
        ]);

        $execution = ManufacturingStepExecution::findOrFail($validated['execution_id']);

        // Verify execution belongs to this step
        if ($execution->manufacturing_step_id !== $step->id) {
            abort(403, 'Execution does not belong to this step');
        }

        $this->authorize('recordQuality', $step);

        try {
            if ($validated['result'] === 'passed') {
                // Mark as completed
                $step->recordQualityResult('passed');
                $execution->update([
                    'quality_result' => 'passed',
                    'quality_checked_by' => auth()->id(),
                    'quality_checked_at' => now(),
                    'status' => 'completed',
                ]);
            } else {
                // Handle failure
                if ($validated['action'] === 'scrap') {
                    // Mark all quantities as scrap
                    $step->recordQualityResult('failed', $validated['action']);
                    $execution->update([
                        'quality_result' => 'failed',
                        'quality_failure_reason' => $validated['reason'],
                        'quality_failure_action' => 'scrap',
                        'quality_checked_by' => auth()->id(),
                        'quality_checked_at' => now(),
                        'quantity_scrapped' => $execution->quantity_completed,
                        'quantity_completed' => 0,
                        'status' => 'completed',
                    ]);

                    // Update step totals
                    $step->updateCumulativeQuantities();
                } else {
                    // Create rework step
                    $reworkStep = $this->executionService->createReworkStep($step, $validated['reason']);

                    $execution->update([
                        'quality_result' => 'failed',
                        'quality_failure_reason' => $validated['reason'],
                        'quality_failure_action' => 'rework',
                        'quality_checked_by' => auth()->id(),
                        'quality_checked_at' => now(),
                        'rework_step_id' => $reworkStep->id,
                        'status' => 'completed',
                    ]);
                }
            }

            return back()->with('success', 'Quality result recorded successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to record quality result: ' . $e->getMessage()]);
        }
    }

    /**
     * Get step dependencies information.
     */
    public function getDependencies(\App\Models\Production\ManufacturingStep $step)
    {
        $dependencies = [
            'stepDependencies' => [],
            'childOrderDependencies' => [],
        ];

        // Check step dependencies
        if ($step->depends_on_step_id) {
            $depStep = $step->dependency;
            if ($depStep) {
                $dependencies['stepDependencies'][] = [
                    'id' => $depStep->id,
                    'type' => 'step',
                    'name' => $depStep->name,
                    'status' => $depStep->status === 'completed' ? 'met' : 'pending',
                    'progress' => $this->calculateStepProgress($depStep),
                    'details' => $this->getStepDependencyDetails($step, $depStep),
                ];
            }
        }

        // Check child order dependencies
        if ($step->child_order_dependency_type !== 'none' && $step->manufacturingRoute) {
            $order = $step->manufacturingRoute->manufacturingOrder;
            if ($order) {
                $childOrders = $order->childOrders;

                if ($childOrders) {
                    foreach ($childOrders as $childOrder) {
                        $dependencies['childOrderDependencies'][] = [
                            'id' => $childOrder->id,
                            'type' => 'child_order',
                            'name' => $childOrder->order_number,
                            'status' => $childOrder->status === 'completed' ? 'met' : 'pending',
                            'progress' => $this->calculateOrderProgress($childOrder),
                            'details' => "Item: {$childOrder->item->name}, Qty: {$childOrder->quantity}",
                        ];
                    }
                }
            }
        }

        return response()->json(['dependencies' => $dependencies]);
    }

    /**
     * Get quality requirements for a step.
     */
    public function getQualityRequirements(\App\Models\Production\ManufacturingStep $step)
    {
        $requirements = [
            'formRequired' => $step->quality_form_required ?? false,
            'formUrl' => $step->quality_form_url ?? null,
            'specifications' => [],
            'inspectorAssigned' => null,
        ];

        // Get quality specifications from step settings
        if ($step->quality_specifications) {
            $requirements['specifications'] = is_array($step->quality_specifications)
                ? $step->quality_specifications
                : json_decode($step->quality_specifications, true) ?? [];
        }

        // Get assigned inspector if any
        if ($step->assigned_inspector_id) {
            $inspector = \App\Models\User::find($step->assigned_inspector_id);
            if ($inspector) {
                $requirements['inspectorAssigned'] = [
                    'id' => $inspector->id,
                    'name' => $inspector->name,
                ];
            }
        }

        return response()->json(['requirements' => $requirements]);
    }

    /**
     * Calculate step progress percentage.
     */
    private function calculateStepProgress(\App\Models\Production\ManufacturingStep $step): int
    {
        if (! $step->manufacturingRoute || ! $step->manufacturingRoute->manufacturingOrder) {
            return $step->status === 'completed' ? 100 : 0;
        }

        $order = $step->manufacturingRoute->manufacturingOrder;
        $totalQty = $order->quantity;

        if ($totalQty === 0) {
            return $step->status === 'completed' ? 100 : 0;
        }

        $completedQty = $step->cumulative_quantity_completed + $step->cumulative_quantity_scrapped;

        return min(100, (int) round(($completedQty / $totalQty) * 100));
    }

    /**
     * Calculate order progress percentage.
     */
    private function calculateOrderProgress(\App\Models\Production\ManufacturingOrder $order): int
    {
        if ($order->status === 'completed') {
            return 100;
        }

        if ($order->quantity === 0) {
            return 0;
        }

        $completedQty = $order->quantity_completed + $order->quantity_scrapped;

        return min(100, (int) round(($completedQty / $order->quantity) * 100));
    }

    /**
     * Get detailed dependency information.
     */
    private function getStepDependencyDetails(\App\Models\Production\ManufacturingStep $step, \App\Models\Production\ManufacturingStep $depStep): string
    {
        switch ($step->dependency_start_condition) {
            case 'immediate':
                return 'Can start immediately when dependency begins';
            case 'quantity_based':
                return "Requires {$step->dependency_quantity} units completed";
            case 'percentage_based':
                return "Requires {$step->dependency_percentage}% completed";
            default:
                return 'Must be fully completed';
        }
    }
}
