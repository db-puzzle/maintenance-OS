<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\ShiftBreak;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ShiftController extends Controller
{
    public function index()
    {
        $shifts = Shift::with(['schedules.breaks', 'plant'])->get();
        return Inertia::render('cadastro/turnos', [
            'shifts' => $shifts
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/turnos', [
            'plants' => \App\Models\Plant::all()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'plant_id' => 'nullable|exists:plants,id',
            'name' => 'required|string|max:255',
            'schedules' => 'required|array',
            'schedules.*.weekday' => ['required', Rule::in(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])],
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i|after:schedules.*.start_time',
            'schedules.*.breaks' => 'nullable|array',
            'schedules.*.breaks.*.start_time' => 'required|date_format:H:i',
            'schedules.*.breaks.*.end_time' => 'required|date_format:H:i|after:schedules.*.breaks.*.start_time',
        ]);

        return DB::transaction(function () use ($validated) {
            $shift = Shift::create([
                'plant_id' => $validated['plant_id'],
                'name' => $validated['name']
            ]);

            foreach ($validated['schedules'] as $scheduleData) {
                $schedule = $shift->schedules()->create([
                    'weekday' => $scheduleData['weekday'],
                    'start_time' => $scheduleData['start_time'],
                    'end_time' => $scheduleData['end_time']
                ]);

                if (isset($scheduleData['breaks'])) {
                    foreach ($scheduleData['breaks'] as $breakData) {
                        $schedule->breaks()->create([
                            'start_time' => $breakData['start_time'],
                            'end_time' => $breakData['end_time'],
                            'description' => $breakData['description'] ?? null
                        ]);
                    }
                }
            }

            return redirect()->route('cadastro.turnos.index')
                ->with('success', 'Turno criado com sucesso!');
        });
    }

    public function show(Shift $shift)
    {
        $shift->load(['schedules.breaks', 'plant']);
        return Inertia::render('Cadastro/Shifts/Show', [
            'shift' => $shift
        ]);
    }

    public function edit(Shift $shift)
    {
        $shift->load(['schedules.breaks', 'plant']);
        return Inertia::render('Cadastro/Shifts/Edit', [
            'shift' => $shift
        ]);
    }

    public function update(Request $request, Shift $shift)
    {
        $validated = $request->validate([
            'plant_id' => 'nullable|exists:plants,id',
            'name' => 'required|string|max:255',
            'schedules' => 'required|array',
            'schedules.*.id' => 'nullable|exists:shift_schedules,id',
            'schedules.*.weekday' => ['required', Rule::in(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])],
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i|after:schedules.*.start_time',
            'schedules.*.breaks' => 'nullable|array',
            'schedules.*.breaks.*.id' => 'nullable|exists:shift_breaks,id',
            'schedules.*.breaks.*.start_time' => 'required|date_format:H:i',
            'schedules.*.breaks.*.end_time' => 'required|date_format:H:i|after:schedules.*.breaks.*.start_time',
        ]);

        return DB::transaction(function () use ($shift, $validated) {
            $shift->update([
                'plant_id' => $validated['plant_id'],
                'name' => $validated['name']
            ]);

            $scheduleIds = [];
            foreach ($validated['schedules'] as $scheduleData) {
                $schedule = isset($scheduleData['id']) 
                    ? $shift->schedules()->findOrFail($scheduleData['id'])
                    : new ShiftSchedule();

                $schedule->fill([
                    'weekday' => $scheduleData['weekday'],
                    'start_time' => $scheduleData['start_time'],
                    'end_time' => $scheduleData['end_time']
                ]);

                $shift->schedules()->save($schedule);
                $scheduleIds[] = $schedule->id;

                if (isset($scheduleData['breaks'])) {
                    $breakIds = [];
                    foreach ($scheduleData['breaks'] as $breakData) {
                        $break = isset($breakData['id'])
                            ? $schedule->breaks()->findOrFail($breakData['id'])
                            : new ShiftBreak();

                        $break->fill([
                            'start_time' => $breakData['start_time'],
                            'end_time' => $breakData['end_time'],
                            'description' => $breakData['description'] ?? null
                        ]);

                        $schedule->breaks()->save($break);
                        $breakIds[] = $break->id;
                    }

                    $schedule->breaks()->whereNotIn('id', $breakIds)->delete();
                } else {
                    $schedule->breaks()->delete();
                }
            }

            $shift->schedules()->whereNotIn('id', $scheduleIds)->delete();

            return redirect()->route('cadastro.turnos.index')
                ->with('success', 'Turno atualizado com sucesso!');
        });
    }

    public function destroy(Shift $shift)
    {
        $shift->delete();
        return redirect()->route('cadastro.turnos.index')
            ->with('success', 'Turno removido com sucesso!');
    }

    public function checkDependencies(Shift $shift)
    {
        // Implementar lógica para verificar dependências
        return response()->json([
            'has_dependencies' => false,
            'message' => 'Nenhuma dependência encontrada'
        ]);
    }
} 