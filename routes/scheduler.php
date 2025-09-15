<?php

use App\Http\Controllers\Production\SchedulerController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Production Scheduler Routes
|--------------------------------------------------------------------------
|
| Here is where you can register scheduler routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group.
|
*/

Route::middleware(['auth', 'verified'])->prefix('scheduler')->name('scheduler.')->group(function () {
    // Main scheduler view
    Route::get('/', [SchedulerController::class, 'index'])->name('index');
    
    // Schedule versions
    Route::get('/versions', [SchedulerController::class, 'versions'])->name('versions');
    Route::post('/versions', [SchedulerController::class, 'createVersion'])->name('versions.create');
    Route::get('/versions/{version}', [SchedulerController::class, 'show'])->name('versions.show');
    Route::delete('/versions/{version}', [SchedulerController::class, 'destroy'])->name('versions.destroy');
    
    // Schedule data
    Route::get('/versions/{version}/data', [SchedulerController::class, 'getScheduleData'])->name('versions.data');
    Route::get('/manufacturing-orders', [SchedulerController::class, 'getManufacturingOrders'])->name('manufacturing-orders');
    Route::get('/work-cells', [SchedulerController::class, 'getWorkCells'])->name('work-cells');
    Route::get('/work-cells/{workCell}/availability', [SchedulerController::class, 'getWorkCellAvailability'])->name('work-cells.availability');
    
    // Schedule operations
    Route::post('/versions/{version}/schedule', [SchedulerController::class, 'schedule'])->name('versions.schedule');
    Route::post('/versions/{version}/publish', [SchedulerController::class, 'publish'])->name('versions.publish');
    Route::post('/versions/{version}/snapshots', [SchedulerController::class, 'createSnapshot'])->name('versions.snapshots.create');
    
    // Individual schedule updates
    Route::put('/schedules/{schedule}', [SchedulerController::class, 'updateSchedule'])->name('schedules.update');
    Route::post('/schedules/{schedule}/lock', [SchedulerController::class, 'lockSchedule'])->name('schedules.lock');
    Route::delete('/schedules/{schedule}/lock', [SchedulerController::class, 'unlockSchedule'])->name('schedules.unlock');
    
    // Alerts
    Route::get('/versions/{version}/alerts', [SchedulerController::class, 'getAlerts'])->name('versions.alerts');
    Route::put('/alerts/{alert}/resolve', [SchedulerController::class, 'resolveAlert'])->name('alerts.resolve');
});