<?php

use App\Http\Controllers\WorkOrders\WorkOrderController;
use App\Http\Controllers\WorkOrders\WorkOrderExecutionController;
use App\Http\Controllers\WorkOrders\WorkOrderPlanningController;
use Illuminate\Support\Facades\Route;

// Maintenance discipline work orders
Route::prefix('maintenance/work-orders')
    ->name('maintenance.work-orders.')
    ->middleware(['auth', 'verified'])
    ->group(function () {
        Route::get('/', [WorkOrderController::class, 'index'])->name('index');
        Route::get('/create', [WorkOrderController::class, 'createNew'])->name('create');
        Route::post('/', [WorkOrderController::class, 'store'])->name('store');
        Route::get('/{workOrder}/edit', [WorkOrderController::class, 'edit'])->name('edit');
        Route::put('/{workOrder}', [WorkOrderController::class, 'update'])->name('update');
        Route::delete('/{workOrder}', [WorkOrderController::class, 'destroy'])->name('destroy');
        
        // Approval routes
        Route::get('/{workOrder}/approve', [WorkOrderController::class, 'showApproval'])->name('approve');
        Route::post('/{workOrder}/approve', [WorkOrderController::class, 'approve'])->name('approve.store');
        Route::post('/{workOrder}/reject', [WorkOrderController::class, 'reject'])->name('reject');
        
        // Planning routes
        Route::get('/{workOrder}/planning', [WorkOrderPlanningController::class, 'show'])->name('planning');
        Route::post('/{workOrder}/planning', [WorkOrderPlanningController::class, 'store'])->name('planning.store');
        Route::put('/{workOrder}/planning', [WorkOrderPlanningController::class, 'update'])->name('planning.update');
        Route::post('/{workOrder}/planning/complete', [WorkOrderPlanningController::class, 'complete'])->name('planning.complete');
        
        // Execution routes
        Route::get('/{workOrder}/execute', [WorkOrderExecutionController::class, 'show'])->name('execute');
        Route::post('/{workOrder}/execute', [WorkOrderExecutionController::class, 'store'])->name('execute.store');
        Route::post('/{workOrder}/execute/start', [WorkOrderExecutionController::class, 'start'])->name('execute.start');
        Route::post('/{workOrder}/execute/pause', [WorkOrderExecutionController::class, 'pause'])->name('execute.pause');
        Route::post('/{workOrder}/execute/resume', [WorkOrderExecutionController::class, 'resume'])->name('execute.resume');
        Route::post('/{workOrder}/execute/complete', [WorkOrderExecutionController::class, 'complete'])->name('execute.complete');
        
        // Task response routes
        Route::post('/{workOrder}/execute/task/{task}/response', [WorkOrderExecutionController::class, 'updateTaskResponse'])->name('execute.task.response');
        
        // Status management
        Route::post('/{workOrder}/cancel', [WorkOrderController::class, 'cancel'])->name('cancel');
        Route::post('/{workOrder}/hold', [WorkOrderController::class, 'hold'])->name('hold');
        Route::post('/{workOrder}/resume', [WorkOrderController::class, 'resumeFromHold'])->name('resume');
        
        // Validation routes
        Route::get('/{workOrder}/validate', [WorkOrderController::class, 'showValidation'])->name('validate');
        Route::post('/{workOrder}/validate', [WorkOrderController::class, 'validate'])->name('validate.store');
        Route::post('/{workOrder}/validate/rework', [WorkOrderController::class, 'requestRework'])->name('validate.rework');
        
        // Analysis routes (for corrective work orders)
        Route::get('/{workOrder}/analysis', [WorkOrderController::class, 'showAnalysis'])->name('analysis');
        Route::post('/{workOrder}/analysis', [WorkOrderController::class, 'storeAnalysis'])->name('analysis.store');
        
        // Reporting
        Route::get('/analytics', [WorkOrderController::class, 'analytics'])->name('analytics');
        Route::get('/calendar', [WorkOrderController::class, 'calendar'])->name('calendar');
        Route::get('/export', [WorkOrderController::class, 'export'])->name('export');
        
        // General work order route (must come after all specific routes)
        Route::get('/{workOrder}', [WorkOrderController::class, 'show'])->name('show');
});

// Future: Quality discipline work orders
// Route::prefix('quality/work-orders')
//     ->defaults('discipline', 'quality')
//     ->name('quality.work-orders.')
//     ->middleware(['auth', 'verified'])
//     ->group(function () {
//         // Same routes as maintenance but with quality context
//     });