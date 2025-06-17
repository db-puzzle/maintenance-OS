<?php

use App\Http\Controllers\Maintenance\DashboardController;
use App\Http\Controllers\Maintenance\RoutineController;
use App\Http\Controllers\Maintenance\InlineRoutineExecutionController;
use App\Http\Controllers\Maintenance\ExecutionHistoryController;
use App\Http\Controllers\Maintenance\ExecutionResponseController;
use App\Http\Controllers\Maintenance\ExecutionExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {
    // Dashboard de Manutenção
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Execution History and Response Viewer
    Route::prefix('executions')->name('executions.')->group(function () {
        // Dashboard and analytics
        Route::get('/history', [ExecutionHistoryController::class, 'dashboard'])->name('history');
        Route::get('/history/api', [ExecutionHistoryController::class, 'dashboardApi'])->name('history.api');
        Route::get('/performance-metrics', [ExecutionHistoryController::class, 'performanceMetrics'])->name('performance-metrics');
        Route::get('/filter-options', [ExecutionHistoryController::class, 'filterOptions'])->name('filter-options');
        
        // List and detail views
        Route::get('/', [ExecutionResponseController::class, 'index'])->name('index');
        Route::get('/api', [ExecutionResponseController::class, 'api'])->name('api');
        Route::get('/{execution}', [ExecutionResponseController::class, 'show'])->name('show');
        
        // Export functionality
        Route::post('/{execution}/export', [ExecutionExportController::class, 'exportSingle'])->name('export.single');
        Route::post('/export/batch', [ExecutionExportController::class, 'exportBatch'])->name('export.batch');
        Route::get('/exports/{export}/status', [ExecutionExportController::class, 'exportStatus'])->name('export.status');
        Route::get('/exports/{export}/download', [ExecutionExportController::class, 'download'])->name('export.download');
        Route::get('/exports', [ExecutionExportController::class, 'userExports'])->name('export.user');
        Route::delete('/exports/{export}', [ExecutionExportController::class, 'cancel'])->name('export.cancel');
    });
    
    // Rotinas
    Route::prefix('routines')->name('routines.')->group(function () {
        Route::get('/', [RoutineController::class, 'index'])->name('index');
        Route::get('/create', [RoutineController::class, 'create'])->name('create');
        Route::post('/', [RoutineController::class, 'store'])->name('store');
        Route::get('/{routine}', [RoutineController::class, 'show'])->name('show');
        Route::get('/{routine}/edit', [RoutineController::class, 'edit'])->name('edit');
        Route::put('/{routine}', [RoutineController::class, 'update'])->name('update');
        Route::delete('/{routine}', [RoutineController::class, 'destroy'])->name('destroy');
        Route::get('/{routine}/executions', [RoutineController::class, 'executions'])->name('executions');
        Route::post('/{routine}/executions', [RoutineController::class, 'createExecution'])->name('executions.create');
        Route::get('/{routine}/form-editor', [RoutineController::class, 'formEditor'])->name('form-editor');
        Route::post('/{routine}/forms', [RoutineController::class, 'storeForm'])->name('forms.store');
        Route::post('/{routine}/forms/publish', [RoutineController::class, 'publishForm'])->name('forms.publish');
        Route::get('/{routine}/form-data', [RoutineController::class, 'getRoutineWithFormData'])->name('form-data');
    });
    
    // Rotinas no contexto de ativos específicos
    Route::prefix('assets/{asset}')->name('assets.')->group(function () {
        Route::get('/routines', [RoutineController::class, 'assetRoutines'])->name('routines.index');
        Route::post('/routines', [RoutineController::class, 'storeAssetRoutine'])->name('routines.store');
        Route::put('/routines/{routine}', [RoutineController::class, 'updateAssetRoutine'])->name('routines.update');
        Route::delete('/routines/{routine}', [RoutineController::class, 'destroyAssetRoutine'])->name('routines.destroy');
        
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