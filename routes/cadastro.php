<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FactoriesController;
use App\Http\Controllers\AreaController;
use App\Http\Controllers\Cadastro\MachineTypeController;
use App\Http\Controllers\MachineController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('cadastro/maquinas', [MachineController::class, 'index'])->name('cadastro.maquinas');
    Route::get('cadastro/maquinas/create', [MachineController::class, 'create'])->name('cadastro.maquinas.create');
    Route::post('cadastro/maquinas', [MachineController::class, 'store'])->name('cadastro.maquinas.store');
    Route::get('cadastro/maquinas/{machine}', [MachineController::class, 'show'])->name('cadastro.maquinas.show');
    Route::get('cadastro/maquinas/{machine}/edit', [MachineController::class, 'edit'])->name('cadastro.maquinas.edit');
    Route::put('cadastro/maquinas/{machine}', [MachineController::class, 'update'])->name('cadastro.maquinas.update');
    Route::delete('cadastro/maquinas/{machine}', [MachineController::class, 'destroy'])->name('cadastro.maquinas.destroy');

    Route::get('cadastro/areas', [AreaController::class, 'index'])->name('cadastro.areas');
    Route::get('cadastro/areas/create', [AreaController::class, 'create'])->name('cadastro.areas.create');
    Route::post('cadastro/areas', [AreaController::class, 'store'])->name('cadastro.areas.store');
    Route::get('cadastro/areas/{area}/edit', [AreaController::class, 'edit'])->name('cadastro.areas.edit');
    Route::put('cadastro/areas/{area}', [AreaController::class, 'update'])->name('cadastro.areas.update');
    Route::delete('cadastro/areas/{area}', [AreaController::class, 'destroy'])->name('cadastro.areas.destroy');
    Route::get('cadastro/areas/{area}/check-dependencies', [AreaController::class, 'checkDependencies'])->name('cadastro.areas.check-dependencies');

    Route::get('cadastro/fabricas', [FactoriesController::class, 'index'])->name('cadastro.fabricas');
    Route::get('cadastro/fabricas/create', [FactoriesController::class, 'create'])->name('cadastro.fabricas.create');
    Route::post('cadastro/fabricas', [FactoriesController::class, 'store'])->name('cadastro.fabricas.store');
    Route::get('cadastro/fabricas/{factory}/edit', [FactoriesController::class, 'edit'])->name('cadastro.fabricas.edit');
    Route::post('cadastro/fabricas/{factory}', [FactoriesController::class, 'update'])->name('cadastro.fabricas.update');
    Route::delete('cadastro/fabricas/{factory}', [FactoriesController::class, 'destroy'])->name('cadastro.fabricas.destroy');
    Route::get('cadastro/fabricas/{factory}/check-dependencies', [FactoriesController::class, 'checkDependencies'])->name('cadastro.fabricas.check-dependencies');

    Route::get('cadastro/tipos-maquina', [MachineTypeController::class, 'index'])->name('cadastro.tipos-maquina');
    Route::get('cadastro/tipos-maquina/create', [MachineTypeController::class, 'create'])->name('cadastro.tipos-maquina.create');
    Route::post('cadastro/tipos-maquina', [MachineTypeController::class, 'store'])->name('cadastro.tipos-maquina.store');
    Route::get('cadastro/tipos-maquina/{machineType}/edit', [MachineTypeController::class, 'edit'])->name('cadastro.tipos-maquina.edit');
    Route::put('cadastro/tipos-maquina/{machineType}', [MachineTypeController::class, 'update'])->name('cadastro.tipos-maquina.update');
    Route::delete('cadastro/tipos-maquina/{machineType}', [MachineTypeController::class, 'destroy'])->name('cadastro.tipos-maquina.destroy');
    Route::get('cadastro/tipos-maquina/{machineType}/check-dependencies', [MachineTypeController::class, 'checkDependencies'])->name('cadastro.tipos-maquina.check-dependencies');
}); 