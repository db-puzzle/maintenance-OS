<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PlantsController;
use App\Http\Controllers\AreaController;
use App\Http\Controllers\Cadastro\SectorController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\Cadastro\EquipmentTypeController;
use App\Http\Controllers\EquipmentImportExportController;
use App\Http\Controllers\ShiftController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('equipamentos')->name('equipamentos.')->group(function () {
        Route::get('/', [EquipmentController::class, 'index'])->name('index');
        Route::get('/criar', [EquipmentController::class, 'create'])->name('create');
        Route::post('/', [EquipmentController::class, 'store'])->name('store');
        Route::get('/{equipment}/editar', [EquipmentController::class, 'edit'])->name('edit');
        Route::put('/{equipment}', [EquipmentController::class, 'update'])->name('update');
        Route::delete('/{equipment}', [EquipmentController::class, 'destroy'])->name('destroy');
        Route::get('/importar', [EquipmentImportExportController::class, 'showImportForm'])->name('import');
        Route::post('/importar/analisar', [EquipmentImportExportController::class, 'analyzeCsv'])->name('import.analyze');
        Route::post('/importar/dados', [EquipmentImportExportController::class, 'importData'])->name('import.data');
    });
    Route::get('cadastro/equipamentos', [EquipmentController::class, 'index'])->name('cadastro.equipamentos');
    Route::get('cadastro/equipamentos/create', [EquipmentController::class, 'create'])->name('cadastro.equipamentos.create');
    Route::post('cadastro/equipamentos', [EquipmentController::class, 'store'])->name('cadastro.equipamentos.store');
    Route::get('cadastro/equipamentos/importar', [EquipmentImportExportController::class, 'import'])->name('cadastro.equipamentos.import');
    Route::post('cadastro/equipamentos/importar/analisar', [EquipmentImportExportController::class, 'analyzeCsv'])->name('cadastro.equipamentos.import.analyze');
    Route::post('cadastro/equipamentos/importar/dados', [EquipmentImportExportController::class, 'importData'])->name('cadastro.equipamentos.import.data');
    Route::get('cadastro/equipamentos/importar/progresso', [EquipmentImportExportController::class, 'checkImportProgress'])->name('cadastro.equipamentos.import.progress');
    Route::get('cadastro/equipamentos/exportar', [EquipmentImportExportController::class, 'export'])->name('cadastro.equipamentos.export');
    Route::post('cadastro/equipamentos/exportar', [EquipmentImportExportController::class, 'exportData'])->name('cadastro.equipamentos.export.data');
    Route::get('cadastro/equipamentos/exportar/{filename}', [EquipmentImportExportController::class, 'downloadExport'])->name('cadastro.equipamentos.export.download');
    Route::get('cadastro/equipamentos/{equipment}', [EquipmentController::class, 'show'])->name('cadastro.equipamentos.show');
    Route::get('cadastro/equipamentos/{equipment}/edit', [EquipmentController::class, 'edit'])->name('cadastro.equipamentos.edit');
    Route::post('cadastro/equipamentos/{equipment}', [EquipmentController::class, 'update'])->name('cadastro.equipamentos.update');
    Route::delete('cadastro/equipamentos/{equipment}', [EquipmentController::class, 'destroy'])->name('cadastro.equipamentos.destroy');
    Route::delete('cadastro/equipamentos/{equipment}/photo', [EquipmentController::class, 'removePhoto'])->name('cadastro.equipamentos.remove-photo');

    Route::get('cadastro/setores', [SectorController::class, 'index'])->name('cadastro.setores');
    Route::get('cadastro/setores/create', [SectorController::class, 'create'])->name('cadastro.setores.create');
    Route::post('cadastro/setores', [SectorController::class, 'store'])->name('cadastro.setores.store');
    Route::get('cadastro/setores/{setor}', [SectorController::class, 'show'])->name('cadastro.setores.show');
    Route::get('cadastro/setores/{setor}/edit', [SectorController::class, 'edit'])->name('cadastro.setores.edit');
    Route::put('cadastro/setores/{setor}', [SectorController::class, 'update'])->name('cadastro.setores.update');
    Route::delete('cadastro/setores/{setor}', [SectorController::class, 'destroy'])->name('cadastro.setores.destroy');
    Route::get('cadastro/setores/{setor}/check-dependencies', [SectorController::class, 'checkDependencies'])->name('cadastro.setores.check-dependencies');

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

    Route::get('cadastro/tipos-equipamento', [EquipmentTypeController::class, 'index'])->name('cadastro.tipos-equipamento');
    Route::get('cadastro/tipos-equipamento/create', [EquipmentTypeController::class, 'create'])->name('cadastro.tipos-equipamento.create');
    Route::post('cadastro/tipos-equipamento', [EquipmentTypeController::class, 'store'])->name('cadastro.tipos-equipamento.store');
    Route::get('cadastro/tipos-equipamento/{equipmentType}', [EquipmentTypeController::class, 'show'])->name('cadastro.tipos-equipamento.show');
    Route::get('cadastro/tipos-equipamento/{equipmentType}/edit', [EquipmentTypeController::class, 'edit'])->name('cadastro.tipos-equipamento.edit');
    Route::put('cadastro/tipos-equipamento/{equipmentType}', [EquipmentTypeController::class, 'update'])->name('cadastro.tipos-equipamento.update');
    Route::delete('cadastro/tipos-equipamento/{equipmentType}', [EquipmentTypeController::class, 'destroy'])->name('cadastro.tipos-equipamento.destroy');
    Route::get('cadastro/tipos-equipamento/{equipmentType}/check-dependencies', [EquipmentTypeController::class, 'checkDependencies'])->name('cadastro.tipos-equipamento.check-dependencies');

    Route::get('cadastro/turnos', [ShiftController::class, 'index'])->name('cadastro.turnos');
    Route::get('cadastro/turnos/create', [ShiftController::class, 'create'])->name('cadastro.turnos.create');
    Route::post('cadastro/turnos', [ShiftController::class, 'store'])->name('cadastro.turnos.store');
    Route::get('cadastro/turnos/{shift}', [ShiftController::class, 'show'])->name('cadastro.turnos.show');
    Route::get('cadastro/turnos/{shift}/edit', [ShiftController::class, 'edit'])->name('cadastro.turnos.edit');
    Route::put('cadastro/turnos/{shift}', [ShiftController::class, 'update'])->name('cadastro.turnos.update');
    Route::delete('cadastro/turnos/{shift}', [ShiftController::class, 'destroy'])->name('cadastro.turnos.destroy');
    Route::get('cadastro/turnos/{shift}/check-dependencies', [ShiftController::class, 'checkDependencies'])->name('cadastro.turnos.check-dependencies');
}); 