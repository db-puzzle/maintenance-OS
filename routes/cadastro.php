<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FactoriesController;
use App\Http\Controllers\AreaController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('cadastro/maquinas', function () {
        return Inertia::render('cadastro/maquinas');
    })->name('cadastro.maquinas');

    Route::get('cadastro/tipos-maquina', function () {
        return Inertia::render('cadastro/tipos-maquina');
    })->name('cadastro.tipos-maquina');

    Route::get('cadastro/areas', [AreaController::class, 'index'])->name('cadastro.areas');
    Route::get('cadastro/areas/create', [AreaController::class, 'create'])->name('cadastro.areas.create');
    Route::post('cadastro/areas', [AreaController::class, 'store'])->name('cadastro.areas.store');
    Route::get('cadastro/areas/{area}/edit', [AreaController::class, 'edit'])->name('cadastro.areas.edit');
    Route::put('cadastro/areas/{area}', [AreaController::class, 'update'])->name('cadastro.areas.update');
    Route::delete('cadastro/areas/{area}', [AreaController::class, 'destroy'])->name('cadastro.areas.destroy');

    Route::get('cadastro/fabricas', [FactoriesController::class, 'index'])->name('cadastro.fabricas');
    Route::get('cadastro/fabricas/create', [FactoriesController::class, 'create'])->name('cadastro.fabricas.create');
    Route::post('cadastro/fabricas', [FactoriesController::class, 'store'])->name('cadastro.fabricas.store');
    Route::get('cadastro/fabricas/{factory}/edit', [FactoriesController::class, 'edit'])->name('cadastro.fabricas.edit');
    Route::post('cadastro/fabricas/{factory}', [FactoriesController::class, 'update'])->name('cadastro.fabricas.update');
    Route::delete('cadastro/fabricas/{factory}', [FactoriesController::class, 'destroy'])->name('cadastro.fabricas.destroy');
}); 