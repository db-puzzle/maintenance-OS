<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\ShiftTime;
use Illuminate\Http\Request;

class ShiftTimeController extends Controller
{
    public function update(Request $request, ShiftTime $shiftTime)
    {
        $validated = $request->validate([
            'work_hours' => 'required|integer|min:0',
            'work_minutes' => 'required|integer|min:0|max:59',
            'break_hours' => 'required|integer|min:0',
            'break_minutes' => 'required|integer|min:0|max:59',
        ]);

        $shiftTime->update($validated);
        $shiftTime->shift->calculateTotals();

        return redirect()->back()
            ->with('success', 'Horário do turno atualizado com sucesso.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shift_id' => 'required|exists:shifts,id',
            'work_hours' => 'required|integer|min:0',
            'work_minutes' => 'required|integer|min:0|max:59',
            'break_hours' => 'required|integer|min:0',
            'break_minutes' => 'required|integer|min:0|max:59',
        ]);

        $shiftTime = ShiftTime::create($validated);
        $shiftTime->shift->calculateTotals();

        return redirect()->back()
            ->with('success', 'Horário do turno criado com sucesso.');
    }

    public function destroy(ShiftTime $shiftTime)
    {
        $shift = $shiftTime->shift;
        $shiftTime->delete();
        $shift->calculateTotals();

        return redirect()->back()
            ->with('success', 'Horário do turno excluído com sucesso.');
    }
}
