<?php

namespace App\Http\Controllers\Cadastro;

use App\Http\Controllers\Controller;
use App\Models\Plant;
use Illuminate\Http\Request;

class PlantController extends Controller
{
    public function checkDependencies(Plant $plant)
    {
        $areas = $plant->areas()
            ->select('id', 'name')
            ->get();

        $equipment = $plant->equipment()
            ->select('id', 'tag')
            ->get();

        $canDelete = $areas->isEmpty() && $equipment->isEmpty();

        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => [
                'areas' => [
                    'total' => $areas->count(),
                    'items' => $areas
                ],
                'equipment' => [
                    'total' => $equipment->count(),
                    'items' => $equipment
                ]
            ]
        ]);
    }
} 