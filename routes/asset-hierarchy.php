<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AssetHierarchy\PlantsController;
use App\Http\Controllers\AssetHierarchy\AreaController;
use App\Http\Controllers\AssetHierarchy\SectorController;
use App\Http\Controllers\AssetHierarchy\EquipmentController;
use App\Http\Controllers\AssetHierarchy\EquipmentTypeController;
use App\Http\Controllers\AssetHierarchy\EquipmentImportExportController;
use App\Http\Controllers\AssetHierarchy\ShiftController;

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

    Route::get('asset-hierarchy/equipamentos', [EquipmentController::class, 'index'])->name('asset-hierarchy.equipamentos');
    Route::get('asset-hierarchy/equipamentos/create', [EquipmentController::class, 'create'])->name('asset-hierarchy.equipamentos.create');
    Route::post('asset-hierarchy/equipamentos', [EquipmentController::class, 'store'])->name('asset-hierarchy.equipamentos.store');
    Route::get('asset-hierarchy/equipamentos/importar', [EquipmentImportExportController::class, 'import'])->name('asset-hierarchy.equipamentos.import');
    Route::post('asset-hierarchy/equipamentos/importar/analisar', [EquipmentImportExportController::class, 'analyzeCsv'])->name('asset-hierarchy.equipamentos.import.analyze');
    Route::post('asset-hierarchy/equipamentos/importar/dados', [EquipmentImportExportController::class, 'importData'])->name('asset-hierarchy.equipamentos.import.data');
    Route::get('asset-hierarchy/equipamentos/importar/progresso', [EquipmentImportExportController::class, 'checkImportProgress'])->name('asset-hierarchy.equipamentos.import.progress');
    Route::get('asset-hierarchy/equipamentos/exportar', [EquipmentImportExportController::class, 'export'])->name('asset-hierarchy.equipamentos.export');
    Route::post('asset-hierarchy/equipamentos/exportar', [EquipmentImportExportController::class, 'exportData'])->name('asset-hierarchy.equipamentos.export.data');
    Route::get('asset-hierarchy/equipamentos/exportar/{filename}', [EquipmentImportExportController::class, 'downloadExport'])->name('asset-hierarchy.equipamentos.export.download');
    Route::get('asset-hierarchy/equipamentos/{equipment}', [EquipmentController::class, 'show'])->name('asset-hierarchy.equipamentos.show');
    Route::get('asset-hierarchy/equipamentos/{equipment}/edit', [EquipmentController::class, 'edit'])->name('asset-hierarchy.equipamentos.edit');
    Route::post('asset-hierarchy/equipamentos/{equipment}', [EquipmentController::class, 'update'])->name('asset-hierarchy.equipamentos.update');
    Route::delete('asset-hierarchy/equipamentos/{equipment}', [EquipmentController::class, 'destroy'])->name('asset-hierarchy.equipamentos.destroy');
    Route::delete('asset-hierarchy/equipamentos/{equipment}/photo', [EquipmentController::class, 'removePhoto'])->name('asset-hierarchy.equipamentos.remove-photo');

    Route::get('asset-hierarchy/setores', [SectorController::class, 'index'])->name('asset-hierarchy.setores');
    Route::get('asset-hierarchy/setores/create', [SectorController::class, 'create'])->name('asset-hierarchy.setores.create');
    Route::post('asset-hierarchy/setores', [SectorController::class, 'store'])->name('asset-hierarchy.setores.store');
    Route::get('asset-hierarchy/setores/{setor}', [SectorController::class, 'show'])->name('asset-hierarchy.setores.show');
    Route::get('asset-hierarchy/setores/{setor}/edit', [SectorController::class, 'edit'])->name('asset-hierarchy.setores.edit');
    Route::put('asset-hierarchy/setores/{setor}', [SectorController::class, 'update'])->name('asset-hierarchy.setores.update');
    Route::delete('asset-hierarchy/setores/{setor}', [SectorController::class, 'destroy'])->name('asset-hierarchy.setores.destroy');
    Route::get('asset-hierarchy/setores/{setor}/check-dependencies', [SectorController::class, 'checkDependencies'])->name('asset-hierarchy.setores.check-dependencies');

    Route::get('asset-hierarchy/areas', [AreaController::class, 'index'])->name('asset-hierarchy.areas');
    Route::get('asset-hierarchy/areas/create', [AreaController::class, 'create'])->name('asset-hierarchy.areas.create');
    Route::post('asset-hierarchy/areas', [AreaController::class, 'store'])->name('asset-hierarchy.areas.store');
    Route::get('asset-hierarchy/areas/{area}', [AreaController::class, 'show'])->name('asset-hierarchy.areas.show');
    Route::get('asset-hierarchy/areas/{area}/edit', [AreaController::class, 'edit'])->name('asset-hierarchy.areas.edit');
    Route::put('asset-hierarchy/areas/{area}', [AreaController::class, 'update'])->name('asset-hierarchy.areas.update');
    Route::delete('asset-hierarchy/areas/{area}', [AreaController::class, 'destroy'])->name('asset-hierarchy.areas.destroy');
    Route::get('asset-hierarchy/areas/{area}/check-dependencies', [AreaController::class, 'checkDependencies'])->name('asset-hierarchy.areas.check-dependencies');

    Route::get('asset-hierarchy/plantas', [PlantsController::class, 'index'])->name('asset-hierarchy.plantas');
    Route::get('asset-hierarchy/plantas/create', [PlantsController::class, 'create'])->name('asset-hierarchy.plantas.create');
    Route::post('asset-hierarchy/plantas', [PlantsController::class, 'store'])->name('asset-hierarchy.plantas.store');
    Route::get('asset-hierarchy/plantas/{plant}', [PlantsController::class, 'show'])->name('asset-hierarchy.plantas.show');
    Route::get('asset-hierarchy/plantas/{plant}/edit', [PlantsController::class, 'edit'])->name('asset-hierarchy.plantas.edit');
    Route::put('asset-hierarchy/plantas/{plant}', [PlantsController::class, 'update'])->name('asset-hierarchy.plantas.update');
    Route::delete('asset-hierarchy/plantas/{plant}', [PlantsController::class, 'destroy'])->name('asset-hierarchy.plantas.destroy');
    Route::get('asset-hierarchy/plantas/{plant}/check-dependencies', [PlantsController::class, 'checkDependencies'])->name('asset-hierarchy.plantas.check-dependencies');

    Route::get('asset-hierarchy/tipos-equipamento', [EquipmentTypeController::class, 'index'])->name('asset-hierarchy.tipos-equipamento');
    Route::get('asset-hierarchy/tipos-equipamento/create', [EquipmentTypeController::class, 'create'])->name('asset-hierarchy.tipos-equipamento.create');
    Route::post('asset-hierarchy/tipos-equipamento', [EquipmentTypeController::class, 'store'])->name('asset-hierarchy.tipos-equipamento.store');
    Route::get('asset-hierarchy/tipos-equipamento/{equipmentType}', [EquipmentTypeController::class, 'show'])->name('asset-hierarchy.tipos-equipamento.show');
    Route::get('asset-hierarchy/tipos-equipamento/{equipmentType}/edit', [EquipmentTypeController::class, 'edit'])->name('asset-hierarchy.tipos-equipamento.edit');
    Route::put('asset-hierarchy/tipos-equipamento/{equipmentType}', [EquipmentTypeController::class, 'update'])->name('asset-hierarchy.tipos-equipamento.update');
    Route::delete('asset-hierarchy/tipos-equipamento/{equipmentType}', [EquipmentTypeController::class, 'destroy'])->name('asset-hierarchy.tipos-equipamento.destroy');
    Route::get('asset-hierarchy/tipos-equipamento/{equipmentType}/check-dependencies', [EquipmentTypeController::class, 'checkDependencies'])->name('asset-hierarchy.tipos-equipamento.check-dependencies');

    Route::get('asset-hierarchy/shifts', [ShiftController::class, 'index'])->name('asset-hierarchy.shifts');
    Route::get('asset-hierarchy/shifts/shift-editor', [ShiftController::class, 'create'])->name('asset-hierarchy.shifts.shift-editor');
    Route::post('asset-hierarchy/shifts', [ShiftController::class, 'store'])->name('asset-hierarchy.shifts.store');
    Route::get('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'show'])->name('asset-hierarchy.shifts.show');
    Route::get('asset-hierarchy/shifts/{shift}/edit', [ShiftController::class, 'edit'])->name('asset-hierarchy.shifts.edit');
    Route::put('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'update'])->name('asset-hierarchy.shifts.update');
    Route::delete('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'destroy'])->name('asset-hierarchy.shifts.destroy');
    Route::get('asset-hierarchy/shifts/{shift}/check-dependencies', [ShiftController::class, 'checkDependencies'])->name('asset-hierarchy.shifts.check-dependencies');
}); 