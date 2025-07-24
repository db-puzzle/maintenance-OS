<?php

use App\Http\Controllers\Production\ItemController;
use App\Http\Controllers\Production\BillOfMaterialController;
use App\Http\Controllers\Production\ProductionRoutingController;
use App\Http\Controllers\Production\ProductionScheduleController;
use App\Http\Controllers\Production\ProductionOrderController;
use App\Http\Controllers\Production\QrTrackingController;
use App\Http\Controllers\Production\ShipmentController;
use App\Http\Controllers\Production\WorkCellController;
use App\Http\Controllers\Production\ProductionExecutionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('production')->name('production.')->group(function () {
    // Items Management
    Route::resource('items', ItemController::class)->except(['edit']);
    Route::get('items/{item}/bom', [ItemController::class, 'bom'])->name('items.bom');
    Route::get('items/{item}/bom-history', [ItemController::class, 'bomHistory'])->name('items.bom-history');
    Route::get('items/{item}/where-used', [ItemController::class, 'whereUsed'])->name('items.where-used');

    // BOMs Management
    Route::resource('bom', BillOfMaterialController::class);
    Route::get('bom/{bom}/hierarchy', [BillOfMaterialController::class, 'hierarchy'])->name('bom.hierarchy');
    Route::post('bom/{bom}/duplicate', [BillOfMaterialController::class, 'duplicate'])->name('bom.duplicate');
    Route::get('bom/{bom}/export', [BillOfMaterialController::class, 'export'])->name('bom.export');
    Route::get('bom/{bom}/export-excel', [BillOfMaterialController::class, 'exportExcel'])->name('bom.export-excel');
    Route::get('bom/import/wizard', [BillOfMaterialController::class, 'importWizard'])->name('bom.import.wizard');
    Route::post('bom/import', [BillOfMaterialController::class, 'import'])->name('bom.import');
    Route::post('bom/import/inventor', [BillOfMaterialController::class, 'importInventor'])->name('bom.import.inventor');
    
    // BOM Items Management
    Route::post('bom/{bom}/items', [BillOfMaterialController::class, 'addItem'])->name('bom.items.add');
    Route::put('bom/{bom}/items/{item}', [BillOfMaterialController::class, 'updateItem'])->name('bom.items.update');
    Route::delete('bom/{bom}/items/{item}', [BillOfMaterialController::class, 'removeItem'])->name('bom.items.remove');
    Route::post('bom/{bom}/items/{item}/move', [BillOfMaterialController::class, 'moveItem'])->name('bom.items.move');
    
    // BOM Versions
    Route::post('bom/{bom}/versions', [BillOfMaterialController::class, 'createVersion'])->name('bom.versions.create');
    Route::post('bom/{bom}/versions/{version}/set-current', [BillOfMaterialController::class, 'setCurrentVersion'])->name('bom.versions.set-current');
    Route::get('bom/{bom}/compare', [BillOfMaterialController::class, 'compare'])->name('bom.compare');
    
    // BOM Analysis
    Route::get('bom/{bom}/cost-rollup', [BillOfMaterialController::class, 'costRollup'])->name('bom.cost-rollup');
    
    // QR Code Management
    Route::post('bom/{bom}/generate-qr', [BillOfMaterialController::class, 'generateQrCodes'])->name('bom.generate-qr');
    Route::post('bom/{bom}/print-labels', [BillOfMaterialController::class, 'printLabels'])->name('bom.print-labels');

    // Routing Management
    Route::resource('routing', ProductionRoutingController::class);
    Route::get('routing/{routing}/builder', [ProductionRoutingController::class, 'builder'])->name('routing.builder');

    // Production Planning
    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [ProductionScheduleController::class, 'index'])->name('index');
        Route::get('/calendar', [ProductionScheduleController::class, 'calendar'])->name('calendar');
        Route::get('/gantt', [ProductionScheduleController::class, 'gantt'])->name('gantt');
        Route::resource('orders', ProductionOrderController::class);
    });

    // Production Tracking
    Route::prefix('tracking')->name('tracking.')->group(function () {
        Route::get('/', [QrTrackingController::class, 'dashboard'])->name('dashboard');
        Route::get('/scan', [QrTrackingController::class, 'scan'])->name('scan');
        Route::post('/scan', [QrTrackingController::class, 'processScan'])->name('scan.process');
    });

    // Shipments
    Route::resource('shipments', ShipmentController::class);
    Route::post('shipments/{shipment}/photos', [ShipmentController::class, 'uploadPhotos'])->name('shipments.photos');

    // Work Cells
    Route::resource('work-cells', WorkCellController::class);

    // Production Execution
    Route::prefix('executions')->name('executions.')->group(function () {
        Route::post('start', [ProductionExecutionController::class, 'start'])->name('start');
        Route::post('{execution}/complete', [ProductionExecutionController::class, 'complete'])->name('complete');
        Route::post('{execution}/pause', [ProductionExecutionController::class, 'pause'])->name('pause');
        Route::post('{execution}/resume', [ProductionExecutionController::class, 'resume'])->name('resume');
    });
}); 