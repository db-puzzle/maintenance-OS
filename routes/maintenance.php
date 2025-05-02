<?php

use App\Http\Controllers\RoutineController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/routines', [RoutineController::class, 'index'])->name('routines.index');
    Route::get('/routines/routine-editor', [RoutineController::class, 'create'])->name('routines.routine-editor');
    Route::post('/routines', [RoutineController::class, 'store'])->name('routines.store');
}); 