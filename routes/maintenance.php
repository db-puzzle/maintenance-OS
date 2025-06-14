<?php

use App\Http\Controllers\Maintenance\DashboardController;
use App\Http\Controllers\Maintenance\RoutineController;
use App\Http\Controllers\Maintenance\InlineRoutineExecutionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {
    // Dashboard de Manutenção
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
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