<?php

use App\Http\Controllers\Maintenance\DashboardController;
use App\Http\Controllers\Maintenance\RoutineController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {
    // Dashboard de Manutenção
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Rotinas
    Route::get('/routines', [RoutineController::class, 'index'])->name('routines.index');
    Route::get('/routines/create', [RoutineController::class, 'create'])->name('routines.create');
    Route::post('/routines', [RoutineController::class, 'store'])->name('routines.store');
    Route::get('/routines/{routine}', [RoutineController::class, 'show'])->name('routines.show');
    Route::get('/routines/{routine}/edit', [RoutineController::class, 'edit'])->name('routines.edit');
    Route::put('/routines/{routine}', [RoutineController::class, 'update'])->name('routines.update');
    Route::delete('/routines/{routine}', [RoutineController::class, 'destroy'])->name('routines.destroy');
    Route::post('/routines/{routine}/executions', [RoutineController::class, 'createExecution'])->name('routines.create-execution');
    Route::get('/routines/{routine}/executions', [RoutineController::class, 'executions'])->name('routines.executions');
    
    // Formulários de Rotinas
    Route::get('/routines/{routine}/form-editor', [RoutineController::class, 'formEditor'])->name('routines.form-editor');
    Route::post('/routines/{routine}/forms', [RoutineController::class, 'storeForm'])->name('routines.forms.store');
    
    // Rotinas no contexto de ativos específicos
    Route::prefix('assets/{asset}')->name('assets.')->group(function () {
        Route::get('/routines', [RoutineController::class, 'assetRoutines'])->name('routines.index');
        Route::post('/routines', [RoutineController::class, 'storeAssetRoutine'])->name('routines.store');
        Route::put('/routines/{routine}', [RoutineController::class, 'updateAssetRoutine'])->name('routines.update');
        Route::delete('/routines/{routine}', [RoutineController::class, 'destroyAssetRoutine'])->name('routines.destroy');
        
        // Formulários de rotinas no contexto de ativos
        Route::get('/routines/{routine}/form-editor', [RoutineController::class, 'assetRoutineFormEditor'])->name('routines.form-editor');
        Route::post('/routines/{routine}/forms', [RoutineController::class, 'storeAssetRoutineForm'])->name('routines.forms.store');
        Route::get('/routines/{routine}/form', [RoutineController::class, 'assetRoutineForm'])->name('routines.form');
        Route::get('/routines/{routine}/form-view', [RoutineController::class, 'assetRoutineFormView'])->name('routines.form-view');
        Route::get('/routines/{routine}/form-fill', [RoutineController::class, 'assetRoutineFormFill'])->name('routines.form-fill');
        
        // Execuções de rotinas no contexto de ativos
        Route::get('/routines/{routine}/executions', [RoutineController::class, 'assetRoutineExecutions'])->name('routines.executions');
        Route::post('/routines/{routine}/executions', [RoutineController::class, 'storeAssetRoutineExecution'])->name('routines.executions.store');
    });
}); 