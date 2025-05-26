<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AssetHierarchy\PlantsController;
use App\Http\Controllers\AssetHierarchy\AreaController;
use App\Http\Controllers\AssetHierarchy\SectorController;
use App\Http\Controllers\AssetHierarchy\AssetController;
use App\Http\Controllers\AssetHierarchy\AssetTypeController;
use App\Http\Controllers\AssetHierarchy\AssetImportExportController;
use App\Http\Controllers\AssetHierarchy\ShiftController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('ativos')->name('ativos.')->group(function () {
        Route::get('/', [AssetController::class, 'index'])->name('index');
        Route::get('/criar', [AssetController::class, 'create'])->name('create');
        Route::post('/', [AssetController::class, 'store'])->name('store');
        Route::get('/{asset}/editar', [AssetController::class, 'edit'])->name('edit');
        Route::put('/{asset}', [AssetController::class, 'update'])->name('update');
        Route::delete('/{asset}', [AssetController::class, 'destroy'])->name('destroy');
        Route::get('/importar', [AssetImportExportController::class, 'showImportForm'])->name('import');
        Route::post('/importar/analisar', [AssetImportExportController::class, 'analyzeCsv'])->name('import.analyze');
        Route::post('/importar/dados', [AssetImportExportController::class, 'importData'])->name('import.data');
    });

    Route::get('asset-hierarchy/ativos', [AssetController::class, 'index'])->name('asset-hierarchy.ativos');
    Route::get('asset-hierarchy/ativos/create', [AssetController::class, 'create'])->name('asset-hierarchy.ativos.create');
    Route::post('asset-hierarchy/ativos', [AssetController::class, 'store'])->name('asset-hierarchy.ativos.store');
    Route::get('asset-hierarchy/ativos/importar', [AssetImportExportController::class, 'import'])->name('asset-hierarchy.ativos.import');
    Route::post('asset-hierarchy/ativos/importar/analisar', [AssetImportExportController::class, 'analyzeCsv'])->name('asset-hierarchy.ativos.import.analyze');
    Route::post('asset-hierarchy/ativos/importar/dados', [AssetImportExportController::class, 'importData'])->name('asset-hierarchy.ativos.import.data');
    Route::get('asset-hierarchy/ativos/importar/progresso', [AssetImportExportController::class, 'checkImportProgress'])->name('asset-hierarchy.ativos.import.progress');
    Route::get('asset-hierarchy/ativos/exportar', [AssetImportExportController::class, 'export'])->name('asset-hierarchy.ativos.export');
    Route::post('asset-hierarchy/ativos/exportar', [AssetImportExportController::class, 'exportData'])->name('asset-hierarchy.ativos.export.data');
    Route::get('asset-hierarchy/ativos/exportar/{filename}', [AssetImportExportController::class, 'downloadExport'])->name('asset-hierarchy.ativos.export.download');
    Route::get('asset-hierarchy/ativos/{asset}', [AssetController::class, 'show'])->name('asset-hierarchy.ativos.show');
    Route::get('asset-hierarchy/ativos/{asset}/edit', [AssetController::class, 'edit'])->name('asset-hierarchy.ativos.edit');
    Route::post('asset-hierarchy/ativos/{asset}', [AssetController::class, 'update'])->name('asset-hierarchy.ativos.update');
    Route::delete('asset-hierarchy/ativos/{asset}', [AssetController::class, 'destroy'])->name('asset-hierarchy.ativos.destroy');
    Route::delete('asset-hierarchy/ativos/{asset}/photo', [AssetController::class, 'removePhoto'])->name('asset-hierarchy.ativos.remove-photo');

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

    Route::get('asset-hierarchy/tipos-ativo', [AssetTypeController::class, 'index'])->name('asset-hierarchy.tipos-ativo');
    Route::get('asset-hierarchy/tipos-ativo/create', [AssetTypeController::class, 'create'])->name('asset-hierarchy.tipos-ativo.create');
    Route::post('asset-hierarchy/tipos-ativo', [AssetTypeController::class, 'store'])->name('asset-hierarchy.tipos-ativo.store');
    Route::get('asset-hierarchy/tipos-ativo/{assetType}', [AssetTypeController::class, 'show'])->name('asset-hierarchy.tipos-ativo.show');
    Route::get('asset-hierarchy/tipos-ativo/{assetType}/edit', [AssetTypeController::class, 'edit'])->name('asset-hierarchy.tipos-ativo.edit');
    Route::put('asset-hierarchy/tipos-ativo/{assetType}', [AssetTypeController::class, 'update'])->name('asset-hierarchy.tipos-ativo.update');
    Route::delete('asset-hierarchy/tipos-ativo/{assetType}', [AssetTypeController::class, 'destroy'])->name('asset-hierarchy.tipos-ativo.destroy');
    Route::get('asset-hierarchy/tipos-ativo/{assetType}/check-dependencies', [AssetTypeController::class, 'checkDependencies'])->name('asset-hierarchy.tipos-ativo.check-dependencies');

    Route::get('asset-hierarchy/shifts', [ShiftController::class, 'index'])->name('asset-hierarchy.shifts');
    Route::get('asset-hierarchy/shifts/shift-editor', [ShiftController::class, 'create'])->name('asset-hierarchy.shifts.shift-editor');
    Route::post('asset-hierarchy/shifts', [ShiftController::class, 'store'])->name('asset-hierarchy.shifts.store');
    Route::get('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'show'])->name('asset-hierarchy.shifts.show');
    Route::get('asset-hierarchy/shifts/{shift}/edit', [ShiftController::class, 'edit'])->name('asset-hierarchy.shifts.edit');
    Route::put('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'update'])->name('asset-hierarchy.shifts.update');
    Route::delete('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'destroy'])->name('asset-hierarchy.shifts.destroy');
    Route::get('asset-hierarchy/shifts/{shift}/check-dependencies', [ShiftController::class, 'checkDependencies'])->name('asset-hierarchy.shifts.check-dependencies');
}); 