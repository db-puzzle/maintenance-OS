<?php

use App\Http\Controllers\Maintenance\DashboardController;
use App\Http\Controllers\Maintenance\RoutineController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {
    // Dashboard de Manutenção
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Rotinas
    Route::get('/routines', [RoutineController::class, 'index'])->name('routines.index');
    Route::get('/routines/routine-editor', [RoutineController::class, 'create'])->name('routines.routine-editor');
    Route::post('/routines', [RoutineController::class, 'store'])->name('routines.store');
}); 