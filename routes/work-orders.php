<?php

use App\Http\Controllers\WorkOrders\WorkOrderController;
use App\Http\Controllers\WorkOrders\WorkOrderExecutionController;
use App\Http\Controllers\WorkOrders\WorkOrderSchedulingController;
use App\Http\Controllers\WorkOrders\WorkOrderPlanningController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Work Order Management
    Route::prefix('work-orders')->name('work-orders.')->group(function () {
        // Main work order routes
        Route::get('/', [WorkOrderController::class, 'index'])->name('index');
        Route::get('/dashboard', [WorkOrderController::class, 'dashboard'])->name('dashboard');
        Route::get('/create', [WorkOrderController::class, 'create'])->name('create');
        Route::post('/', [WorkOrderController::class, 'store'])->name('store');
        Route::get('/{workOrder}', [WorkOrderController::class, 'show'])->name('show');
        Route::get('/{workOrder}/edit', [WorkOrderController::class, 'edit'])->name('edit');
        Route::put('/{workOrder}', [WorkOrderController::class, 'update'])->name('update');
        Route::post('/{workOrder}/status', [WorkOrderController::class, 'updateStatus'])->name('update-status');
        
        // Planning
        Route::prefix('{workOrder}/planning')->name('planning.')->group(function () {
            Route::get('/', [WorkOrderPlanningController::class, 'edit'])->name('edit');
            Route::put('/', [WorkOrderPlanningController::class, 'update'])->name('update');
        });
        
        // Execution
        Route::prefix('{workOrder}/executions')->name('executions.')->group(function () {
            Route::post('/', [WorkOrderExecutionController::class, 'create'])->name('create');
            Route::get('/{execution}', [WorkOrderExecutionController::class, 'show'])->name('show');
            Route::post('/{execution}/start', [WorkOrderExecutionController::class, 'start'])->name('start');
            Route::post('/{execution}/pause', [WorkOrderExecutionController::class, 'pause'])->name('pause');
            Route::post('/{execution}/resume', [WorkOrderExecutionController::class, 'resume'])->name('resume');
            Route::post('/{execution}/complete', [WorkOrderExecutionController::class, 'complete'])->name('complete');
            Route::post('/{execution}/task-responses/{taskResponse}', [WorkOrderExecutionController::class, 'saveTaskResponse'])->name('save-task-response');
        });
    });
    
    // Work Order Scheduling
    Route::prefix('work-order-scheduling')->name('work-order-scheduling.')->group(function () {
        Route::get('/', [WorkOrderSchedulingController::class, 'index'])->name('index');
        Route::post('/work-orders/{workOrder}/schedule', [WorkOrderSchedulingController::class, 'schedule'])->name('schedule');
        Route::post('/batch-schedule', [WorkOrderSchedulingController::class, 'batchSchedule'])->name('batch-schedule');
        Route::get('/technician-workload', [WorkOrderSchedulingController::class, 'technicianWorkload'])->name('technician-workload');
        Route::post('/optimize', [WorkOrderSchedulingController::class, 'optimizeSchedule'])->name('optimize');
    });
});