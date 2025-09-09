<?php

use App\Http\Controllers\Production\PlanningController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('production/planning')->name('production.planning.')->group(function () {
    // Core Planning Interface
    Route::get('/', [PlanningController::class, 'index'])->name('index');
    
    // Route Management
    Route::post('/orders/{order}/route', [PlanningController::class, 'saveRoute'])->name('orders.save-route');
    Route::post('/orders/{order}/apply-template', [PlanningController::class, 'applyTemplate'])->name('orders.apply-template');
    Route::post('/routes/templates', [PlanningController::class, 'saveAsTemplate'])->name('routes.save-as-template');
    
    // Bulk Operations
    Route::post('/orders/bulk-transition', [PlanningController::class, 'bulkTransition'])->name('orders.bulk-transition');
    Route::post('/orders/bulk-apply-template', [PlanningController::class, 'bulkApplyTemplate'])->name('orders.bulk-apply-template');
    Route::post('/orders/bulk-copy-route', [PlanningController::class, 'bulkCopyRoute'])->name('orders.bulk-copy-route');
    Route::post('/orders/bulk-clear-routes', [PlanningController::class, 'bulkClearRoutes'])->name('orders.bulk-clear-routes');
    
    // Template Management
    Route::delete('/routes/templates/{template}', [PlanningController::class, 'deleteTemplate'])->name('routes.templates.destroy');
});
