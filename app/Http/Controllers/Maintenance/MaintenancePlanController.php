<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Equipment;
use App\Models\Maintenance\MaintenancePlan;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaintenancePlanController extends Controller
{
    public function index()
    {
        $maintenancePlans = MaintenancePlan::with(['equipment', 'routines'])->get();
        
        if (request()->wantsJson()) {
            return response()->json($maintenancePlans);
        }
        
        return Inertia::render('Maintenance/Plans/Index', [
            'maintenancePlans' => $maintenancePlans
        ]);
    }

    public function create()
    {
        $equipment = Equipment::all();
        
        return Inertia::render('Maintenance/Plans/Create', [
            'equipment' => $equipment
        ]);
    }
    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id' => 'nullable|exists:equipment,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive'
        ]);

        $maintenancePlan = MaintenancePlan::create($validated);

        if ($request->wantsJson()) {
            return response()->json($maintenancePlan, 201);
        }
        
        return redirect()->route('maintenance.plans.edit', $maintenancePlan)
            ->with('success', 'Plano de manutenção criado com sucesso.');
    }

    public function show(MaintenancePlan $maintenancePlan)
    {
        $maintenancePlan->load(['equipment', 'routines']);
        
        if (request()->wantsJson()) {
            return response()->json($maintenancePlan);
        }
        
        return Inertia::render('Maintenance/Plans/Show', [
            'maintenancePlan' => $maintenancePlan
        ]);
    }
    
    public function edit(MaintenancePlan $maintenancePlan)
    {
        $maintenancePlan->load(['equipment', 'routines']);
        $equipment = Equipment::all();
        
        return Inertia::render('Maintenance/Plans/Edit', [
            'maintenancePlan' => $maintenancePlan,
            'equipment' => $equipment
        ]);
    }

    public function update(Request $request, MaintenancePlan $maintenancePlan)
    {
        $validated = $request->validate([
            'equipment_id' => 'nullable|exists:equipment,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive'
        ]);

        $maintenancePlan->update($validated);

        if ($request->wantsJson()) {
            return response()->json($maintenancePlan);
        }
        
        return redirect()->back()
            ->with('success', 'Plano de manutenção atualizado com sucesso.');
    }

    public function destroy(MaintenancePlan $maintenancePlan)
    {
        // Verificar se existem rotinas associadas
        if ($maintenancePlan->routines()->count() > 0) {
            if (request()->wantsJson()) {
                return response()->json([
                    'message' => 'Não é possível excluir um plano de manutenção com rotinas associadas'
                ], 422);
            }
            
            return redirect()->back()
                ->with('error', 'Não é possível excluir um plano de manutenção com rotinas associadas.');
        }

        $maintenancePlan->delete();
        
        if (request()->wantsJson()) {
            return response()->json(['message' => 'Plano de manutenção excluído com sucesso']);
        }
        
        return redirect()->route('maintenance.plans.index')
            ->with('success', 'Plano de manutenção excluído com sucesso.');
    }

    public function updateStatus(Request $request, MaintenancePlan $maintenancePlan)
    {
        $validated = $request->validate([
            'status' => 'required|in:Active,Inactive'
        ]);

        try {
            $maintenancePlan->update($validated);
            
            if ($request->wantsJson()) {
                return response()->json($maintenancePlan);
            }
            
            return redirect()->back()
                ->with('success', 'Status do plano de manutenção atualizado com sucesso.');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            
            return redirect()->back()
                ->with('error', 'Erro ao atualizar status: ' . $e->getMessage());
        }
    }
} 