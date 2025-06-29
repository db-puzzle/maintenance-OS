<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\UserPermissionController;
use App\Http\Controllers\UserRoleController;
use App\Http\Controllers\UserActivityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // User management
    Route::resource('users', UserController::class);
    
    // Soft deleted users management (only for administrators)
    Route::prefix('users')->name('users.')->middleware('can:users.delete')->group(function () {
        Route::get('/deleted/list', [UserController::class, 'deleted'])->name('deleted');
        Route::post('/{user}/restore', [UserController::class, 'restore'])->name('restore')->withTrashed();
        Route::delete('/{user}/force-delete', [UserController::class, 'forceDelete'])->name('force-delete')->withTrashed();
    });
    
    // User permissions
    Route::prefix('users/{user}/permissions')->name('users.permissions.')->group(function () {
        Route::get('/', [UserPermissionController::class, 'index'])->name('index');
        Route::post('/grant', [UserPermissionController::class, 'grant'])->name('grant');
        Route::post('/revoke', [UserPermissionController::class, 'revoke'])->name('revoke');
        Route::post('/bulk', [UserPermissionController::class, 'bulkUpdate'])->name('bulk');
        Route::get('/available', [UserPermissionController::class, 'available'])->name('available');
        Route::get('/history', [UserPermissionController::class, 'history'])->name('history');
        Route::post('/copy/{targetUser}', [UserPermissionController::class, 'copy'])->name('copy');
    });
    
    // Role-based permission application
    Route::prefix('users/{user}/roles')->name('users.roles.')->group(function () {
        Route::post('/apply', [UserRoleController::class, 'applyRoleToEntity'])->name('apply');
        Route::get('/preview', [UserRoleController::class, 'previewPermissions'])->name('preview');
        Route::delete('/remove', [UserRoleController::class, 'removeRole'])->name('remove');
    });
    
    // User activity/audit logs (scoped)
    Route::get('users/{user}/activity', [UserActivityController::class, 'show'])->name('users.activity.show');
}); 