<?php

use App\Http\Controllers\WorkOrders\WorkOrderController;
use App\Http\Controllers\WorkOrders\WorkOrderExecutionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->prefix('maintenance')->group(function () {
    // Work Orders
    Route::resource('work-orders', WorkOrderController::class);
    
    // Work Order Actions
    Route::post('work-orders/{work_order}/approve', [WorkOrderController::class, 'approve'])
        ->name('work-orders.approve');
    Route::post('work-orders/{work_order}/reject', [WorkOrderController::class, 'reject'])
        ->name('work-orders.reject');
    Route::post('work-orders/{work_order}/cancel', [WorkOrderController::class, 'cancel'])
        ->name('work-orders.cancel');
        
    // Work Order Execution
    Route::prefix('work-orders/{work_order}')->name('work-orders.')->group(function () {
        Route::post('start', [WorkOrderExecutionController::class, 'start'])
            ->name('start');
        Route::get('execute', [WorkOrderExecutionController::class, 'execute'])
            ->name('execute');
        Route::post('pause', [WorkOrderExecutionController::class, 'pause'])
            ->name('pause');
        Route::post('resume', [WorkOrderExecutionController::class, 'resume'])
            ->name('resume');
        Route::post('complete', [WorkOrderExecutionController::class, 'complete'])
            ->name('complete');
        Route::post('cancel-execution', [WorkOrderExecutionController::class, 'cancel'])
            ->name('cancel-execution');
    });
});