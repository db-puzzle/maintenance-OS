<?php

use App\Http\Controllers\Maintenance\RoutineController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {

    // Routines Management
    Route::prefix('routines')->name('routines.')->group(function () {
        // Dashboard route - now shows work order metrics instead of executions
        Route::get('/dashboard', function (\Illuminate\Http\Request $request) {
            $filters = $request->only([
                'search',
                'asset_ids',
                'routine_ids',
                'status',
                'date_preset',
                'date_from',
                'date_to',
            ]);

            // Handle date presets
            if (! empty($filters['date_preset']) && $filters['date_preset'] !== 'custom') {
                $now = now();
                switch ($filters['date_preset']) {
                    case 'today':
                        $filters['date_from'] = $now->toDateString();
                        $filters['date_to'] = $now->toDateString();
                        break;
                    case 'yesterday':
                        $yesterday = $now->copy()->subDay();
                        $filters['date_from'] = $yesterday->toDateString();
                        $filters['date_to'] = $yesterday->toDateString();
                        break;
                    case 'this_week':
                        $filters['date_from'] = $now->copy()->startOfWeek()->toDateString();
                        $filters['date_to'] = $now->copy()->endOfWeek()->toDateString();
                        break;
                    case 'last_week':
                        $lastWeek = $now->copy()->subWeek();
                        $filters['date_from'] = $lastWeek->startOfWeek()->toDateString();
                        $filters['date_to'] = $lastWeek->endOfWeek()->toDateString();
                        break;
                    case 'this_month':
                        $filters['date_from'] = $now->copy()->startOfMonth()->toDateString();
                        $filters['date_to'] = $now->copy()->endOfMonth()->toDateString();
                        break;
                    case 'last_month':
                        $lastMonth = $now->copy()->subMonth();
                        $filters['date_from'] = $lastMonth->startOfMonth()->toDateString();
                        $filters['date_to'] = $lastMonth->endOfMonth()->toDateString();
                        break;
                    case 'last_30_days':
                        $filters['date_from'] = $now->copy()->subDays(30)->toDateString();
                        $filters['date_to'] = $now->toDateString();
                        break;
                    case 'last_90_days':
                        $filters['date_from'] = $now->copy()->subDays(90)->toDateString();
                        $filters['date_to'] = $now->toDateString();
                        break;
                }
            }

            // Get upcoming work orders from routines
            $workOrderGenerationService = app(\App\Services\WorkOrders\WorkOrderGenerationService::class);
            $upcomingWorkOrders = $workOrderGenerationService->previewUpcomingWorkOrders(30);

            return Inertia::render('maintenance/routines/dashboard', [
                'upcomingWorkOrders' => $upcomingWorkOrders,
                'filters' => $filters,
                'filterOptions' => [
                    'assets' => \App\Models\AssetHierarchy\Asset::select('id', 'tag', 'description')
                        ->whereHas('routines')
                        ->orderBy('tag')
                        ->get()
                        ->map(fn ($asset) => [
                            'value' => $asset->id,
                            'label' => "{$asset->tag} - {$asset->description}",
                        ]),

                    'routines' => \App\Models\Maintenance\Routine::select('id', 'name', 'description')
                        ->orderBy('name')
                        ->get()
                        ->map(fn ($routine) => [
                            'value' => $routine->id,
                            'label' => $routine->name,
                        ]),

                    'statuses' => [
                        ['value' => 'Active', 'label' => 'Active'],
                        ['value' => 'Inactive', 'label' => 'Inactive'],
                    ],

                    'datePresets' => [
                        ['value' => 'today', 'label' => 'Today'],
                        ['value' => 'yesterday', 'label' => 'Yesterday'],
                        ['value' => 'this_week', 'label' => 'This Week'],
                        ['value' => 'last_week', 'label' => 'Last Week'],
                        ['value' => 'this_month', 'label' => 'This Month'],
                        ['value' => 'last_month', 'label' => 'Last Month'],
                        ['value' => 'last_30_days', 'label' => 'Last 30 Days'],
                        ['value' => 'last_90_days', 'label' => 'Last 90 Days'],
                        ['value' => 'custom', 'label' => 'Custom Range'],
                    ],
                ],
            ]);
        })->name('dashboard');

        // Routine management routes (API only - UI handled by sheets)
        Route::post('/', [RoutineController::class, 'store'])->name('store');
        Route::put('/{routine}', [RoutineController::class, 'update'])->name('update');
        Route::delete('/{routine}', [RoutineController::class, 'destroy'])->name('destroy');
        Route::post('/{routine}/forms', [RoutineController::class, 'storeForm'])->name('forms.store');
        Route::post('/{routine}/forms/publish', [RoutineController::class, 'publishForm'])->name('forms.publish');
        Route::get('/{routine}/form-data', [RoutineController::class, 'getFormData'])->name('form-data');
    });

    // Routines in the context of specific assets
    Route::prefix('assets/{asset}')->name('assets.')->group(function () {
        Route::post('/routines', [RoutineController::class, 'storeAssetRoutine'])->name('routines.store');
        Route::put('/routines/{routine}', [RoutineController::class, 'updateAssetRoutine'])->name('routines.update');
        Route::delete('/routines/{routine}', [RoutineController::class, 'destroyAssetRoutine'])->name('routines.destroy');

        // Get work order history for an asset
        Route::get('/work-order-history', [RoutineController::class, 'getAssetWorkOrderHistory'])->name('work-order-history');

        // Forms for routines in the context of assets
        Route::post('/routines/{routine}/forms', [RoutineController::class, 'storeAssetRoutineForm'])->name('routines.forms.store');
        Route::post('/routines/{routine}/forms/publish', [RoutineController::class, 'publishAssetRoutineForm'])->name('routines.forms.publish');
    });
});
