<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\Maintenance\Routine;
use App\Models\Forms\Form;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Maintenance\MaintenancePlan;
use App\Models\Maintenance\RoutineExecution;

class RoutineController extends Controller
{
    public function index()
    {
        $routines = Routine::with(['maintenancePlan', 'form', 'routineExecutions'])->get();
        
        if (request()->wantsJson()) {
            return response()->json($routines);
        }
        
        return Inertia::render('Maintenance/Routines/Index', [
            'routines' => $routines
        ]);
    }
    
    public function create()
    {
        $maintenancePlans = MaintenancePlan::where('status', 'Active')->get();
        $availableForms = Form::whereDoesntHave('routine')
            ->where('is_active', true)
            ->get();
        
        return Inertia::render('Maintenance/Routines/Create', [
            'maintenancePlans' => $maintenancePlans,
            'availableForms' => $availableForms,
            'routineTypes' => [
                ['id' => Routine::TYPE_INSPECTION, 'name' => 'Inspeção'],
                ['id' => Routine::TYPE_MAINTENANCE_ROUTINE, 'name' => 'Rotina de Manutenção'],
                ['id' => Routine::TYPE_MAINTENANCE_REPORT, 'name' => 'Relatório de Manutenção']
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'maintenance_plan_id' => 'required|exists:maintenance_plans,id',
            'form_id' => 'nullable|exists:forms,id|unique:routines,form_id',
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'type' => 'required|integer|in:' . implode(',', [
                Routine::TYPE_INSPECTION,
                Routine::TYPE_MAINTENANCE_ROUTINE,
                Routine::TYPE_MAINTENANCE_REPORT
            ])
        ]);

        $routine = Routine::create($validated);

        if ($request->wantsJson()) {
            return response()->json($routine, 201);
        }
        
        return redirect()->route('maintenance.routines.edit', $routine)
            ->with('success', 'Rotina criada com sucesso.');
    }

    public function show(Routine $routine)
    {
        $routine->load(['maintenancePlan', 'form', 'routineExecutions']);
        
        if (request()->wantsJson()) {
            return response()->json($routine);
        }
        
        return Inertia::render('Maintenance/Routines/Show', [
            'routine' => $routine
        ]);
    }
    
    public function edit(Routine $routine)
    {
        $routine->load(['maintenancePlan', 'form']);
        
        $maintenancePlans = MaintenancePlan::where('status', 'Active')->get();
        $availableForms = Form::whereDoesntHave('routine')
            ->where('is_active', true)
            ->orWhere('id', $routine->form_id)
            ->get();
            
        return Inertia::render('Maintenance/Routines/Edit', [
            'routine' => $routine,
            'maintenancePlans' => $maintenancePlans,
            'availableForms' => $availableForms,
            'routineTypes' => [
                ['id' => Routine::TYPE_INSPECTION, 'name' => 'Inspeção'],
                ['id' => Routine::TYPE_MAINTENANCE_ROUTINE, 'name' => 'Rotina de Manutenção'],
                ['id' => Routine::TYPE_MAINTENANCE_REPORT, 'name' => 'Relatório de Manutenção']
            ]
        ]);
    }

    public function update(Request $request, Routine $routine)
    {
        $validated = $request->validate([
            'form_id' => 'nullable|exists:forms,id|unique:routines,form_id,' . $routine->id,
            'name' => 'required|string|max:255',
            'trigger_hours' => 'required|integer|min:0',
            'type' => 'required|integer|in:' . implode(',', [
                Routine::TYPE_INSPECTION,
                Routine::TYPE_MAINTENANCE_ROUTINE,
                Routine::TYPE_MAINTENANCE_REPORT
            ])
        ]);

        $routine->update($validated);

        if ($request->wantsJson()) {
            return response()->json($routine);
        }
        
        return redirect()->back()
            ->with('success', 'Rotina atualizada com sucesso.');
    }

    public function destroy(Routine $routine)
    {
        // Verificar se existem execuções associadas
        if ($routine->routineExecutions()->count() > 0) {
            if (request()->wantsJson()) {
                return response()->json([
                    'message' => 'Não é possível excluir uma rotina com execuções associadas'
                ], 422);
            }
            
            return redirect()->back()
                ->with('error', 'Não é possível excluir uma rotina com execuções associadas.');
        }

        $routine->delete();
        
        if (request()->wantsJson()) {
            return response()->json(['message' => 'Rotina excluída com sucesso']);
        }
        
        return redirect()->route('maintenance.routines.index')
            ->with('success', 'Rotina excluída com sucesso.');
    }

    public function createExecution(Routine $routine)
    {
        $execution = new RoutineExecution([
            'routine_id' => $routine->id,
            'status' => RoutineExecution::STATUS_PENDING
        ]);
        $execution->save();

        if (request()->wantsJson()) {
            return response()->json($execution, 201);
        }
        
        return redirect()->route('maintenance.executions.edit', $execution)
            ->with('success', 'Nova execução da rotina criada com sucesso.');
    }

    public function executions(Routine $routine)
    {
        $executions = $routine->routineExecutions()->with(['executor'])->get();
        
        if (request()->wantsJson()) {
            return response()->json($executions);
        }
        
        return Inertia::render('Maintenance/Routines/Executions', [
            'routine' => $routine,
            'executions' => $executions
        ]);
    }
} 