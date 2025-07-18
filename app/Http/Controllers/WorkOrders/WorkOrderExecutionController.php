<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderExecutionController extends Controller
{
    /**
     * Start the execution of a work order
     */
    public function start(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('start', $workOrder);

        if (!$workOrder->canBeStarted()) {
            return back()->with('error', 'Esta ordem de serviço não pode ser iniciada.');
        }

        // Create work order execution
        $execution = WorkOrderExecution::create([
            'work_order_id' => $workOrder->id,
            'executed_by' => auth()->id(),
            'started_at' => now(),
            'status' => 'in_progress',
        ]);

        // Update work order status
        $workOrder->updateStatus('in_progress');

        return redirect()->route("{$workOrder->discipline}.work-orders.execute", $workOrder)
            ->with('success', 'Execução da ordem de serviço iniciada.');
    }

    /**
     * Show the execution interface
     */
    public function execute(WorkOrder $workOrder)
    {
        $this->authorize('execute', $workOrder);

        if ($workOrder->status !== 'in_progress') {
            return redirect()->route("{$workOrder->discipline}.work-orders.show", $workOrder)
                ->with('error', 'Esta ordem de serviço não está em execução.');
        }

        $workOrder->load([
            'workOrderType',
            'asset.plant',
            'form.currentVersion.tasks.instructions',
            'execution.taskResponses',
        ]);

        return Inertia::render('work-orders/execute', [
            'workOrder' => $workOrder,
            'execution' => $workOrder->execution,
            'formVersion' => $workOrder->form?->getFormVersionForExecution(),
        ]);
    }

    /**
     * Pause the execution
     */
    public function pause(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('execute', $workOrder);

        if (!$workOrder->execution || !$workOrder->execution->started_at) {
            return back()->with('error', 'Execução não encontrada.');
        }

        $workOrder->execution->pause();

        return back()->with('success', 'Execução pausada.');
    }

    /**
     * Resume the execution
     */
    public function resume(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('execute', $workOrder);

        if (!$workOrder->execution || !$workOrder->execution->isPaused()) {
            return back()->with('error', 'Execução não está pausada.');
        }

        $workOrder->execution->resume();

        return back()->with('success', 'Execução retomada.');
    }

    /**
     * Complete the execution
     */
    public function complete(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('complete', $workOrder);

        $validated = $request->validate([
            'work_performed' => 'required|string',
            'observations' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_required' => 'required|boolean',
            'safety_checks_completed' => 'required|boolean',
            'quality_checks_completed' => 'required|boolean',
            'tools_returned' => 'required|boolean',
            'area_cleaned' => 'required|boolean',
            'actual_hours' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
        ]);

        if (!$workOrder->execution) {
            return back()->with('error', 'Execução não encontrada.');
        }

        // Check if all required tasks are completed
        if ($workOrder->form_id && !$this->areAllRequiredTasksCompleted($workOrder)) {
            return back()->with('error', 'Todas as tarefas obrigatórias devem ser concluídas.');
        }

        // Update execution
        $workOrder->execution->update([
            'work_performed' => $validated['work_performed'],
            'observations' => $validated['observations'],
            'recommendations' => $validated['recommendations'],
            'follow_up_required' => $validated['follow_up_required'],
            'safety_checks_completed' => $validated['safety_checks_completed'],
            'quality_checks_completed' => $validated['quality_checks_completed'],
            'tools_returned' => $validated['tools_returned'],
            'area_cleaned' => $validated['area_cleaned'],
        ]);

        // Complete the execution
        $workOrder->execution->complete();

        // Update work order with actual values
        $workOrder->update([
            'actual_hours' => $validated['actual_hours'] ?? $workOrder->execution->actual_execution_time / 60,
            'actual_cost' => $validated['actual_cost'],
        ]);

        // Update execution status
        $workOrder->execution->update(['status' => 'completed']);

        return redirect()->route("{$workOrder->discipline}.work-orders.show", $workOrder)
            ->with('success', 'Ordem de serviço concluída com sucesso.');
    }

    /**
     * Cancel the execution
     */
    public function cancel(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('execute', $workOrder);

        $validated = $request->validate([
            'cancellation_reason' => 'required|string',
        ]);

        if (!$workOrder->execution) {
            return back()->with('error', 'Execução não encontrada.');
        }

        // Update execution with cancellation reason
        $workOrder->execution->update([
            'observations' => 'Cancelado: ' . $validated['cancellation_reason'],
        ]);

        // Delete the execution
        $workOrder->execution->delete();

        // Update work order status back to approved
        $workOrder->updateStatus('approved', 'Execução cancelada: ' . $validated['cancellation_reason']);

        return redirect()->route("{$workOrder->discipline}.work-orders.show", $workOrder)
            ->with('success', 'Execução cancelada.');
    }

    /**
     * Check if all required tasks are completed
     */
    private function areAllRequiredTasksCompleted(WorkOrder $workOrder): bool
    {
        if (!$workOrder->form || !$workOrder->execution) {
            return true;
        }

        $formVersion = $workOrder->form->getFormVersionForExecution();
        if (!$formVersion) {
            return true;
        }

        $requiredTasks = $formVersion->tasks()
            ->where('is_required', true)
            ->pluck('id');

        if ($requiredTasks->isEmpty()) {
            return true;
        }

        $completedRequiredTasks = $workOrder->execution->taskResponses()
            ->whereIn('form_task_id', $requiredTasks)
            ->whereNotNull('completed_at')
            ->count();

        return $requiredTasks->count() === $completedRequiredTasks;
    }
}