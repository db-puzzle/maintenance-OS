<?php

use App\Http\Controllers\Maintenance\ExecutionExportController;
use App\Http\Controllers\Maintenance\ExecutionResponseController;
use App\Http\Controllers\Maintenance\InlineRoutineExecutionController;
use App\Http\Controllers\Maintenance\RoutineController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {

    // Routines and Executions
    Route::prefix('routines')->name('routines.')->group(function () {
        // Dashboard route
        Route::get('/dashboard', function (\Illuminate\Http\Request $request) {
            // Extract filters directly from request
            $filters = $request->only([
                'search',
                'asset_ids',
                'routine_ids',
                'executor_ids',
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

            // Convert status to array if it's a single value
            if (isset($filters['status']) && ! is_array($filters['status'])) {
                $filters['status'] = [$filters['status']];
            }

            // Clean up empty arrays
            foreach (['asset_ids', 'routine_ids', 'executor_ids', 'status'] as $key) {
                if (isset($filters[$key]) && empty($filters[$key])) {
                    unset($filters[$key]);
                }
            }

            $filters = array_filter($filters, function ($value) {
                return $value !== null && $value !== '';
            });

            $analyticsService = app(\App\Services\ExecutionAnalyticsService::class);

            return Inertia::render('maintenance/routines/dashboard', [
                'stats' => $analyticsService->getDashboardStats($filters),
                'recentExecutions' => $analyticsService->getRecentExecutions(10), // Show more recent executions
                'dailyTrend' => $analyticsService->getDailyTrend(
                    isset($filters['date_from'], $filters['date_to'])
                        ? \Carbon\Carbon::parse($filters['date_to'])->diffInDays(\Carbon\Carbon::parse($filters['date_from'])) + 1
                        : 30,
                    $filters
                ),
                'performanceMetrics' => $analyticsService->getPerformanceMetrics(),
                'filters' => $filters,
                'filterOptions' => [
                    'assets' => \App\Models\AssetHierarchy\Asset::select('id', 'tag', 'description')
                        ->whereHas('routines.routineExecutions')
                        ->orderBy('tag')
                        ->get()
                        ->map(fn ($asset) => [
                            'value' => $asset->id,
                            'label' => "{$asset->tag} - {$asset->description}",
                        ]),

                    'routines' => \App\Models\Maintenance\Routine::select('id', 'name', 'description')
                        ->whereHas('routineExecutions')
                        ->orderBy('name')
                        ->get()
                        ->map(fn ($routine) => [
                            'value' => $routine->id,
                            'label' => $routine->name,
                        ]),

                    'executors' => \App\Models\User::select('id', 'name')
                        ->whereHas('executedRoutines')
                        ->orderBy('name')
                        ->get()
                        ->map(fn ($user) => [
                            'value' => $user->id,
                            'label' => $user->name,
                        ]),

                    'statuses' => [
                        ['value' => 'pending', 'label' => 'Pending'],
                        ['value' => 'in_progress', 'label' => 'In Progress'],
                        ['value' => 'completed', 'label' => 'Completed'],
                        ['value' => 'cancelled', 'label' => 'Cancelled'],
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

        // Execution viewing routes (previously under /executions)
        Route::get('/', [ExecutionResponseController::class, 'index'])->name('index');
        Route::get('/api', [ExecutionResponseController::class, 'api'])->name('api');
        Route::get('/executions/{execution}', [ExecutionResponseController::class, 'show'])->name('executions.show');

        // Export functionality
        Route::post('/executions/{execution}/export', [ExecutionExportController::class, 'exportSingle'])->name('executions.export.single');
        Route::get('/exports/{export}/status', [ExecutionExportController::class, 'exportStatus'])->name('export.status');
        Route::get('/exports/{export}/download', [ExecutionExportController::class, 'download'])->name('export.download');
        Route::get('/exports', [ExecutionExportController::class, 'userExports'])->name('export.user');
        Route::delete('/exports/{export}', [ExecutionExportController::class, 'cancel'])->name('export.cancel');

        // Routine management routes (API only - UI handled by sheets)
        Route::post('/', [RoutineController::class, 'store'])->name('store');
        Route::put('/{routine}', [RoutineController::class, 'update'])->name('update');
        Route::delete('/{routine}', [RoutineController::class, 'destroy'])->name('destroy');
        Route::post('/{routine}/executions', [RoutineController::class, 'createExecution'])->name('executions.create');
        Route::post('/{routine}/forms', [RoutineController::class, 'storeForm'])->name('forms.store');
        Route::post('/{routine}/forms/publish', [RoutineController::class, 'publishForm'])->name('forms.publish');
        Route::get('/{routine}/form-data', [RoutineController::class, 'getFormData'])->name('form-data');
    });

    // Rotinas no contexto de ativos específicos
    Route::prefix('assets/{asset}')->name('assets.')->group(function () {

        Route::post('/routines', [RoutineController::class, 'storeAssetRoutine'])->name('routines.store');
        Route::put('/routines/{routine}', [RoutineController::class, 'updateAssetRoutine'])->name('routines.update');
        Route::delete('/routines/{routine}', [RoutineController::class, 'destroyAssetRoutine'])->name('routines.destroy');

        // Get execution history for an asset
        Route::get('/execution-history', [RoutineController::class, 'getAssetExecutionHistory'])->name('execution-history');

        // Formulários de rotinas no contexto de ativos
        Route::post('/routines/{routine}/forms', [RoutineController::class, 'storeAssetRoutineForm'])->name('routines.forms.store');
        Route::post('/routines/{routine}/forms/publish', [RoutineController::class, 'publishAssetRoutineForm'])->name('routines.forms.publish');

        // Execuções de rotinas no contexto de ativos
        Route::get('/routines/{routine}/executions', [RoutineController::class, 'assetRoutineExecutions'])->name('routines.executions');
        Route::post('/routines/{routine}/executions', [RoutineController::class, 'storeAssetRoutineExecution'])->name('routines.executions.store');

        // Inline routine execution routes
        Route::prefix('/routines/{routine}/inline-execution')->name('routines.inline-execution.')->group(function () {
            Route::post('/start', [InlineRoutineExecutionController::class, 'startOrGetExecution'])->name('start');
            Route::post('/{execution}/task', [InlineRoutineExecutionController::class, 'saveTaskResponse'])->name('save-task');
            Route::post('/{execution}/complete', [InlineRoutineExecutionController::class, 'completeExecution'])->name('complete');
            Route::post('/{execution}/cancel', [InlineRoutineExecutionController::class, 'cancelExecution'])->name('cancel');
            Route::get('/{execution}/status', [InlineRoutineExecutionController::class, 'getExecutionStatus'])->name('status');
        });
    });
});
