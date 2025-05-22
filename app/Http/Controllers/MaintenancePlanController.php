<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Maintenance\MaintenancePlan;
use Illuminate\Http\Request;

class MaintenancePlanController extends Controller
{
    public function index()
    {
        $plans = MaintenancePlan::with(['equipment', 'routines'])->get();
        return response()->json($plans);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id' => 'nullable|exists:equipment,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive'
        ]);
        
        // Verifica se está tentando criar um plano ativo sem equipamento
        if ($validated['status'] === 'Active' && empty($validated['equipment_id'])) {
            return response()->json([
                'message' => 'Um plano de manutenção só pode ser ativo se estiver associado a um equipamento específico.',
                'errors' => ['equipment_id' => ['Obrigatório para planos ativos.']]
            ], 422);
        }
        
        $plan = MaintenancePlan::create($validated);

        return response()->json($plan, 201);
    }

    public function show(MaintenancePlan $maintenancePlan)
    {
        return response()->json($maintenancePlan->load(['equipment', 'routines']));
    }

    public function update(Request $request, MaintenancePlan $maintenancePlan)
    {
        $validated = $request->validate([
            'equipment_id' => 'nullable|exists:equipment,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive'
        ]);
        
        // Verifica se está tentando atualizar para um plano ativo sem equipamento
        if ($validated['status'] === 'Active' && empty($validated['equipment_id'])) {
            return response()->json([
                'message' => 'Um plano de manutenção só pode ser ativo se estiver associado a um equipamento específico.',
                'errors' => ['equipment_id' => ['Obrigatório para planos ativos.']]
            ], 422);
        }
        
        $maintenancePlan->update($validated);

        return response()->json($maintenancePlan);
    }

    public function destroy(MaintenancePlan $maintenancePlan)
    {
        $maintenancePlan->delete();
        return response()->json(['message' => 'Maintenance plan deleted successfully']);
    }
} 