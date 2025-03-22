<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PlantsController;
use App\Http\Controllers\AreaController;
use App\Http\Controllers\Cadastro\MachineTypeController;
use App\Http\Controllers\EquipmentController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('cadastro/equipamentos', [EquipmentController::class, 'index'])->name('cadastro.equipamentos');
    Route::get('cadastro/equipamentos/create', [EquipmentController::class, 'create'])->name('cadastro.equipamentos.create');
    Route::post('cadastro/equipamentos', [EquipmentController::class, 'store'])->name('cadastro.equipamentos.store');
    Route::get('cadastro/equipamentos/{equipment}', [EquipmentController::class, 'show'])->name('cadastro.equipamentos.show');
    Route::get('cadastro/equipamentos/{equipment}/edit', [EquipmentController::class, 'edit'])->name('cadastro.equipamentos.edit');
    Route::put('cadastro/equipamentos/{equipment}', [EquipmentController::class, 'update'])->name('cadastro.equipamentos.update');
    Route::delete('cadastro/equipamentos/{equipment}', [EquipmentController::class, 'destroy'])->name('cadastro.equipamentos.destroy');

    Route::get('cadastro/areas', [AreaController::class, 'index'])->name('cadastro.areas');
    Route::get('cadastro/areas/create', [AreaController::class, 'create'])->name('cadastro.areas.create');
    Route::post('cadastro/areas', [AreaController::class, 'store'])->name('cadastro.areas.store');
    Route::get('cadastro/areas/{area}', [AreaController::class, 'show'])->name('cadastro.areas.show');
    Route::get('cadastro/areas/{area}/edit', [AreaController::class, 'edit'])->name('cadastro.areas.edit');
    Route::put('cadastro/areas/{area}', [AreaController::class, 'update'])->name('cadastro.areas.update');
    Route::delete('cadastro/areas/{area}', [AreaController::class, 'destroy'])->name('cadastro.areas.destroy');
    Route::get('cadastro/areas/{area}/check-dependencies', [AreaController::class, 'checkDependencies'])->name('cadastro.areas.check-dependencies');

    Route::get('cadastro/plantas', [PlantsController::class, 'index'])->name('cadastro.plantas');
    Route::get('cadastro/plantas/create', [PlantsController::class, 'create'])->name('cadastro.plantas.create');
    Route::post('cadastro/plantas', [PlantsController::class, 'store'])->name('cadastro.plantas.store');
    Route::get('cadastro/plantas/{plant}', [PlantsController::class, 'show'])->name('cadastro.plantas.show');
    Route::get('cadastro/plantas/{plant}/edit', [PlantsController::class, 'edit'])->name('cadastro.plantas.edit');
    Route::put('cadastro/plantas/{plant}', [PlantsController::class, 'update'])->name('cadastro.plantas.update');
    Route::delete('cadastro/plantas/{plant}', [PlantsController::class, 'destroy'])->name('cadastro.plantas.destroy');
    Route::get('cadastro/plantas/{plant}/check-dependencies', [PlantsController::class, 'checkDependencies'])->name('cadastro.plantas.check-dependencies');

    Route::get('cadastro/tipos-maquina', [MachineTypeController::class, 'index'])->name('cadastro.tipos-maquina');
    Route::get('cadastro/tipos-maquina/create', [MachineTypeController::class, 'create'])->name('cadastro.tipos-maquina.create');
    Route::post('cadastro/tipos-maquina', [MachineTypeController::class, 'store'])->name('cadastro.tipos-maquina.store');
    Route::get('cadastro/tipos-maquina/{machineType}/edit', [MachineTypeController::class, 'edit'])->name('cadastro.tipos-maquina.edit');
    Route::put('cadastro/tipos-maquina/{machineType}', [MachineTypeController::class, 'update'])->name('cadastro.tipos-maquina.update');
    Route::delete('cadastro/tipos-maquina/{machineType}', [MachineTypeController::class, 'destroy'])->name('cadastro.tipos-maquina.destroy');
    Route::get('cadastro/tipos-maquina/{machineType}/check-dependencies', [MachineTypeController::class, 'checkDependencies'])->name('cadastro.tipos-maquina.check-dependencies');
}); 