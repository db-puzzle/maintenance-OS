<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoutineExecutionController extends Controller
{
    public function index()
    {
        $executions = RoutineExecution::with(['routine', 'formExecution', 'executor'])->get();

        return Inertia::render('Maintenance/Executions/Index', [
            'executions' => $executions,
        ]);
    }

    public function create(?Routine $routine = null)
    {
        $routines = Routine::with('assets')->get();

        return Inertia::render('Maintenance/Executions/Create', [
            'routines' => $routines,
            'selectedRoutine' => $routine,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'routine_id' => 'required|exists:routines,id',
            'form_execution_id' => 'nullable|exists:form_executions,id',
            'executed_by' => 'nullable|exists:users,id',
            'status' => 'required|in:pending,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
            'execution_data' => 'nullable|array',
        ]);

        // Definir valores padrão
        if ($validated['status'] === RoutineExecution::STATUS_IN_PROGRESS) {
            $validated['started_at'] = now();
        } elseif ($validated['status'] === RoutineExecution::STATUS_COMPLETED) {
            $validated['started_at'] = $validated['started_at'] ?? now();
            $validated['completed_at'] = now();
        }

        $execution = RoutineExecution::create($validated);

        return redirect()->route('maintenance.routines.show', $execution)
            ->with('success', 'Execução de rotina criada com sucesso.');
    }

    public function show(RoutineExecution $routineExecution)
    {
        $routineExecution->load(['routine', 'formExecution', 'executor']);

        return Inertia::render('Maintenance/Executions/Show', [
            'execution' => $routineExecution,
        ]);
    }

    public function edit(RoutineExecution $routineExecution)
    {
        $routineExecution->load(['routine', 'formExecution', 'executor']);

        return Inertia::render('Maintenance/Executions/Edit', [
            'execution' => $routineExecution,
            'statuses' => [
                ['value' => RoutineExecution::STATUS_PENDING, 'label' => 'Pendente'],
                ['value' => RoutineExecution::STATUS_IN_PROGRESS, 'label' => 'Em Andamento'],
                ['value' => RoutineExecution::STATUS_COMPLETED, 'label' => 'Concluída'],
                ['value' => RoutineExecution::STATUS_CANCELLED, 'label' => 'Cancelada'],
            ],
        ]);
    }

    public function update(Request $request, RoutineExecution $routineExecution)
    {
        $validated = $request->validate([
            'form_execution_id' => 'nullable|exists:form_executions,id',
            'executed_by' => 'nullable|exists:users,id',
            'started_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'status' => 'required|in:pending,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
            'execution_data' => 'nullable|array',
        ]);

        // Atualizar automaticamente timestamps baseado no status
        $oldStatus = $routineExecution->status;
        $newStatus = $validated['status'];

        if ($oldStatus !== RoutineExecution::STATUS_IN_PROGRESS &&
            $newStatus === RoutineExecution::STATUS_IN_PROGRESS &&
            ! isset($validated['started_at'])) {
            $validated['started_at'] = now();
        }

        if ($oldStatus !== RoutineExecution::STATUS_COMPLETED &&
            $newStatus === RoutineExecution::STATUS_COMPLETED &&
            ! isset($validated['completed_at'])) {
            $validated['completed_at'] = now();
        }

        $routineExecution->update($validated);

        return redirect()->back()
            ->with('success', 'Execução de rotina atualizada com sucesso.');
    }

    public function destroy(RoutineExecution $routineExecution)
    {
        // Verificar se a execução já foi concluída
        if ($routineExecution->isCompleted()) {
            return redirect()->back()
                ->with('error', 'Não é possível excluir uma execução já concluída.');
        }

        $routineExecution->delete();

        return redirect()->route('maintenance.routines.index')
            ->with('success', 'Execução de rotina excluída com sucesso.');
    }

    public function start(RoutineExecution $routineExecution)
    {
        if (! $routineExecution->isPending()) {
            return redirect()->back()
                ->with('error', 'Apenas execuções pendentes podem ser iniciadas.');
        }

        $routineExecution->start();

        return redirect()->route('maintenance.routines.fill', $routineExecution)
            ->with('success', 'Execução de rotina iniciada com sucesso.');
    }

    public function fill(RoutineExecution $routineExecution)
    {
        if (! $routineExecution->isInProgress()) {
            return redirect()->route('maintenance.routines.show', $routineExecution)
                ->with('error', 'Esta execução não está em andamento.');
        }

        $routineExecution->load(['routine', 'formExecution']);

        return Inertia::render('Maintenance/Executions/Fill', [
            'execution' => $routineExecution,
        ]);
    }

    public function complete(Request $request, RoutineExecution $routineExecution)
    {
        if (! $routineExecution->isInProgress()) {
            return redirect()->back()
                ->with('error', 'Apenas execuções em andamento podem ser concluídas.');
        }

        // Validar e salvar dados de formulário, se houver
        if ($request->has('execution_data')) {
            $routineExecution->execution_data = $request->execution_data;
        }

        if ($request->has('notes')) {
            $routineExecution->notes = $request->notes;
        }

        $routineExecution->complete();

        return redirect()->route('maintenance.routines.show', $routineExecution)
            ->with('success', 'Execução de rotina concluída com sucesso.');
    }

    public function cancel(RoutineExecution $routineExecution)
    {
        if (! $routineExecution->isPending() && ! $routineExecution->isInProgress()) {
            return redirect()->back()
                ->with('error', 'Apenas execuções pendentes ou em andamento podem ser canceladas.');
        }

        $routineExecution->cancel();

        return redirect()->route('maintenance.routines.show', $routineExecution)
            ->with('success', 'Execução de rotina cancelada com sucesso.');
    }
}
