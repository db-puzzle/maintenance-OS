<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\ShiftBreak;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;

class ShiftController extends Controller
{
    public function index()
    {
        $shifts = Shift::with(['schedules.breaks', 'plant'])->get();
        return Inertia::render('cadastro/turnos', [
            'shifts' => $shifts->map(function ($shift) {
                return [
                    'id' => $shift->id,
                    'name' => $shift->name,
                    'plant' => $shift->plant ? [
                        'id' => $shift->plant->id,
                        'name' => $shift->plant->name,
                    ] : null,
                    'schedules' => $shift->schedules->map(function ($schedule) {
                        return [
                            'weekday' => $schedule->weekday,
                            'start_time' => $schedule->start_time,
                            'end_time' => $schedule->end_time,
                            'breaks' => $schedule->breaks->map(function ($break) {
                                return [
                                    'start_time' => $break->start_time,
                                    'end_time' => $break->end_time,
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                ];
            })->toArray(),
        ]);
    }

    public function create()
    {
        return Inertia::render('cadastro/turnos/create', [
            'plants' => \App\Models\Plant::all()
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'plant_id' => 'nullable|exists:plants,id',
                'name' => 'required|string|max:255',
                'schedules' => 'required|array',
                'schedules.*.weekday' => ['required', Rule::in(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])],
                'schedules.*.shifts' => 'array',
                'schedules.*.shifts.*.start_time' => 'required|date_format:H:i',
                'schedules.*.shifts.*.end_time' => 'required|date_format:H:i',
                'schedules.*.shifts.*.active' => 'required|boolean',
                'schedules.*.shifts.*.breaks' => 'nullable|array',
                'schedules.*.shifts.*.breaks.*.start_time' => 'required|date_format:H:i',
                'schedules.*.shifts.*.breaks.*.end_time' => 'required|date_format:H:i|after:schedules.*.shifts.*.breaks.*.start_time',
            ]);

            // Função auxiliar para converter horário em minutos
            $timeToMinutes = function($time) {
                list($hours, $minutes) = explode(':', $time);
                return ($hours * 60) + $minutes;
            };

            // Função auxiliar para verificar sobreposição
            $hasOverlap = function($start1, $end1, $start2, $end2) use ($timeToMinutes) {
                $start1 = $timeToMinutes($start1);
                $end1 = $timeToMinutes($end1);
                $start2 = $timeToMinutes($start2);
                $end2 = $timeToMinutes($end2);

                // Caso especial: turno que passa da meia-noite
                if ($end1 < $start1) {
                    $end1 += 24 * 60; // Adiciona 24 horas em minutos
                }
                if ($end2 < $start2) {
                    $end2 += 24 * 60; // Adiciona 24 horas em minutos
                }

                return ($start1 < $end2 && $start2 < $end1);
            };

            // Verificar sobreposição de turnos no mesmo dia
            foreach ($validated['schedules'] as $schedule) {
                $shifts = array_filter($schedule['shifts'], fn($shift) => $shift['active']);

                foreach ($shifts as $i => $shift1) {
                    foreach ($shifts as $j => $shift2) {
                        if ($i < $j && $hasOverlap(
                            $shift1['start_time'],
                            $shift1['end_time'],
                            $shift2['start_time'],
                            $shift2['end_time']
                        )) {
                            throw ValidationException::withMessages([
                                'schedules' => "Existe sobreposição de turnos na {$schedule['weekday']}"
                            ]);
                        }
                    }
                }
            }

            // Verificar intervalos dentro do horário do turno e sobreposição
            foreach ($validated['schedules'] as $schedule) {
                foreach ($schedule['shifts'] as $shift) {
                    if (!$shift['active']) continue;

                    $shiftStart = $timeToMinutes($shift['start_time']);
                    $shiftEnd = $timeToMinutes($shift['end_time']);
                    $shiftDuration = $shiftEnd < $shiftStart ? (24 * 60 - $shiftStart) + $shiftEnd : $shiftEnd - $shiftStart;

                    foreach ($shift['breaks'] as $break) {
                        $breakStart = $timeToMinutes($break['start_time']);
                        $breakEnd = $timeToMinutes($break['end_time']);

                        // Verificar se o intervalo está dentro do turno
                        if ($shiftEnd < $shiftStart) {
                            if ($breakStart < $shiftStart && $breakEnd > $shiftStart) {
                                throw ValidationException::withMessages([
                                    'schedules' => "O intervalo {$break['start_time']} - {$break['end_time']} não está dentro do horário do turno {$shift['start_time']} - {$shift['end_time']}"
                                ]);
                            }
                        } else {
                            if ($breakStart < $shiftStart || $breakEnd > $shiftEnd) {
                                throw ValidationException::withMessages([
                                    'schedules' => "O intervalo {$break['start_time']} - {$break['end_time']} não está dentro do horário do turno {$shift['start_time']} - {$shift['end_time']}"
                                ]);
                            }
                        }
                    }

                    // Verificar sobreposição de intervalos
                    foreach ($shift['breaks'] as $i => $break1) {
                        foreach ($shift['breaks'] as $j => $break2) {
                            if ($i < $j && $hasOverlap(
                                $break1['start_time'],
                                $break1['end_time'],
                                $break2['start_time'],
                                $break2['end_time']
                            )) {
                                throw ValidationException::withMessages([
                                    'schedules' => "Existe sobreposição de intervalos no turno {$shift['start_time']} - {$shift['end_time']}"
                                ]);
                            }
                        }
                    }
                }
            }

            return DB::transaction(function () use ($validated) {
                $shiftData = [
                    'name' => $validated['name']
                ];

                if (isset($validated['plant_id'])) {
                    $shiftData['plant_id'] = $validated['plant_id'];
                }

                $shift = Shift::create($shiftData);

                foreach ($validated['schedules'] as $scheduleData) {
                    foreach ($scheduleData['shifts'] as $shiftData) {
                        if (!$shiftData['active']) continue;

                        $schedule = $shift->schedules()->create([
                            'weekday' => $scheduleData['weekday'],
                            'start_time' => $shiftData['start_time'],
                            'end_time' => $shiftData['end_time']
                        ]);

                        if (isset($shiftData['breaks'])) {
                            foreach ($shiftData['breaks'] as $breakData) {
                                $break = $schedule->breaks()->create([
                                    'start_time' => $breakData['start_time'],
                                    'end_time' => $breakData['end_time']
                                ]);
                            }
                        }
                    }
                }

                return redirect()->route('cadastro.turnos')
                    ->with('success', 'Turno criado com sucesso!');
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw $e;
        }
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