<?php

use App\Http\Controllers\AssetHierarchy\AssetController;
use App\Http\Controllers\Maintenance\RoutineController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->prefix('maintenance')->name('maintenance.')->group(function () {

    // Routines Management
    Route::prefix('routines')->name('routines.')->group(function () {


        // Routine management routes (API only - UI handled by sheets)
        Route::post('/', [RoutineController::class, 'store'])->name('store');
        Route::put('/{routine}', [RoutineController::class, 'update'])->name('update');
        Route::delete('/{routine}', [RoutineController::class, 'destroy'])->name('destroy');
        Route::post('/{routine}/forms', [RoutineController::class, 'storeForm'])->name('forms.store');
        Route::post('/{routine}/forms/publish', [RoutineController::class, 'publishForm'])->name('forms.publish');
        Route::post('/{routine}/forms/save-and-publish', [RoutineController::class, 'saveAndPublishForm'])->name('forms.save-and-publish');
        Route::get('/{routine}/form-data', [RoutineController::class, 'getFormData'])->name('form-data');
        Route::get('/{routine}/published-version', [RoutineController::class, 'viewPublishedVersion'])->name('view-published-version');
        Route::get('/{routine}/version-history', [RoutineController::class, 'getVersionHistory'])->name('version-history');
        Route::get('/{routine}/version/{versionId}', [RoutineController::class, 'viewSpecificVersion'])->name('view-version');
        Route::post('/{routine}/generate-work-order', [RoutineController::class, 'generateWorkOrder'])->name('generate-work-order');
        Route::post('/{routine}/update-last-execution', [RoutineController::class, 'updateLastExecution'])->name('update-last-execution');
    });

    // Asset-related maintenance routes
    Route::prefix('assets/{asset}')->name('assets.')->group(function () {
        Route::post('/routines/{routine}/create-work-order', [RoutineController::class, 'createWorkOrder'])
            ->name('routines.create-work-order');
        Route::get('/work-order-history', [AssetController::class, 'getWorkOrderHistory'])
            ->name('work-order-history');
    });
});
