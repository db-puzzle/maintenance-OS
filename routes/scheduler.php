<?php

use App\Http\Controllers\Production\SchedulingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'web'])->prefix('production/scheduler')->group(function () {
    // Main scheduler interface
    Route::get('/', [SchedulingController::class, 'indexV2'])->name('production.scheduler.index');

    // Scheduler setup page
    Route::get('/setup', [SchedulingController::class, 'setup'])->name('production.scheduler.setup');

    // HDG-specific endpoints
    Route::post('/validate-orders', [SchedulingController::class, 'validateOrders'])->name('production.scheduler.validate');
    Route::get('/families', [SchedulingController::class, 'getFamilies'])->name('production.scheduler.families');
    Route::get('/results/{versionId}', [SchedulingController::class, 'results'])->name('production.scheduler.results');

    // Scheduling operations
    Route::post('/run', [SchedulingController::class, 'runScheduler'])->name('production.scheduler.run');
    Route::get('/versions/{version}/progress', [SchedulingController::class, 'getSchedulingProgress'])->name('production.scheduler.progress.old');
    Route::put('/schedules/{schedule}', [SchedulingController::class, 'updateSchedule'])->name('production.scheduler.update');
    Route::post('/schedules/{schedule}/toggle-lock', [SchedulingController::class, 'toggleLock'])->name('production.scheduler.toggle-lock');

    // Version management
    Route::post('/versions', [SchedulingController::class, 'createVersion'])->name('production.scheduler.versions.create');
    Route::post('/versions/{version}/publish', [SchedulingController::class, 'publishVersion'])->name('production.scheduler.versions.publish');

    // Alerts
    Route::get('/versions/{version}/alerts', [SchedulingController::class, 'getAlerts'])->name('production.scheduler.alerts');
    Route::post('/versions/{version}/alerts/{alert}/resolve', [SchedulingController::class, 'resolveAlert'])->name('production.scheduler.alerts.resolve');

    // Snapshots
    Route::post('/versions/{version}/snapshots', [SchedulingController::class, 'createSnapshot'])->name('production.scheduler.snapshots.create');
    Route::get('/versions/{version}/snapshots', [SchedulingController::class, 'getSnapshots'])->name('production.scheduler.snapshots.index');
    Route::post('/versions/{version}/snapshots/{snapshot}/restore', [SchedulingController::class, 'restoreSnapshot'])->name('production.scheduler.snapshots.restore');

    // Time Parameter Management
    Route::get('/prepare', [SchedulingController::class, 'prepareScheduling'])->name('production.scheduler.prepare');
    Route::patch('/steps/{step}/time', [SchedulingController::class, 'updateStepTime'])->name('production.steps.update-time');
    Route::post('/work-cells/{workCell}/rates', [SchedulingController::class, 'updateWorkCellRate'])->name('production.work-cells.update-rate');
    Route::post('/validate-time-parameters', [SchedulingController::class, 'validateTimeParameters'])->name('production.scheduler.validate-time-parameters');
});
