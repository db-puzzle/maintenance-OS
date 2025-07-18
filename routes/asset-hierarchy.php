<?php

use App\Http\Controllers\AssetHierarchy\AreaController;
use App\Http\Controllers\AssetHierarchy\AssetController;
use App\Http\Controllers\AssetHierarchy\AssetHierarchyController;
use App\Http\Controllers\AssetHierarchy\AssetImportExportController;
use App\Http\Controllers\AssetHierarchy\AssetTypeController;
use App\Http\Controllers\AssetHierarchy\ManufacturerController;
use App\Http\Controllers\AssetHierarchy\PlantsController;
use App\Http\Controllers\AssetHierarchy\SectorController;
use App\Http\Controllers\AssetHierarchy\ShiftController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Asset Hierarchy Index
    Route::get('asset-hierarchy', [AssetHierarchyController::class, 'index'])->name('asset-hierarchy.index');

    Route::prefix('assets')->name('assets.')->group(function () {
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

    Route::get('asset-hierarchy/assets', [AssetController::class, 'index'])->name('asset-hierarchy.assets');
    Route::get('asset-hierarchy/assets/create', [AssetController::class, 'createNew'])->name('asset-hierarchy.assets.create');
    Route::post('asset-hierarchy/assets', [AssetController::class, 'store'])->name('asset-hierarchy.assets.store');
    Route::get('asset-hierarchy/assets/importar', [AssetImportExportController::class, 'import'])->name('asset-hierarchy.assets.import');
    Route::post('asset-hierarchy/assets/importar/analisar', [AssetImportExportController::class, 'analyzeCsv'])->name('asset-hierarchy.assets.import.analyze');
    Route::post('asset-hierarchy/assets/importar/dados', [AssetImportExportController::class, 'importData'])->name('asset-hierarchy.assets.import.data');
    Route::get('asset-hierarchy/assets/importar/progresso', [AssetImportExportController::class, 'checkImportProgress'])->name('asset-hierarchy.assets.import.progress');
    Route::get('asset-hierarchy/assets/exportar', [AssetImportExportController::class, 'export'])->name('asset-hierarchy.assets.export');
    Route::post('asset-hierarchy/assets/exportar', [AssetImportExportController::class, 'exportData'])->name('asset-hierarchy.assets.export.data');
    Route::get('asset-hierarchy/assets/exportar/{filename}', [AssetImportExportController::class, 'downloadExport'])->name('asset-hierarchy.assets.export.download');
    Route::get('asset-hierarchy/assets/{asset}/edit', [AssetController::class, 'edit'])->name('asset-hierarchy.assets.edit');
    Route::put('asset-hierarchy/assets/{asset}', [AssetController::class, 'update'])->name('asset-hierarchy.assets.update');
    Route::patch('asset-hierarchy/assets/{asset}', [AssetController::class, 'update']);
    Route::delete('asset-hierarchy/assets/{asset}', [AssetController::class, 'destroy'])->name('asset-hierarchy.assets.destroy');
    Route::get('asset-hierarchy/assets/{asset}/check-dependencies', [AssetController::class, 'checkDependencies'])->name('asset-hierarchy.assets.check-dependencies');
    Route::delete('asset-hierarchy/assets/{asset}/photo', [AssetController::class, 'removePhoto'])->name('asset-hierarchy.assets.remove-photo');

    // Runtime routes
    Route::get('asset-hierarchy/assets/{asset}/runtime', [AssetController::class, 'getRuntimeData'])->name('asset-hierarchy.assets.runtime');
    Route::post('asset-hierarchy/assets/{asset}/runtime', [AssetController::class, 'reportRuntime'])->name('asset-hierarchy.assets.runtime.report');
    Route::get('asset-hierarchy/assets/{asset}/runtime/history', [AssetController::class, 'getRuntimeHistory'])->name('asset-hierarchy.assets.runtime.history');
    Route::get('asset-hierarchy/assets/{asset}/runtime/calculation-details', [AssetController::class, 'getRuntimeCalculationDetails'])->name('asset-hierarchy.assets.runtime.calculation-details');
    Route::get('asset-hierarchy/assets/{asset}/runtime/breakdown', [AssetController::class, 'getRuntimeBreakdown'])->name('asset-hierarchy.assets.runtime.breakdown');
    
    // Work order routes
    Route::get('asset-hierarchy/assets/{asset}/work-orders', [AssetController::class, 'getWorkOrderHistory'])->name('asset-hierarchy.assets.work-orders');
    Route::get('asset-hierarchy/assets/{asset}/work-order-history', [AssetController::class, 'getWorkOrderHistory'])->name('asset-hierarchy.assets.work-order-history');

    // General asset route (must come after all specific routes)
    Route::get('asset-hierarchy/assets/{asset}', [AssetController::class, 'show'])->name('asset-hierarchy.assets.show');

    Route::get('asset-hierarchy/sectors', [SectorController::class, 'index'])->name('asset-hierarchy.sectors');
    Route::get('asset-hierarchy/sectors/create', [SectorController::class, 'create'])->name('asset-hierarchy.sectors.create');
    Route::post('asset-hierarchy/sectors', [SectorController::class, 'store'])->name('asset-hierarchy.sectors.store');
    Route::get('asset-hierarchy/sectors/{setor}', [SectorController::class, 'show'])->name('asset-hierarchy.sectors.show');
    Route::get('asset-hierarchy/sectors/{setor}/edit', [SectorController::class, 'edit'])->name('asset-hierarchy.sectors.edit');
    Route::put('asset-hierarchy/sectors/{setor}', [SectorController::class, 'update'])->name('asset-hierarchy.sectors.update');
    Route::delete('asset-hierarchy/sectors/{setor}', [SectorController::class, 'destroy'])->name('asset-hierarchy.sectors.destroy');
    Route::get('asset-hierarchy/sectors/{setor}/check-dependencies', [SectorController::class, 'checkDependencies'])->name('asset-hierarchy.sectors.check-dependencies');

    Route::get('asset-hierarchy/areas', [AreaController::class, 'index'])->name('asset-hierarchy.areas');
    Route::post('asset-hierarchy/areas', [AreaController::class, 'store'])->name('asset-hierarchy.areas.store');
    Route::get('asset-hierarchy/areas/{area}', [AreaController::class, 'show'])->name('asset-hierarchy.areas.show');
    Route::get('asset-hierarchy/areas/{area}/edit', [AreaController::class, 'edit'])->name('asset-hierarchy.areas.edit');
    Route::put('asset-hierarchy/areas/{area}', [AreaController::class, 'update'])->name('asset-hierarchy.areas.update');
    Route::delete('asset-hierarchy/areas/{area}', [AreaController::class, 'destroy'])->name('asset-hierarchy.areas.destroy');
    Route::get('asset-hierarchy/areas/{area}/check-dependencies', [AreaController::class, 'checkDependencies'])->name('asset-hierarchy.areas.check-dependencies');

    Route::get('asset-hierarchy/plants', [PlantsController::class, 'index'])->name('asset-hierarchy.plants');
    Route::post('asset-hierarchy/plants', [PlantsController::class, 'store'])->name('asset-hierarchy.plants.store');
    Route::get('asset-hierarchy/plants/{plant}', [PlantsController::class, 'show'])->name('asset-hierarchy.plants.show');
    Route::put('asset-hierarchy/plants/{plant}', [PlantsController::class, 'update'])->name('asset-hierarchy.plants.update');
    Route::delete('asset-hierarchy/plants/{plant}', [PlantsController::class, 'destroy'])->name('asset-hierarchy.plants.destroy');
    Route::get('asset-hierarchy/plants/{plant}/check-dependencies', [PlantsController::class, 'checkDependencies'])->name('asset-hierarchy.plants.check-dependencies');

    Route::get('asset-hierarchy/asset-types', [AssetTypeController::class, 'index'])->name('asset-hierarchy.asset-types');
Route::get('asset-hierarchy/asset-types/create', [AssetTypeController::class, 'create'])->name('asset-hierarchy.asset-types.create');
Route::post('asset-hierarchy/asset-types', [AssetTypeController::class, 'store'])->name('asset-hierarchy.asset-types.store');
Route::get('asset-hierarchy/asset-types/{assetType}', [AssetTypeController::class, 'show'])->name('asset-hierarchy.asset-types.show');
Route::get('asset-hierarchy/asset-types/{assetType}/edit', [AssetTypeController::class, 'edit'])->name('asset-hierarchy.asset-types.edit');
Route::put('asset-hierarchy/asset-types/{assetType}', [AssetTypeController::class, 'update'])->name('asset-hierarchy.asset-types.update');
Route::delete('asset-hierarchy/asset-types/{assetType}', [AssetTypeController::class, 'destroy'])->name('asset-hierarchy.asset-types.destroy');
Route::get('asset-hierarchy/asset-types/{assetType}/check-dependencies', [AssetTypeController::class, 'checkDependencies'])->name('asset-hierarchy.asset-types.check-dependencies');

    Route::get('asset-hierarchy/shifts', [ShiftController::class, 'index'])->name('asset-hierarchy.shifts');
    Route::get('asset-hierarchy/shifts/shift-editor', [ShiftController::class, 'create'])->name('asset-hierarchy.shifts.shift-editor');
    Route::post('asset-hierarchy/shifts', [ShiftController::class, 'store'])->name('asset-hierarchy.shifts.store');
    Route::get('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'show'])->name('asset-hierarchy.shifts.show');
    Route::get('asset-hierarchy/shifts/{shift}/edit', [ShiftController::class, 'edit'])->name('asset-hierarchy.shifts.edit');
    Route::put('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'update'])->name('asset-hierarchy.shifts.update');
    Route::delete('asset-hierarchy/shifts/{shift}', [ShiftController::class, 'destroy'])->name('asset-hierarchy.shifts.destroy');
    Route::get('asset-hierarchy/shifts/{shift}/check-dependencies', [ShiftController::class, 'checkDependencies'])->name('asset-hierarchy.shifts.check-dependencies');
    Route::get('asset-hierarchy/shifts/{shift}/assets', [ShiftController::class, 'getAssets'])->name('asset-hierarchy.shifts.assets');
    Route::post('asset-hierarchy/shifts/{shift}/copy-and-update', [ShiftController::class, 'copyAndUpdate'])->name('asset-hierarchy.shifts.copy-and-update');

    Route::get('asset-hierarchy/manufacturers', [ManufacturerController::class, 'index'])->name('asset-hierarchy.manufacturers');
    Route::get('asset-hierarchy/manufacturers/all', [ManufacturerController::class, 'all'])->name('asset-hierarchy.manufacturers.all');
    Route::post('asset-hierarchy/manufacturers', [ManufacturerController::class, 'store'])->name('asset-hierarchy.manufacturers.store');
    Route::get('asset-hierarchy/manufacturers/{manufacturer}', [ManufacturerController::class, 'show'])->name('asset-hierarchy.manufacturers.show');
    Route::get('asset-hierarchy/manufacturers/{manufacturer}/edit', [ManufacturerController::class, 'edit'])->name('asset-hierarchy.manufacturers.edit');
    Route::put('asset-hierarchy/manufacturers/{manufacturer}', [ManufacturerController::class, 'update'])->name('asset-hierarchy.manufacturers.update');
    Route::delete('asset-hierarchy/manufacturers/{manufacturer}', [ManufacturerController::class, 'destroy'])->name('asset-hierarchy.manufacturers.destroy');
    Route::get('asset-hierarchy/manufacturers/{manufacturer}/check-dependencies', [ManufacturerController::class, 'checkDependencies'])->name('asset-hierarchy.manufacturers.check-dependencies');
    Route::get('asset-hierarchy/manufacturers/{manufacturer}/assets', [ManufacturerController::class, 'assets'])->name('asset-hierarchy.manufacturers.assets');
});
