<?php

namespace App\Http\Controllers\AssetHierarchy;

use App\Http\Controllers\Controller;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetType;
use App\Models\AssetHierarchy\Manufacturer;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        // Check if user can view any assets
        $this->authorize('viewAny', Asset::class);

        $perPage = $request->input('per_page', 8);
        $search = $request->input('search');
        $sort = $request->input('sort', 'tag');
        $direction = $request->input('direction', 'asc');

        $user = Auth::user();
        $query = Asset::query()
            ->with([
                'assetType:id,name',
                'manufacturer:id,name',
                'plant:id,name',
                'area.plant:id,name',
                'sector:id,name',
                'shift:id,name',
            ])
            ->withCount('routines');

        // Filter assets based on user permissions (unless administrator)
        if (!$user->isAdministrator()) {
            $query->where(function ($q) use ($user) {
                // Get all user permissions
                $permissions = $user->getAllPermissions()->pluck('name')->toArray();
                
                // Extract entity IDs from permissions
                $assetIds = [];
                $sectorIds = [];
                $areaIds = [];
                $plantIds = [];
                
                foreach ($permissions as $permission) {
                    // Direct asset permissions
                    if (preg_match('/^assets\.(view|viewAny|manage|execute-routines)\.(\d+)$/', $permission, $matches)) {
                        $assetIds[] = $matches[2];
                    }
                    // Sector-scoped permissions
                    elseif (preg_match('/^assets\.(viewAny|manage|execute-routines)\.sector\.(\d+)$/', $permission, $matches)) {
                        $sectorIds[] = $matches[2];
                    }
                    // Area-scoped permissions
                    elseif (preg_match('/^assets\.(viewAny|manage|execute-routines)\.area\.(\d+)$/', $permission, $matches)) {
                        $areaIds[] = $matches[2];
                    }
                    // Plant-scoped permissions
                    elseif (preg_match('/^assets\.(viewAny|manage|execute-routines)\.plant\.(\d+)$/', $permission, $matches)) {
                        $plantIds[] = $matches[2];
                    }
                }
                
                // Build query conditions
                if (!empty($assetIds)) {
                    $q->orWhereIn('id', $assetIds);
                }
                if (!empty($sectorIds)) {
                    $q->orWhereIn('sector_id', $sectorIds);
                }
                if (!empty($areaIds)) {
                    $q->orWhereHas('sector', function ($sq) use ($areaIds) {
                        $sq->whereIn('area_id', $areaIds);
                    });
                }
                if (!empty($plantIds)) {
                    $q->orWhereHas('sector.area', function ($sq) use ($plantIds) {
                        $sq->whereIn('plant_id', $plantIds);
                    });
                }
            });
        }

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(assets.tag) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(assets.manufacturer) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(assets.description) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(assets.serial_number) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(assets.part_number) LIKE ?', ["%{$search}%"])
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('plants')
                            ->whereColumn('plants.id', 'assets.plant_id')
                            ->whereRaw('LOWER(plants.name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('areas')
                            ->whereColumn('areas.id', 'assets.area_id')
                            ->whereRaw('LOWER(areas.name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('sectors')
                            ->whereColumn('sectors.id', 'assets.sector_id')
                            ->whereRaw('LOWER(sectors.name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereExists(function ($query) use ($search) {
                        $query->from('manufacturers')
                            ->whereColumn('manufacturers.id', 'assets.manufacturer_id')
                            ->whereRaw('LOWER(manufacturers.name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        switch ($sort) {
            case 'asset_type':
                $query->leftJoin('asset_types', 'assets.asset_type_id', '=', 'asset_types.id')
                    ->orderBy('asset_types.name', $direction)
                    ->select('assets.*');
                break;
            case 'serial_number':
                $query->orderBy('assets.serial_number', $direction);
                break;
            case 'part_number':
                $query->orderBy('assets.part_number', $direction);
                break;
            case 'sector':
                $query->leftJoin('sectors', 'assets.sector_id', '=', 'sectors.id')
                    ->orderBy('sectors.name', $direction)
                    ->select('assets.*');
                break;
            case 'area':
                $query->leftJoin('areas', 'assets.area_id', '=', 'areas.id')
                    ->orderBy('areas.name', $direction)
                    ->select('assets.*');
                break;
            case 'plant':
                $query->leftJoin('plants', 'assets.plant_id', '=', 'plants.id')
                    ->orderBy('plants.name', $direction)
                    ->select('assets.*');
                break;
            case 'shift':
                $query->leftJoin('shifts', 'assets.shift_id', '=', 'shifts.id')
                    ->orderBy('shifts.name', $direction)
                    ->select('assets.*');
                break;
            case 'routines_count':
                $query->orderBy('routines_count', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $asset = $query->paginate($perPage)->withQueryString();

        return Inertia::render('asset-hierarchy/assets/index', [
            'asset' => $asset,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function createNew() //Open the asset creation page
    {
        // Check if user can create assets (they need at least one create permission)
        // This is used only to determine if the user can actually open the asset creation page
        $user = Auth::user();
        if (!$user->isAdministrator()) {
            $permissions = $user->getAllPermissions()->pluck('name')->toArray();
            $hasCreatePermission = false;
            
            foreach ($permissions as $permission) {
                if (str_starts_with($permission, 'assets.create.') || str_starts_with($permission, 'assets.manage.')) {
                    $hasCreatePermission = true;
                    break;
                }
            }
            
            if (!$hasCreatePermission) {
                abort(403, 'You do not have permission to create assets.');
            }
        }
        
        // Redirect to the show page with the "new" parameter and informacoes tab
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => 'new', 'tab' => 'informacoes']);
    }

    public function store(Request $request)
    {
        // First validate the request
        $validated = $request->validate([
            'tag' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'part_number' => 'nullable|string|max:255',
            'asset_type_id' => 'nullable|exists:asset_types,id',
            'description' => 'nullable|string',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'manufacturing_year' => 'nullable|integer|min:1900|max:'.date('Y'),
            'plant_id' => 'required|exists:plants,id',
            'area_id' => 'nullable|exists:areas,id|required_with:sector_id',
            'sector_id' => 'nullable|exists:sectors,id',
            'shift_id' => 'nullable|exists:shifts,id',
            'photo' => 'nullable|image|max:2048',
        ]);

        // Check if user has permission to create assets in the specified location
        $this->authorize('create', [Asset::class, [
            'sector_id' => $validated['sector_id'] ?? null,
            'area_id' => $validated['area_id'] ?? null,
            'plant_id' => $validated['plant_id'] ?? null,
        ]]);

        // Valida se a área pertence à planta quando ambas são fornecidas
        if (! empty($validated['area_id']) && ! empty($validated['plant_id'])) {
            $area = Area::findOrFail($validated['area_id']);
            $plantId = (int) $validated['plant_id'];

            if ((int) $area->plant_id !== $plantId) {
                throw ValidationException::withMessages([
                    'area_id' => ['A área selecionada não pertence à planta escolhida.'],
                ]);
            }
        }

        // Valida se o setor pertence à área quando fornecido
        if (! empty($validated['sector_id']) && ! empty($validated['area_id'])) {
            $sector = Sector::findOrFail($validated['sector_id']);
            if ((int) $sector->area_id !== (int) $validated['area_id']) {
                throw ValidationException::withMessages([
                    'sector_id' => ['O setor selecionado não pertence à área escolhida.'],
                ]);
            }
        }

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('asset-photos', 'public');
            $validated['photo_path'] = $path;
        }

        $asset = Asset::create($validated);

        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset, 'tab' => 'rotinas'])
            ->with('success', "Ativo {$asset->tag} criado com sucesso.");
    }

    public function edit(Asset $asset)
    {
        // Check if user can update this asset
        $this->authorize('update', $asset);
        
        // Redirect to the show page with the informacoes tab
        return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset->id, 'tab' => 'informacoes']);
    }

    public function show($asset)
    {
        // Check if we're creating a new asset
        if ($asset === 'new') {
            return Inertia::render('asset-hierarchy/assets/show', [
                'asset' => null,
                'assetTypes' => AssetType::all(),
                'manufacturers' => Manufacturer::orderBy('id')->get(),
                'plants' => Plant::with('areas.sectors')->get(),
                'isCreating' => true,
            ]);
        }

        // Otherwise, it's an existing asset
        $loadedAsset = Asset::findOrFail($asset);
        
        // Check if user can view this asset
        $this->authorize('view', $loadedAsset);
        
        $loadedAsset->load([
            'assetType',
            'manufacturer',
            'plant',
            'area.plant',
            'sector',
            'routines.form.currentVersion.tasks',
            'routines.form.draftTasks',
            'routines.lastExecutionFormVersion',
            'routines.asset.shift.schedules.shiftTimes.breaks',
            'latestRuntimeMeasurement.user',
            'shift.schedules.shiftTimes.breaks',
        ]);

        // Include shift_id and runtime data in the response
        $assetData = $loadedAsset->toArray();
        $assetData['shift_id'] = $loadedAsset->shift_id;
        
        // Ensure routines are properly included with updated fields
        $assetData['routines'] = $loadedAsset->routines->map(function ($routine) {
            return [
                'id' => $routine->id,
                'name' => $routine->name,
                'description' => $routine->description,
                'trigger_type' => $routine->trigger_type,
                'trigger_runtime_hours' => $routine->trigger_runtime_hours,
                'trigger_calendar_days' => $routine->trigger_calendar_days,
                'execution_mode' => $routine->execution_mode,
                'advance_generation_days' => $routine->advance_generation_days,
                'auto_approve_work_orders' => $routine->auto_approve_work_orders,
                'priority_score' => $routine->priority_score,
                'last_execution_runtime_hours' => $routine->last_execution_runtime_hours,
                'last_execution_completed_at' => $routine->last_execution_completed_at,
                'last_execution_form_version_id' => $routine->last_execution_form_version_id,
                'next_execution_date' => $routine->next_execution_date?->toIso8601String(),
                'lastExecutionFormVersion' => $routine->lastExecutionFormVersion ? [
                    'id' => $routine->lastExecutionFormVersion->id,
                    'version_number' => $routine->lastExecutionFormVersion->version_number,
                ] : null,
                'form_id' => $routine->form_id,
                'form' => $routine->form ? [
                    'id' => $routine->form->id,
                    'name' => $routine->form->name,
                    // Show draft tasks if available, otherwise show published tasks
                    'tasks' => $routine->form->draftTasks->count() > 0 
                        ? $routine->form->draftTasks->map(function ($task) {
                            return [
                                'id' => $task->id,
                                'type' => $task->type,
                                'description' => $task->description,
                                'is_required' => $task->is_required,
                                'position' => $task->position,
                            ];
                        })
                        : ($routine->form->currentVersion && $routine->form->currentVersion->tasks 
                            ? $routine->form->currentVersion->tasks->map(function ($task) {
                                return [
                                    'id' => $task->id,
                                    'type' => $task->type,
                                    'description' => $task->description,
                                    'is_required' => $task->is_required,
                                    'position' => $task->position,
                                ];
                            })
                            : collect()
                        ),
                    'current_version' => $routine->form->currentVersion ? [
                        'id' => $routine->form->currentVersion->id,
                        'version_number' => $routine->form->currentVersion->version_number,
                        'published_at' => $routine->form->currentVersion->published_at,
                    ] : null,
                    'current_version_id' => $routine->form->currentVersion?->id,
                    'has_draft_changes' => $routine->form->draftTasks->count() > 0,
                ] : null,
                'is_active' => $routine->is_active,
            ];
        })->toArray();

        // Add runtime data with calculation details
        $calculationDetails = $loadedAsset->getRuntimeCalculationDetails();

        // Get the authenticated user for timezone conversion
        $user = Auth::user();

        $assetData['runtime_data'] = [
            'current_hours' => $calculationDetails['current_runtime_hours'],
            'last_measurement' => $loadedAsset->latestRuntimeMeasurement ? [
                'hours' => $loadedAsset->latestRuntimeMeasurement->reported_hours,
                'datetime' => $user->convertFromUTC($loadedAsset->latestRuntimeMeasurement->measurement_datetime)->toIso8601String(),
                'created_at' => $user->convertFromUTC($loadedAsset->latestRuntimeMeasurement->created_at)->toIso8601String(),
                'user_name' => $loadedAsset->latestRuntimeMeasurement->user->name ?? null,
                'source' => $loadedAsset->latestRuntimeMeasurement->source ?? 'manual',
            ] : null,
            'calculation_details' => $calculationDetails,
            'user_timezone' => $user->timezone ?? 'UTC',
        ];

        // Check for newRoutineId in session flash data
        $newRoutineId = session('newRoutineId');

        return Inertia::render('asset-hierarchy/assets/show', [
            'asset' => $assetData,
            'assetTypes' => AssetType::all(),
            'manufacturers' => Manufacturer::orderBy('id')->get(),
            'plants' => Plant::with('areas.sectors')->get(),
            'isCreating' => false,
            'newRoutineId' => $newRoutineId,
        ]);
    }

    public function update(Request $request, Asset $asset)
    {
        // Check if user can update this asset
        $this->authorize('update', $asset);
        
        try {
            // Verifica se os dados estão vindo corretamente
            if (empty($request->all()) && empty($request->allFiles())) {
                throw ValidationException::withMessages([
                    'general' => ['Nenhum dado foi recebido na requisição.'],
                ]);
            }

            // Check if this is just a shift update
            if ($request->has('shift_id') && count($request->all()) === 1) {
                $validated = $request->validate([
                    'shift_id' => 'nullable|exists:shifts,id',
                ]);

                // Get the old shift_id before updating
                $oldShiftId = $asset->shift_id;
                $newShiftId = $validated['shift_id'] ? (int) $validated['shift_id'] : null;

                // Only create a runtime measurement if the shift is actually changing
                if ($oldShiftId !== $newShiftId) {
                    // Calculate current runtime before the shift change
                    $currentRuntime = $asset->current_runtime_hours;

                    // Create a runtime measurement to record the current state
                    $user = Auth::user();
                    $asset->runtimeMeasurements()->create([
                        'user_id' => $user->id,
                        'reported_hours' => $currentRuntime,
                        'source' => 'shift_change',
                        'notes' => $oldShiftId
                            ? "Horímetro registrado automaticamente devido à mudança de turno (ID: {$oldShiftId} → ".($newShiftId ?: 'Nenhum').')'
                            : "Horímetro registrado automaticamente devido à atribuição de turno (Nenhum → ID: {$newShiftId})",
                        'measurement_datetime' => now(),
                    ]);
                }

                $asset->update($validated);

                return response()->json([
                    'success' => true,
                    'message' => 'Turno associado com sucesso',
                ]);
            }

            // Converte os dados do formulário para o formato esperado
            $data = $request->all();
            if ($request->has('asset_type_id')) {
                $data['asset_type_id'] = (int) $request->input('asset_type_id');
            }
            if ($request->has('plant_id')) {
                $data['plant_id'] = (int) $request->input('plant_id');
            }
            if ($request->has('area_id') && ! empty($request->input('area_id'))) {
                $data['area_id'] = (int) $request->input('area_id');
            }
            if ($request->has('sector_id') && ! empty($request->input('sector_id'))) {
                $data['sector_id'] = (int) $request->input('sector_id');
            }
            if ($request->has('manufacturing_year') && ! empty($request->input('manufacturing_year'))) {
                $data['manufacturing_year'] = (int) $request->input('manufacturing_year');
            }
            if ($request->has('shift_id') && ! empty($request->input('shift_id'))) {
                $data['shift_id'] = (int) $request->input('shift_id');
            }

            $validated = $request->validate([
                'tag' => 'required|string|max:255',
                'serial_number' => 'nullable|string|max:255',
                'part_number' => 'nullable|string|max:255',
                'asset_type_id' => 'nullable|exists:asset_types,id',
                'description' => 'nullable|string',
                'manufacturer_id' => 'nullable|exists:manufacturers,id',
                'manufacturing_year' => 'nullable|integer|min:1900|max:'.date('Y'),
                'plant_id' => 'required|exists:plants,id',
                'area_id' => 'nullable|exists:areas,id|required_with:sector_id',
                'sector_id' => 'nullable|exists:sectors,id',
                'shift_id' => 'nullable|exists:shifts,id',
                'photo' => 'nullable|image|max:2048',
            ]);

            // Check if shift is changing in the full update
            if (array_key_exists('shift_id', $validated)) {
                $oldShiftId = $asset->shift_id;
                $newShiftId = $validated['shift_id'] ? (int) $validated['shift_id'] : null;

                // Only create a runtime measurement if the shift is actually changing
                if ($oldShiftId !== $newShiftId) {
                    // Calculate current runtime before the shift change
                    $currentRuntime = $asset->current_runtime_hours;

                    // Create a runtime measurement to record the current state
                    $user = Auth::user();
                    $asset->runtimeMeasurements()->create([
                        'user_id' => $user->id,
                        'reported_hours' => $currentRuntime,
                        'source' => 'shift_change',
                        'notes' => $oldShiftId
                            ? "Horímetro registrado automaticamente devido à mudança de turno (ID: {$oldShiftId} → ".($newShiftId ?: 'Nenhum').')'
                            : "Horímetro registrado automaticamente devido à atribuição de turno (Nenhum → ID: {$newShiftId})",
                        'measurement_datetime' => now(),
                    ]);
                }
            }

            // Valida se a área pertence à planta quando ambas são fornecidas
            if (! empty($validated['area_id']) && ! empty($validated['plant_id'])) {
                $area = Area::findOrFail($validated['area_id']);
                $plantId = (int) $validated['plant_id'];

                if ((int) $area->plant_id !== $plantId) {
                    throw ValidationException::withMessages([
                        'area_id' => ['A área selecionada não pertence à planta escolhida.'],
                    ]);
                }
            }

            // Valida se o setor pertence à área quando fornecido
            if (! empty($validated['sector_id']) && ! empty($validated['area_id'])) {
                $sector = Sector::findOrFail($validated['sector_id']);
                if ((int) $sector->area_id !== (int) $validated['area_id']) {
                    throw ValidationException::withMessages([
                        'sector_id' => ['O setor selecionado não pertence à área escolhida.'],
                    ]);
                }
            }

            if ($request->hasFile('photo')) {
                // Remove a foto antiga se existir
                if ($asset->photo_path) {
                    Storage::disk('public')->delete($asset->photo_path);
                }
                $path = $request->file('photo')->store('asset-photos', 'public');
                $validated['photo_path'] = $path;
            } else {
                // Se não há nova foto, mantém a foto antiga
                unset($validated['photo_path']);
            }

            $asset->update($validated);

            return redirect()->route('asset-hierarchy.assets.show', ['asset' => $asset, 'tab' => 'rotinas'])
                ->with('success', "O ativo {$asset->tag} foi atualizado com sucesso.");
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Ocorreu um erro ao atualizar o ativo. Por favor, tente novamente.');
        }
    }

    public function destroy(Asset $asset)
    {
        // Check if user can delete this asset
        $this->authorize('delete', $asset);
        
        $assetTag = $asset->tag;

        if ($asset->photo_path) {
            Storage::disk('public')->delete($asset->photo_path);
        }

        $asset->delete();

        return redirect()->route('asset-hierarchy.assets')
            ->with('success', "O ativo {$assetTag} foi excluído com sucesso.");
    }

    public function removePhoto(Asset $asset)
    {
        // Check if user can update this asset
        $this->authorize('update', $asset);
        
        if ($asset->photo_path) {
            Storage::disk('public')->delete($asset->photo_path);
            $asset->update(['photo_path' => null]);

            return back()->with('success', 'Foto removida com sucesso.');
        }

        return back()->with('error', 'Não foi possível remover a foto.');
    }

    /**
     * Get runtime data for an asset
     */
    public function getRuntimeData(Asset $asset)
    {
        // Check if user can view this asset
        $this->authorize('view', $asset);
        
        $asset->load('latestRuntimeMeasurement.user', 'shift');

        // Get the authenticated user for timezone conversion
        $user = Auth::user();

        $response = [
            'current_hours' => $asset->current_runtime_hours,
            'last_measurement' => $asset->latestRuntimeMeasurement ? [
                'hours' => $asset->latestRuntimeMeasurement->reported_hours,
                'datetime' => $user->convertFromUTC($asset->latestRuntimeMeasurement->measurement_datetime)->toIso8601String(),
                'created_at' => $user->convertFromUTC($asset->latestRuntimeMeasurement->created_at)->toIso8601String(),
                'user_name' => $asset->latestRuntimeMeasurement->user->name ?? null,
                'source' => $asset->latestRuntimeMeasurement->source ?? 'manual',
            ] : null,
            'calculation_details' => $asset->getRuntimeCalculationDetails(),
            'user_timezone' => $user->timezone ?? 'UTC',
        ];

        return response()->json($response);
    }

    /**
     * Report a new runtime measurement
     */
    public function reportRuntime(Request $request, Asset $asset)
    {
        // Check if user can execute routines (which includes reporting runtime)
        $this->authorize('executeRoutines', $asset);
        
        $validated = $request->validate([
            'reported_hours' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'measurement_datetime' => 'nullable|date|before_or_equal:now',
        ], [
            'measurement_datetime.before_or_equal' => 'A data e hora da medição não pode ser no futuro.',
            'reported_hours.required' => 'O campo de horas é obrigatório.',
            'reported_hours.numeric' => 'O campo de horas deve ser um número.',
            'reported_hours.min' => 'O valor de horas não pode ser negativo.',
        ]);

        // Get the authenticated user
        $user = Auth::user();

        // Convert measurement datetime from user's timezone to UTC
        if (isset($validated['measurement_datetime'])) {
            $userDateTime = $validated['measurement_datetime'];

            // Check if the datetime is already in UTC (ends with 'Z' or contains '+00:00')
            if (str_ends_with($userDateTime, 'Z') || str_contains($userDateTime, '+00:00')) {
                // Already in UTC, just parse it
                $measurementDatetime = Carbon::parse($userDateTime);
            } else {
                // Not in UTC, convert from user's timezone
                $measurementDatetime = $user->convertToUTC($userDateTime);
            }
        } else {
            // If no datetime provided, use current time in UTC
            $measurementDatetime = now();
        }

        // Create the runtime measurement record
        $measurement = $asset->runtimeMeasurements()->create([
            'user_id' => $user->id,
            'reported_hours' => $validated['reported_hours'],
            'source' => 'manual',
            'notes' => $validated['notes'] ?? null,
            'measurement_datetime' => $measurementDatetime,
        ]);

        // Return the updated runtime data
        $measurement->load('user');
        $asset->load('latestRuntimeMeasurement.user');

        return response()->json([
            'success' => true,
            'message' => 'Horímetro reportado com sucesso',
            'runtime_data' => [
                'current_hours' => $asset->current_runtime_hours,
                'last_measurement' => [
                    'hours' => $measurement->reported_hours,
                    'datetime' => $user->convertFromUTC($measurement->measurement_datetime)->toIso8601String(),
                    'created_at' => $user->convertFromUTC($measurement->created_at)->toIso8601String(),
                    'user_name' => $measurement->user->name ?? null,
                    'source' => $measurement->source ?? 'manual',
                ],
                'user_timezone' => $user->timezone ?? 'UTC',
            ],
        ]);
    }

    /**
     * Get runtime history for an asset
     */
    public function getRuntimeHistory(Request $request, Asset $asset)
    {
        // Check if user can view this asset
        $this->authorize('view', $asset);
        
        $perPage = $request->input('per_page', 10);
        $sort = $request->input('sort', 'measurement_datetime');
        $direction = $request->input('direction', 'desc');

        // Build query with sorting
        $query = $asset->runtimeMeasurements()
            ->with('user');

        // Apply sorting
        if (in_array($sort, ['measurement_datetime', 'reported_hours', 'source', 'created_at'])) {
            $query->orderBy($sort, $direction);
        } else {
            $query->orderBy('measurement_datetime', 'desc');
        }

        $measurements = $query->paginate($perPage);

        return response()->json($measurements);
    }

    /**
     * Get detailed runtime calculation breakdown
     */
    public function getRuntimeCalculationDetails(Asset $asset)
    {
        // Check if user can view this asset
        $this->authorize('view', $asset);
        
        $asset->load('shift', 'latestRuntimeMeasurement');

        return response()->json([
            'asset_tag' => $asset->tag,
            'calculation' => $asset->getRuntimeCalculationDetails(),
            'shift_info' => $asset->shift ? [
                'name' => $asset->shift->name,
                'schedules_count' => $asset->shift->schedules()->count(),
            ] : null,
        ]);
    }

    /**
     * Get detailed runtime breakdown for debugging
     */
    public function getRuntimeBreakdown(Asset $asset)
    {
        // Check if user can view this asset
        $this->authorize('view', $asset);
        
        $asset->load('shift.schedules.shiftTimes.breaks', 'latestRuntimeMeasurement');

        return response()->json([
            'asset_tag' => $asset->tag,
            'breakdown' => $asset->getDetailedRuntimeBreakdown(),
        ]);
    }

    /**
     * Get work order history for an asset
     */
    public function getWorkOrderHistory(Request $request, Asset $asset)
    {
        // Check if user can view this asset
        $this->authorize('view', $asset);
        
        $perPage = $request->input('per_page', 10);
        $page = $request->input('page', 1);
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        $category = $request->input('category', 'preventive'); // Default to preventive
        
        $query = $asset->workOrders()
            ->with([
                'type',
                'execution.executedBy',
                'requestedBy',
                'approvedBy',
                'form.currentVersion'
            ]);
            
        // Filter by category if provided
        if ($category) {
            $query->byCategory($category);
        }
        
        // Apply sorting with proper handling for related table fields
        switch ($sort) {
            case 'started_at':
                $query->leftJoin('work_order_executions', 'work_orders.id', '=', 'work_order_executions.work_order_id')
                      ->orderBy('work_order_executions.started_at', $direction)
                      ->select('work_orders.*');
                break;
            case 'completed_at':
                $query->leftJoin('work_order_executions', 'work_orders.id', '=', 'work_order_executions.work_order_id')
                      ->orderBy('work_order_executions.completed_at', $direction)
                      ->select('work_orders.*');
                break;
            case 'executor_name':
                $query->leftJoin('work_order_executions', 'work_orders.id', '=', 'work_order_executions.work_order_id')
                      ->leftJoin('users', 'work_order_executions.executed_by', '=', 'users.id')
                      ->orderBy('users.name', $direction)
                      ->select('work_orders.*');
                break;
            case 'routine_name':
                $query->leftJoin('routines', function ($join) {
                          $join->on('work_orders.source_id', '=', 'routines.id')
                               ->where('work_orders.source_type', '=', 'routine');
                      })
                      ->orderBy('routines.name', $direction)
                      ->select('work_orders.*');
                break;
            default:
                // For fields that exist in the work_orders table
                $query->orderBy($sort, $direction);
                break;
        }
        
        $workOrders = $query->paginate($perPage, ['*'], 'page', $page);
        
        // Load sourceRoutine relationship for work orders with source_type = 'routine'
        $workOrders->getCollection()->load('sourceRoutine');
        
        // Transform the data to match ExecutionHistory expected format
        $transformedData = $workOrders->getCollection()->map(function ($workOrder) {
            $execution = $workOrder->execution;
            
            return [
                'id' => $workOrder->id,
                'work_order_id' => $workOrder->id,
                'work_order_number' => $workOrder->work_order_number,
                'title' => $workOrder->title,
                'priority' => $workOrder->priority,
                'routine' => ($workOrder->source_type === 'routine' && $workOrder->sourceRoutine) ? [
                    'id' => $workOrder->sourceRoutine->id,
                    'name' => $workOrder->sourceRoutine->name,
                    'description' => $workOrder->sourceRoutine->description,
                ] : null,
                'routine_name' => ($workOrder->source_type === 'routine' && $workOrder->sourceRoutine) ? $workOrder->sourceRoutine->name : $workOrder->title,
                'executor' => $execution && $execution->executedBy ? [
                    'id' => $execution->executedBy->id,
                    'name' => $execution->executedBy->name,
                ] : null,
                'executor_name' => $execution && $execution->executedBy ? $execution->executedBy->name : null,
                'form_version' => $workOrder->form && $workOrder->form->currentVersion ? [
                    'id' => $workOrder->form->currentVersion->id,
                    'version_number' => $workOrder->form->currentVersion->version_number,
                    'published_at' => $workOrder->form->currentVersion->published_at,
                ] : null,
                'status' => $workOrder->status,
                'scheduled_start_date' => $workOrder->scheduled_start_date,
                'started_at' => $execution ? $execution->started_at : null,
                'completed_at' => $execution ? $execution->completed_at : null,
                'duration_minutes' => $execution && $execution->started_at && $execution->completed_at 
                    ? $execution->started_at->diffInMinutes($execution->completed_at) 
                    : null,
                'progress' => $this->calculateWorkOrderProgress($workOrder),
                'task_summary' => $this->getTaskSummary($workOrder),
                'created_at' => $workOrder->created_at,
                'updated_at' => $workOrder->updated_at,
            ];
        });
        
        return response()->json([
            'data' => $transformedData,
            'current_page' => $workOrders->currentPage(),
            'last_page' => $workOrders->lastPage(),
            'per_page' => $workOrders->perPage(),
            'total' => $workOrders->total(),
            'from' => $workOrders->firstItem(),
            'to' => $workOrders->lastItem(),
        ]);
    }
    
    /**
     * Calculate work order progress percentage
     */
    private function calculateWorkOrderProgress($workOrder): int
    {
        if (!$workOrder->execution || !$workOrder->form) {
            // If no form, base progress on status
            switch ($workOrder->status) {
                case 'completed':
                    return 100;
                case 'in_progress':
                    return 50;
                case 'approved':
                case 'planned':
                    return 25;
                default:
                    return 0;
            }
        }
        
        $formVersion = $workOrder->form->currentVersion;
        if (!$formVersion) {
            return 0;
        }
        
        $totalTasks = $formVersion->tasks()->count();
        if ($totalTasks === 0) {
            return $workOrder->status === 'completed' ? 100 : 0;
        }
        
        $completedTasks = $workOrder->execution->taskResponses()
            ->whereNotNull('completed_at')
            ->count();
            
        return (int) round(($completedTasks / $totalTasks) * 100);
    }
    
    /**
     * Get task summary for work order
     */
    private function getTaskSummary($workOrder): ?array
    {
        if (!$workOrder->execution || !$workOrder->form) {
            return null;
        }
        
        $formVersion = $workOrder->form->currentVersion;
        if (!$formVersion) {
            return null;
        }
        
        $totalTasks = $formVersion->tasks()->count();
        $completedTasks = $workOrder->execution->taskResponses()
            ->whereNotNull('completed_at')
            ->count();
        $tasksWithIssues = $workOrder->execution->taskResponses()
            ->where('has_issues', true)
            ->count();
            
        return [
            'total' => $totalTasks,
            'completed' => $completedTasks,
            'with_issues' => $tasksWithIssues,
        ];
    }

    /**
     * Check dependencies before deletion
     */
    public function checkDependencies(Asset $asset)
    {
        // Check if user can view this asset
        $this->authorize('view', $asset);
        
        // For now, assets don't have dependencies that prevent deletion
        // In the future, you might want to check for:
        // - Maintenance records
        // - Work orders
        // - Runtime measurements
        // - etc.

        $canDelete = true;
        $dependencies = [];

        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => $dependencies,
        ]);
    }
}
