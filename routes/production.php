<?php

use App\Http\Controllers\Production\BillOfMaterialController;
use App\Http\Controllers\Production\ItemCategoryController;
use App\Http\Controllers\Production\ItemController;
use App\Http\Controllers\Production\ItemImageController;
use App\Http\Controllers\Production\ItemImageImportController;
use App\Http\Controllers\Production\ItemImageServeController;
use App\Http\Controllers\Production\ManufacturingOrderController;
use App\Http\Controllers\Production\ManufacturingStepController;
use App\Http\Controllers\Production\PlanningController;
use App\Http\Controllers\Production\ProductionExecutionController;
use App\Http\Controllers\Production\ProductionRoutingController;
use App\Http\Controllers\Production\ProductionScheduleController;
// use App\Http\Controllers\Production\ProductionTrackingController; // Controller not implemented
use App\Http\Controllers\Production\QrCodeController;
use App\Http\Controllers\Production\QrTagController;
use App\Http\Controllers\Production\QrTagServeController;
use App\Http\Controllers\Production\QrTrackingController;
use App\Http\Controllers\Production\RouteTemplateController;
use App\Http\Controllers\Production\ShipmentController;
use App\Http\Controllers\Production\StepExecutionController;
use App\Http\Controllers\Production\WorkCellController;
use App\Http\Controllers\Production\WorkCellDashboardController;
use App\Http\Controllers\Production\WorkCellParallelResourceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('production')->name('production.')->group(function () {
    // Route Templates
    Route::prefix('templates')->name('templates.')->group(function () {
        Route::get('/', [RouteTemplateController::class, 'index'])->name('index');
        Route::get('/create', [RouteTemplateController::class, 'create'])->name('create');
        Route::post('/', [RouteTemplateController::class, 'store'])->name('store');
        Route::get('/{template}', [RouteTemplateController::class, 'show'])->name('show');
        Route::get('/{template}/edit', [RouteTemplateController::class, 'edit'])->name('edit');
        Route::put('/{template}', [RouteTemplateController::class, 'update'])->name('update');
        Route::delete('/{template}', [RouteTemplateController::class, 'destroy'])->name('destroy');
        Route::post('/{template}/copy-to-order', [RouteTemplateController::class, 'copyToOrder'])->name('copy-to-order');
        Route::get('/select', [RouteTemplateController::class, 'select'])->name('select');
    });

    // Route Template from Production Route
    Route::post('routes/{route}/save-as-template', [RouteTemplateController::class, 'saveAsTemplate'])->name('routes.save-as-template');

    // QR scan deep-links (mobile/browser)
    Route::get('items/{item_number}/qr', [QrCodeController::class, 'handleItemScan'])->name('items.qr');
    Route::get('orders/{mo_number}/qr', [QrCodeController::class, 'handleOrderScan'])->name('orders.qr');
    // Item Categories Management
    Route::get('categories', [ItemCategoryController::class, 'index'])->name('categories.index');
    Route::post('categories', [ItemCategoryController::class, 'store'])->name('categories.store');
    Route::get('categories/{category}', [ItemCategoryController::class, 'show'])->name('categories.show');
    Route::put('categories/{category}', [ItemCategoryController::class, 'update'])->name('categories.update');
    Route::delete('categories/{category}', [ItemCategoryController::class, 'destroy'])->name('categories.destroy');
    Route::get('categories/{category}/check-dependencies', [ItemCategoryController::class, 'checkDependencies'])->name('categories.check-dependencies');

    // Items Management
    // Define specific routes before resource routes to avoid conflicts
    Route::get('items/export', [ItemController::class, 'export'])->name('items.export');
    Route::get('items/import/wizard', [ItemController::class, 'importWizard'])->name('items.import.wizard');
    Route::post('items/import', [ItemController::class, 'import'])->name('items.import');
    Route::post('items/import/check-existing', [ItemController::class, 'checkExistingItems'])->name('items.import.check-existing');

    // Resource routes come after specific routes
    Route::resource('items', ItemController::class)->except(['edit']);

    // Item-specific routes
    Route::get('items/{item}/bom', [ItemController::class, 'bom'])->name('items.bom');
    Route::get('items/{item}/bom-history', [ItemController::class, 'bomHistory'])->name('items.bom-history');
    Route::get('items/{item}/where-used', [ItemController::class, 'whereUsed'])->name('items.where-used');
    Route::get('items/{item}/with-images', [ItemController::class, 'getWithImages'])->name('items.with-images');

    // Item Images Management
    Route::prefix('items/{item}/images')->name('items.images.')->group(function () {
        Route::post('/', [ItemImageController::class, 'store'])->name('store');
        Route::patch('/{image}', [ItemImageController::class, 'update'])->name('update');
        Route::delete('/{image}', [ItemImageController::class, 'destroy'])->name('destroy');
        Route::post('/reorder', [ItemImageController::class, 'reorder'])->name('reorder');
        Route::post('/bulk-delete', [ItemImageController::class, 'bulkDelete'])->name('bulk-delete');

        // Protected image serving routes
        Route::get('/{image}/serve', [ItemImageServeController::class, 'serve'])->name('serve');
        Route::get('/{image}/variant/{variant}', [ItemImageServeController::class, 'serveVariant'])->name('serve-variant');
    });

    // Item Images - Bulk Import Wizard
    Route::prefix('items/images')->name('items.images.')->group(function () {
        Route::get('/import/wizard', [ItemImageImportController::class, 'wizard'])->name('import.wizard');
        Route::post('/import', [ItemImageImportController::class, 'import'])->name('import'); // Legacy single-batch import

        // New bulk import endpoints
        Route::post('/import/init-session', [ItemImageImportController::class, 'initSession'])->name('import.init-session');
        Route::post('/import/validate-files', [ItemImageImportController::class, 'validateFiles'])->name('import.validate-files');
        Route::post('/import/start-chunked-upload', [ItemImageImportController::class, 'startChunkedUpload'])->name('import.start-chunked-upload');
        Route::post('/import/upload-chunk', [ItemImageImportController::class, 'uploadChunk'])->name('import.upload-chunk');
        Route::post('/import/process', [ItemImageImportController::class, 'processUploads'])->name('import.process');
        Route::get('/import/session/{sessionId}/status', [ItemImageImportController::class, 'getSessionStatus'])->name('import.session-status');
        Route::post('/import/session/{sessionId}/cancel', [ItemImageImportController::class, 'cancelSession'])->name('import.cancel-session');
        Route::post('/import/check-duplicates', [ItemImageImportController::class, 'checkDuplicates'])->name('import.check-duplicates');
    });

    // BOMs Management
    Route::resource('bom', BillOfMaterialController::class);
    Route::post('bom/{bom}/duplicate', [BillOfMaterialController::class, 'duplicate'])->name('bom.duplicate');
    Route::get('bom/{bom}/export', [BillOfMaterialController::class, 'export'])->name('bom.export');
    Route::get('bom/{bom}/export-excel', [BillOfMaterialController::class, 'exportExcel'])->name('bom.export-excel');

    // BOM Import - Session-based wizard
    Route::prefix('bom')->name('bom.')->group(function () {
        // Wizard entry point
        Route::get('/import/wizard', [BillOfMaterialController::class, 'importWizard'])->name('import.wizard');

        // Session management
        Route::post('/import/init-session', [BillOfMaterialController::class, 'initImportSession'])->name('import.init-session');
        Route::get('/import/session/{sessionId}/status', [BillOfMaterialController::class, 'getImportSessionStatus'])->name('import.session-status');
        Route::post('/import/session/{sessionId}/cancel', [BillOfMaterialController::class, 'cancelImportSession'])->name('import.cancel-session');

        // File processing steps
        Route::post('/import/upload-file', [BillOfMaterialController::class, 'uploadImportFile'])->name('import.upload-file');
        Route::post('/import/validate-data', [BillOfMaterialController::class, 'validateImportData'])->name('import.validate-data');
        Route::post('/import/process', [BillOfMaterialController::class, 'processImport'])->name('import.process');

        // Legacy routes (keep for backward compatibility)
        Route::post('/import', [BillOfMaterialController::class, 'import'])->name('import');
        Route::post('/import/inventor', [BillOfMaterialController::class, 'importInventor'])->name('import.inventor');
    });

    // BOM Items Management
    Route::post('bom/{bom}/items', [BillOfMaterialController::class, 'addItem'])->name('bom.items.add');
    Route::put('bom/{bom}/items/{item}', [BillOfMaterialController::class, 'updateItem'])->name('bom.items.update');
    Route::delete('bom/{bom}/items/{item}', [BillOfMaterialController::class, 'removeItem'])->name('bom.items.remove');
    Route::post('bom/{bom}/items/{item}/move', [BillOfMaterialController::class, 'moveItem'])->name('bom.items.move');

    // BOM Versions
    Route::post('bom/{bom}/versions', [BillOfMaterialController::class, 'createVersion'])->name('bom.versions.create');
    Route::post('bom/{bom}/versions/{version}/set-current', [BillOfMaterialController::class, 'setCurrentVersion'])->name('bom.versions.set-current');
    // Route::get('bom/{bom}/compare', [BillOfMaterialController::class, 'compare'])->name('bom.compare'); // Temporarily disabled - page not implemented

    // BOM Analysis
    Route::get('bom/{bom}/cost-rollup', [BillOfMaterialController::class, 'costRollup'])->name('bom.cost-rollup');

    // QR Code Management
    Route::post('bom/{bom}/generate-qr', [BillOfMaterialController::class, 'generateQrCodes'])->name('bom.generate-qr');
    Route::post('bom/{bom}/print-labels', [BillOfMaterialController::class, 'printLabels'])->name('bom.print-labels');

    // QR Tag Generation
    Route::prefix('qr-tags')->name('qr-tags.')->group(function () {
        Route::get('/', [QrTagController::class, 'index'])->name('index');
        Route::post('/items/{item}/generate', [QrTagController::class, 'generateItemTag'])->name('item');
        Route::post('/orders/{order}/generate', [QrTagController::class, 'generateOrderTag'])->name('order');
        Route::post('/batch', [QrTagController::class, 'generateBatch'])->name('batch');
        Route::get('/preview/{type}/{id}', [QrTagController::class, 'preview'])->name('preview');
        Route::get('/serve/{path}', [QrTagServeController::class, 'serve'])->name('serve')->where('path', '.*');
    });

    // Routing Management
    Route::get('routing/export', [ProductionRoutingController::class, 'export'])->name('routing.export');
    Route::get('routing/import/wizard', [ProductionRoutingController::class, 'importWizard'])->name('routing.import.wizard');
    Route::post('routing/import', [ProductionRoutingController::class, 'import'])->name('routing.import');
    Route::resource('routing', ProductionRoutingController::class)->except(['edit']);
    // DEPRECATED: Route removed as builder functionality is no longer needed
    // Route::get('routing/{routing}/builder', [ProductionRoutingController::class, 'builder'])->name('routing.builder');
    Route::post('routing/{routing}/steps', [ProductionRoutingController::class, 'storeStep'])->name('routing.steps.store');
    Route::put('routing/{routing}/steps/{step}', [ProductionRoutingController::class, 'updateStep'])->name('routing.steps.update');
    Route::delete('routing/{routing}/steps/{step}', [ProductionRoutingController::class, 'destroyStep'])->name('routing.steps.destroy');
    Route::post('routing/{routing}/steps/reorder', [ProductionRoutingController::class, 'reorderSteps'])->name('routing.steps.reorder');
    Route::post('routing/{routing}/batch-update', [ProductionRoutingController::class, 'batchUpdate'])->name('routing.batch-update');
    Route::post('routing/{routing}/steps/initialize', [ProductionRoutingController::class, 'initializeSteps'])->name('routing.steps.initialize');
    Route::post('routing/{routing}/steps/from-template', [ProductionRoutingController::class, 'createStepsFromTemplate'])->name('routing.steps.from-template');

    // Manufacturing Steps
    // Step execution routes - deprecated in favor of production.reporting.steps.* routes
    // Route::get('steps/{step}/execute', [ManufacturingStepController::class, 'execute'])->name('steps.execute');
    // Route::post('steps/{step}/start', [ManufacturingStepController::class, 'start'])->name('steps.start');
    // Route::post('steps/{step}/executions/{execution}/hold', [ManufacturingStepController::class, 'hold'])->name('steps.hold');
    // Route::post('steps/{step}/executions/{execution}/resume', [ManufacturingStepController::class, 'resume'])->name('steps.resume');
    // Route::post('steps/{step}/executions/{execution}/quality', [ManufacturingStepController::class, 'recordQualityResult'])->name('steps.quality');
    // Route::post('steps/{step}/executions/{execution}/complete', [ManufacturingStepController::class, 'complete'])->name('steps.complete');
    Route::post('steps/{step}/report-progress', [ManufacturingOrderController::class, 'reportStepProgress'])->name('steps.report-progress');
    Route::post('steps/{step}/update-dependencies', [ManufacturingStepController::class, 'updateDependencies'])->name('steps.update-dependencies');

    // Manufacturing Orders
    Route::resource('orders', ManufacturingOrderController::class)->except(['edit']);
    Route::post('orders/{order}/plan', [ManufacturingOrderController::class, 'plan'])->name('orders.plan');
    Route::post('orders/{order}/schedule', [ManufacturingOrderController::class, 'schedule'])->name('orders.schedule');
    Route::post('orders/{order}/release', [ManufacturingOrderController::class, 'release'])->name('orders.release');
    Route::post('orders/{order}/start', [ManufacturingOrderController::class, 'start'])->name('orders.start');
    Route::post('orders/{order}/hold', [ManufacturingOrderController::class, 'hold'])->name('orders.hold');
    Route::post('orders/{order}/resume', [ManufacturingOrderController::class, 'resume'])->name('orders.resume');
    Route::post('orders/{order}/cancel', [ManufacturingOrderController::class, 'cancel'])->name('orders.cancel');
    Route::post('orders/{order}/apply-template', [ManufacturingOrderController::class, 'applyTemplate'])->name('orders.apply-template');
    Route::post('orders/bulk-apply-template', [ManufacturingOrderController::class, 'bulkApplyTemplate'])->name('orders.bulk-apply-template');
    Route::post('orders/{order}/report-production', [ManufacturingOrderController::class, 'reportProduction'])->name('orders.report-production');

    // Order Routes
    Route::get('orders/{order}/routes/create', [ManufacturingOrderController::class, 'createRoute'])->name('orders.routes.create');
    Route::post('orders/{order}/routes', [ManufacturingOrderController::class, 'storeRoute'])->name('orders.routes.store');
    // Route::get('orders/{order}/children', [ManufacturingOrderController::class, 'children'])->name('orders.children'); // Temporarily disabled - page not implemented

    // Production Planning
    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [PlanningController::class, 'index'])->name('index');
        // Route::get('/calendar', [ProductionScheduleController::class, 'calendar'])->name('calendar'); // Temporarily disabled - page not implemented
        // Route::get('/workload', [ProductionScheduleController::class, 'workload'])->name('workload'); // Temporarily disabled - page not implemented
        Route::post('/optimize', [ProductionScheduleController::class, 'optimize'])->name('optimize');
    });

    // Production Schedules
    Route::prefix('schedules')->name('schedules.')->group(function () {
        Route::get('/', [ProductionScheduleController::class, 'index'])->name('index');
        // Route::get('/create', [ProductionScheduleController::class, 'create'])->name('create'); // Temporarily disabled - page not implemented
        Route::post('/', [ProductionScheduleController::class, 'store'])->name('store');
        Route::get('/{schedule}', [ProductionScheduleController::class, 'show'])->name('show');
        // Route::get('/{schedule}/edit', [ProductionScheduleController::class, 'edit'])->name('edit'); // Temporarily disabled - page not implemented
        Route::put('/{schedule}', [ProductionScheduleController::class, 'update'])->name('update');
        Route::post('/{schedule}/start', [ProductionScheduleController::class, 'start'])->name('start');
        Route::post('/{schedule}/complete', [ProductionScheduleController::class, 'complete'])->name('complete');
        Route::post('/{schedule}/hold', [ProductionScheduleController::class, 'hold'])->name('hold');
        Route::post('/{schedule}/resume', [ProductionScheduleController::class, 'resume'])->name('resume');
        Route::post('/{schedule}/cancel', [ProductionScheduleController::class, 'cancel'])->name('cancel');
    });

    // Production Tracking
    Route::prefix('tracking')->name('tracking.')->group(function () {
        // Route::get('/', [ProductionTrackingController::class, 'index'])->name('index'); // Controller not implemented
        // Route::get('/dashboard', [ProductionTrackingController::class, 'dashboard'])->name('dashboard'); // Controller not implemented
        Route::get('/mo-viewer', [\App\Http\Controllers\Production\MOViewerController::class, 'index'])->name('mo-viewer');
        Route::get('/mo-viewer/{orderId}/refresh', [\App\Http\Controllers\Production\MOViewerController::class, 'refresh'])->name('mo-viewer.refresh');
        Route::get('/mo-viewer/{orderId}/hierarchy', [\App\Http\Controllers\Production\MOViewerController::class, 'hierarchy'])->name('mo-viewer.hierarchy');
        Route::get('/scan', [QrTrackingController::class, 'scan'])->name('scan');
        Route::post('/scan', [QrTrackingController::class, 'processScan'])->name('scan.process');
        Route::post('/scan/handle', [QrTrackingController::class, 'handleScan'])->name('scan.handle');
    });

    // Production Reporting (Step-centric interface)
    Route::prefix('reporting')->name('reporting.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Production\ProductionReportingController::class, 'index'])->name('index');

        // Step execution endpoints (Inertia routes)
        Route::prefix('steps')->name('steps.')->group(function () {
            Route::post('/start', [StepExecutionController::class, 'start'])
                ->name('start');

            Route::post('/force-start', [StepExecutionController::class, 'forceStart'])
                ->name('force-start');

            Route::post('/{step}/skip', [StepExecutionController::class, 'skipStep'])
                ->name('skip');

            Route::post('/{step}/hold', [StepExecutionController::class, 'putOnHold'])
                ->name('hold');

            Route::post('/{step}/resume', [StepExecutionController::class, 'resumeFromHold'])
                ->name('resume');

            Route::post('/{step}/cancel', [StepExecutionController::class, 'cancelStep'])
                ->name('cancel');

            Route::post('/{step}/quality-result', [StepExecutionController::class, 'recordQualityResult'])
                ->name('quality-result');

            Route::get('/{step}/dependencies', [StepExecutionController::class, 'getDependencies'])
                ->name('dependencies');

            Route::get('/{step}/quality-requirements', [StepExecutionController::class, 'getQualityRequirements'])
                ->name('quality-requirements');

            Route::post('/{execution}/report', [StepExecutionController::class, 'reportProgress'])
                ->name('report');

            Route::post('/{execution}/upload-photo', [StepExecutionController::class, 'uploadPhoto'])
                ->name('upload-photo');

            Route::delete('/{execution}/photo/{media}', [StepExecutionController::class, 'deletePhoto'])
                ->name('delete-photo');
        });
    });

    // Shipments
    Route::resource('shipments', ShipmentController::class);
    Route::post('shipments/{shipment}/photos', [ShipmentController::class, 'uploadPhotos'])->name('shipments.photos');

    // Work Cells
    // Define specific routes before resource routes to avoid conflicts
    Route::get('work-cells/export', [WorkCellController::class, 'export'])->name('work-cells.export-list');
    Route::get('work-cells/import/wizard', [WorkCellController::class, 'importWizard'])->name('work-cells.import.wizard');
    Route::post('work-cells/import', [WorkCellController::class, 'import'])->name('work-cells.import');
    Route::post('work-cells/import/check-existing', [WorkCellController::class, 'checkExistingWorkCells'])->name('work-cells.import.check-existing');

    // Resource routes come after specific routes
    Route::resource('work-cells', WorkCellController::class);
    Route::get('work-cells/{workCell}/check-dependencies', [WorkCellController::class, 'checkDependencies'])->name('work-cells.check-dependencies');
    Route::get('work-cells/{workCell}/dashboard', [WorkCellDashboardController::class, 'show'])->name('work-cells.dashboard');
    Route::get('work-cells/{workCell}/analytics', [WorkCellDashboardController::class, 'analytics'])->name('work-cells.analytics');
    Route::post('work-cells/{workCell}/export', [WorkCellDashboardController::class, 'export'])->name('work-cells.export');
    Route::get('plants/{plant}/areas', [WorkCellController::class, 'getAreas'])->name('work-cells.get-areas');
    Route::get('areas/{area}/sectors', [WorkCellController::class, 'getSectors'])->name('work-cells.get-sectors');

    // Work Cell Parallel Resources
    Route::get('work-cells/{workCell}/parallel-resources', [WorkCellParallelResourceController::class, 'index'])->name('work-cells.parallel-resources.index');
    Route::post('work-cells/{workCell}/parallel-resources', [WorkCellParallelResourceController::class, 'store'])->name('work-cells.parallel-resources.store');
    Route::post('work-cells/{workCell}/parallel-resources/bulk', [WorkCellParallelResourceController::class, 'bulkUpdate'])->name('work-cells.parallel-resources.bulk');
    Route::delete('work-cells/{workCell}/parallel-resources/{parallelResource}', [WorkCellParallelResourceController::class, 'destroy'])->name('work-cells.parallel-resources.destroy');
    Route::get('work-cells/{workCell}/parallel-resources/availability', [WorkCellParallelResourceController::class, 'availability'])->name('work-cells.parallel-resources.availability');

    // Production Execution
    Route::prefix('executions')->name('executions.')->group(function () {
        Route::post('start', [ProductionExecutionController::class, 'start'])->name('start');
        Route::post('{execution}/complete', [ProductionExecutionController::class, 'complete'])->name('complete');
        Route::post('{execution}/pause', [ProductionExecutionController::class, 'pause'])->name('pause');
        Route::post('{execution}/resume', [ProductionExecutionController::class, 'resume'])->name('resume');
    });
});
