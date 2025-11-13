<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminDatabaseController;
use App\Http\Controllers\Admin\BulkOperationsController;
use App\Http\Controllers\Admin\FeatureController;
use App\Http\Controllers\Admin\SystemHealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Central Routes
|--------------------------------------------------------------------------
|
| Here is where you can register central/admin routes for your application.
| These routes are loaded by the RouteServiceProvider and run on the
| central domain (not on tenant subdomains).
|
*/

// Admin Authentication Routes
Route::get('login', [\App\Http\Controllers\Auth\AdminAuthenticatedSessionController::class, 'create'])->name('admin.login');
Route::post('login', [\App\Http\Controllers\Auth\AdminAuthenticatedSessionController::class, 'store']);
Route::post('logout', [\App\Http\Controllers\Auth\AdminAuthenticatedSessionController::class, 'destroy'])->name('admin.logout');

// Protected Admin Routes
Route::middleware(['auth:admin'])->group(function () {
    // Dashboard
    Route::get('/', [AdminDashboardController::class, 'index'])->name('admin.dashboard');
    Route::post('/refresh', [AdminDashboardController::class, 'refresh'])->name('admin.dashboard.refresh');

    // Account Management
    Route::resource('accounts', AccountController::class)->names('admin.accounts');

    // Database Operations
    Route::prefix('accounts/{account}')->name('admin.accounts.')->group(function () {
        Route::post('migrate', [AdminDatabaseController::class, 'migrate'])->name('migrate');
        Route::post('seed', [AdminDatabaseController::class, 'seed'])->name('seed');
        Route::post('refresh', [AdminDatabaseController::class, 'refresh'])->name('refresh');
        Route::post('clear-cache', [AdminDatabaseController::class, 'clearCache'])->name('clear-cache');
        Route::post('optimize', [AdminDatabaseController::class, 'optimize'])->name('optimize');
        Route::post('maintenance', [AdminDatabaseController::class, 'maintenanceMode'])->name('maintenance');
        Route::get('stats', [AdminDatabaseController::class, 'stats'])->name('stats');
    });

    // Bulk Operations
    Route::prefix('bulk')->name('admin.bulk.')->group(function () {
        Route::post('suspend', [BulkOperationsController::class, 'suspend'])->name('suspend');
        Route::post('command', [BulkOperationsController::class, 'runCommand'])->name('command');
    });

    // System Health
    Route::get('health', [SystemHealthController::class, 'index'])->name('admin.health');
    Route::get('health/{account}', [SystemHealthController::class, 'show'])->name('admin.health.show');

    // Feature Flags Management
    Route::prefix('features')->name('admin.features.')->group(function () {
        Route::get('/', [FeatureController::class, 'index'])->name('index');
        Route::post('{feature}/toggle-global', [FeatureController::class, 'toggleGlobal'])->name('toggle-global');
        Route::post('{feature}/plan-assignments', [FeatureController::class, 'updatePlanAssignments'])->name('plan-assignments');
        Route::put('{feature}', [FeatureController::class, 'update'])->name('update');
        Route::post('clear-cache', [FeatureController::class, 'clearCache'])->name('clear-cache');
    });
});
