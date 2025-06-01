<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Shift;
use App\Models\AssetHierarchy\ShiftSchedule;
use App\Models\AssetHierarchy\ShiftBreak;
use App\Models\AssetHierarchy\Plant;
use App\Traits\ShiftTimeCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;

class ShiftController extends Controller
{
    use ShiftTimeCalculator;

    public function index(Request $request)
    {
        $query = Shift::with(['schedules.shiftTimes.breaks', 'assets']);
        
        // For now, since there's no direct plant-shift relationship in the database,
        // we'll return all shifts. In the future, you might want to add a pivot table
        // or modify the database schema to support plant-specific shifts.
        $plantId = $request->input('plant_id');
        if ($plantId) {
            // If you want to filter by plant in the future, you can add logic here
            // For now, we'll return all available shifts
        }
        
        $shifts = $query->get();
        
        $formattedShifts = $shifts->map(function ($shift) {
            $schedules = $shift->schedules->map(function ($schedule) {
                return [
                    'weekday' => $schedule->weekday,
                    'shifts' => $schedule->shiftTimes->map(function ($shiftTime) {
                        return [
                            'start_time' => $shiftTime->start_time,
                            'end_time' => $shiftTime->end_time,
                            'active' => $shiftTime->active,
                            'breaks' => $shiftTime->breaks->map(function ($break) {
                                return [
                                    'start_time' => $break->start_time,
                                    'end_time' => $break->end_time,
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                ];
            })->toArray();

            $totals = $this->calculateShiftTotals($schedules);

            return [
                'id' => $shift->id,
                'name' => $shift->name,
                'asset_count' => $shift->assets->count(),
                'total_work_hours' => $totals['work_hours'],
                'total_work_minutes' => $totals['work_minutes'],
                'total_break_hours' => $totals['break_hours'],
                'total_break_minutes' => $totals['break_minutes'],
                'schedules' => $schedules,
            ];
        })->toArray();
        
        // Return JSON for AJAX requests
        if ($request->wantsJson() || $request->input('format') === 'json') {
            return response()->json([
                'shifts' => $formattedShifts
            ]);
        }
        
        return Inertia::render('asset-hierarchy/shifts', [
            'shifts' => $formattedShifts,
        ]);
    }

    public function create()
    {
        return Inertia::render('asset-hierarchy/shifts/shift-editor');
    }

    private function validateShiftData(Request $request)
    {
        // Formata os horários para remover os segundos se necessário
        $data = $request->all();
        
        foreach ($data['schedules'] as &$schedule) {
            foreach ($schedule['shifts'] as &$shiftTime) {
                if (!$shiftTime['active']) continue;
                
                // Verifica se o horário tem segundos e remove se necessário
                if (strlen($shiftTime['start_time']) > 5) {
                    $shiftTime['start_time'] = substr($shiftTime['start_time'], 0, 5);
                }
                if (strlen($shiftTime['end_time']) > 5) {
                    $shiftTime['end_time'] = substr($shiftTime['end_time'], 0, 5);
                }
                
                foreach ($shiftTime['breaks'] as &$break) {
                    if (strlen($break['start_time']) > 5) {
                        $break['start_time'] = substr($break['start_time'], 0, 5);
                    }
                    if (strlen($break['end_time']) > 5) {
                        $break['end_time'] = substr($break['end_time'], 0, 5);
                    }
                }
            }
        }

        // Substitui os dados da requisição pelos formatados
        $request->replace($data);

        $validated = $request->validate([
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

        // Verificar sobreposição de turnos no mesmo dia
        foreach ($validated['schedules'] as $schedule) {
            $shifts = array_filter($schedule['shifts'], fn($shift) => $shift['active']);

            foreach ($shifts as $i => $shift1) {
                foreach ($shifts as $j => $shift2) {
                    if ($i < $j && $this->hasOverlap(
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

                $shiftStart = $this->timeToMinutes($shift['start_time']);
                $shiftEnd = $this->timeToMinutes($shift['end_time']);
                $shiftDuration = $shiftEnd < $shiftStart ? (24 * 60 - $shiftStart) + $shiftEnd : $shiftEnd - $shiftStart;

                foreach ($shift['breaks'] as $break) {
                    $breakStart = $this->timeToMinutes($break['start_time']);
                    $breakEnd = $this->timeToMinutes($break['end_time']);

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

                    // Verificar sobreposição de intervalos
                    foreach ($shift['breaks'] as $i => $break1) {
                        foreach ($shift['breaks'] as $j => $break2) {
                            if ($i < $j && $this->hasOverlap(
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
        }

        return $validated;
    }

    public function store(Request $request)
    {
        try {
            $validated = $this->validateShiftData($request);

            return DB::transaction(function () use ($validated, $request) {
                $shiftData = [
                    'name' => $validated['name']
                ];

                $shift = Shift::create($shiftData);

                foreach ($validated['schedules'] as $scheduleData) {
                    // Cria um registro de schedule para cada dia
                    $schedule = $shift->schedules()->create([
                        'weekday' => $scheduleData['weekday']
                    ]);

                    // Para cada turno no dia
                    foreach ($scheduleData['shifts'] as $shiftData) {
                        if (!$shiftData['active']) continue;

                        // Cria o turno associado ao schedule
                        $shiftTime = $schedule->shiftTimes()->create([
                            'start_time' => $shiftData['start_time'],
                            'end_time' => $shiftData['end_time'],
                            'active' => $shiftData['active']
                        ]);

                        // Cria os intervalos associados ao turno
                        if (isset($shiftData['breaks'])) {
                            foreach ($shiftData['breaks'] as $breakData) {
                                $shiftTime->breaks()->create([
                                    'start_time' => $breakData['start_time'],
                                    'end_time' => $breakData['end_time']
                                ]);
                            }
                        }
                    }
                }

                // Load relationships for the response
                $shift->load(['schedules.shiftTimes.breaks', 'assets']);

                // Format the shift data for the response
                $formattedShift = [
                    'id' => $shift->id,
                    'name' => $shift->name,
                    'asset_count' => $shift->assets->count(),
                    'schedules' => $shift->schedules->map(function ($schedule) {
                        return [
                            'weekday' => $schedule->weekday,
                            'shifts' => $schedule->shiftTimes->map(function ($shiftTime) {
                                return [
                                    'start_time' => $shiftTime->start_time,
                                    'end_time' => $shiftTime->end_time,
                                    'active' => $shiftTime->active,
                                    'breaks' => $shiftTime->breaks->map(function ($break) {
                                        return [
                                            'start_time' => $break->start_time,
                                            'end_time' => $break->end_time,
                                        ];
                                    })->toArray(),
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                ];

                // Check if this is an AJAX request
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => true,
                        'shift' => $formattedShift,
                        'message' => 'Turno criado com sucesso!'
                    ]);
                }

                // For Inertia requests, include the shift in the redirect
                return redirect()->route('asset-hierarchy.shifts')
                    ->with('success', 'Turno criado com sucesso!')
                    ->with('shift', $formattedShift);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw $e;
        }
    }

    public function show(Request $request, Shift $shift)
    {
        $shift->load(['schedules.shiftTimes.breaks', 'assets']);
        
        $formattedShift = [
            'id' => $shift->id,
            'name' => $shift->name,
            'asset_count' => $shift->assets->count(),
            'schedules' => $shift->schedules->map(function ($schedule) {
                return [
                    'weekday' => $schedule->weekday,
                    'shifts' => $schedule->shiftTimes->map(function ($shiftTime) {
                        return [
                            'start_time' => $shiftTime->start_time,
                            'end_time' => $shiftTime->end_time,
                            'active' => $shiftTime->active,
                            'breaks' => $shiftTime->breaks->map(function ($break) {
                                return [
                                    'start_time' => $break->start_time,
                                    'end_time' => $break->end_time,
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                ];
            })->toArray(),
        ];
        
        // Return JSON for AJAX requests
        if ($request->wantsJson() || $request->input('format') === 'json') {
            return response()->json([
                'shift' => $formattedShift
            ]);
        }
        
        return Inertia::render('Cadastro/Shifts/Show', [
            'shift' => $formattedShift
        ]);
    }

    public function edit(Shift $shift)
    {
        $shift->load(['schedules.shiftTimes.breaks', 'assets']);

        $formattedShift = [
            'id' => $shift->id,
            'name' => $shift->name,
            'asset_count' => $shift->assets->count(),
            'schedules' => $shift->schedules->map(function ($schedule) {
                return [
                    'weekday' => $schedule->weekday,
                    'shifts' => $schedule->shiftTimes->map(function ($shiftTime) {
                        return [
                            'start_time' => $shiftTime->start_time,
                            'end_time' => $shiftTime->end_time,
                            'active' => $shiftTime->active,
                            'breaks' => $shiftTime->breaks->map(function ($break) {
                                return [
                                    'start_time' => $break->start_time,
                                    'end_time' => $break->end_time,
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                ];
            })->toArray(),
        ];

        return Inertia::render('asset-hierarchy/shifts/shift-editor', [
            'mode' => 'edit',
            'shift' => $formattedShift
        ]);
    }

    public function update(Request $request, Shift $shift)
    {
        try {
            $validated = $this->validateShiftData($request);

            return DB::transaction(function () use ($shift, $validated, $request) {
                $shiftData = [
                    'name' => $validated['name']
                ];
                
                $shift->update($shiftData);

                // Limpar schedules existentes
                $shift->schedules()->delete();

                foreach ($validated['schedules'] as $scheduleData) {
                    // Cria um registro de schedule para cada dia
                    $schedule = $shift->schedules()->create([
                        'weekday' => $scheduleData['weekday']
                    ]);

                    // Para cada turno no dia
                    foreach ($scheduleData['shifts'] as $shiftData) {
                        if (!$shiftData['active']) continue;

                        // Cria o turno associado ao schedule
                        $shiftTime = $schedule->shiftTimes()->create([
                            'start_time' => $shiftData['start_time'],
                            'end_time' => $shiftData['end_time'],
                            'active' => $shiftData['active']
                        ]);

                        // Cria os intervalos associados ao turno
                        if (isset($shiftData['breaks'])) {
                            foreach ($shiftData['breaks'] as $breakData) {
                                $shiftTime->breaks()->create([
                                    'start_time' => $breakData['start_time'],
                                    'end_time' => $breakData['end_time']
                                ]);
                            }
                        }
                    }
                }

                // Load relationships for the response
                $shift->load(['schedules.shiftTimes.breaks', 'assets']);

                // Format the shift data for the response
                $formattedShift = [
                    'id' => $shift->id,
                    'name' => $shift->name,
                    'asset_count' => $shift->assets->count(),
                    'schedules' => $shift->schedules->map(function ($schedule) {
                        return [
                            'weekday' => $schedule->weekday,
                            'shifts' => $schedule->shiftTimes->map(function ($shiftTime) {
                                return [
                                    'start_time' => $shiftTime->start_time,
                                    'end_time' => $shiftTime->end_time,
                                    'active' => $shiftTime->active,
                                    'breaks' => $shiftTime->breaks->map(function ($break) {
                                        return [
                                            'start_time' => $break->start_time,
                                            'end_time' => $break->end_time,
                                        ];
                                    })->toArray(),
                                ];
                            })->toArray(),
                        ];
                    })->toArray(),
                ];

                $totals = $this->calculateShiftTotals($formattedShift['schedules']);
                $formattedShift = array_merge($formattedShift, [
                    'total_work_hours' => $totals['work_hours'],
                    'total_work_minutes' => $totals['work_minutes'],
                    'total_break_hours' => $totals['break_hours'],
                    'total_break_minutes' => $totals['break_minutes'],
                ]);

                // Check if this is an AJAX request
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => true,
                        'shift' => $formattedShift,
                        'message' => 'Turno atualizado com sucesso!'
                    ]);
                }

                return redirect()->route('asset-hierarchy.shifts')
                    ->with('success', 'Turno atualizado com sucesso!')
                    ->with('shift', $formattedShift);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw $e;
        }
    }

    public function destroy(Shift $shift)
    {
        $shift->delete();
        return redirect()->route('asset-hierarchy.shifts')
            ->with('success', 'Turno removido com sucesso!');
    }

    public function checkDependencies(Shift $shift)
    {
        // Verificar se há entidades associadas ao turno
        $assetCount = $shift->assets()->count();
        
        // Se não há dependências, redirecionar para confirmação de exclusão
        if ($assetCount === 0) {
            return redirect()->route('asset-hierarchy.shifts')
                ->with('info', "O turno {$shift->name} pode ser excluído com segurança.");
        }

        // Se há dependências, mostrar página com detalhes das dependências
        $dependencies = [];
        
        if ($assetCount > 0) {
            $dependencies['assets'] = [
                'total' => $assetCount,
                'message' => 'Este turno está associado a ativos'
            ];
        }
        
        return Inertia::render('asset-hierarchy/shifts/dependencies', [
            'shift' => $shift,
            'dependencies' => $dependencies,
            'hasDependencies' => true
        ]);
    }

    /**
     * Verifica se há sobreposição entre dois intervalos de tempo
     */
    protected function hasOverlap(string $start1, string $end1, string $start2, string $end2): bool
    {
        $start1Minutes = $this->timeToMinutes($start1);
        $end1Minutes = $this->timeToMinutes($end1);
        $start2Minutes = $this->timeToMinutes($start2);
        $end2Minutes = $this->timeToMinutes($end2);

        // Se um dos intervalos cruza a meia-noite
        if ($end1Minutes < $start1Minutes) {
            $end1Minutes += 24 * 60;
        }
        if ($end2Minutes < $start2Minutes) {
            $end2Minutes += 24 * 60;
        }

        return !($end1Minutes <= $start2Minutes || $end2Minutes <= $start1Minutes);
    }

    /**
     * Convert time string to minutes
     */
    protected function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        return ((int) $parts[0] * 60) + (int) $parts[1];
    }

    /**
     * Calculate shift totals from schedules array
     */
    protected function calculateShiftTotals(array $schedules): array
    {
        $totalWorkMinutes = 0;
        $totalBreakMinutes = 0;

        foreach ($schedules as $schedule) {
            foreach ($schedule['shifts'] as $shift) {
                if ($shift['active']) {
                    // Calculate work time
                    $start = $this->timeToMinutes($shift['start_time']);
                    $end = $this->timeToMinutes($shift['end_time']);
                    
                    // Handle overnight shifts
                    if ($end < $start) {
                        $workMinutes = (24 * 60 - $start) + $end;
                    } else {
                        $workMinutes = $end - $start;
                    }
                    
                    // Subtract break time
                    foreach ($shift['breaks'] as $break) {
                        $breakStart = $this->timeToMinutes($break['start_time']);
                        $breakEnd = $this->timeToMinutes($break['end_time']);
                        
                        if ($breakEnd < $breakStart) {
                            $breakMinutes = (24 * 60 - $breakStart) + $breakEnd;
                        } else {
                            $breakMinutes = $breakEnd - $breakStart;
                        }
                        
                        $totalBreakMinutes += $breakMinutes;
                        $workMinutes -= $breakMinutes;
                    }
                    
                    $totalWorkMinutes += $workMinutes;
                }
            }
        }

        return [
            'work_hours' => floor($totalWorkMinutes / 60),
            'work_minutes' => $totalWorkMinutes % 60,
            'break_hours' => floor($totalBreakMinutes / 60),
            'break_minutes' => $totalBreakMinutes % 60,
        ];
    }
} 