<?php

use App\Http\Controllers\RoleController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\RoleUserController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('settings/timezone', [ProfileController::class, 'updateTimezone'])->name('profile.update.timezone');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/permissions', [ProfileController::class, 'permissions'])->name('settings.permissions');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    // Role Management Routes
    Route::prefix('settings/roles')->name('roles.')->group(function () {
        // Main role routes
        Route::get('/', [RoleController::class, 'index'])->name('index');
        Route::get('/create', [RoleController::class, 'create'])->name('create');
        Route::post('/', [RoleController::class, 'store'])->name('store');
        Route::get('/{role}', [RoleController::class, 'show'])->name('show');
        Route::get('/{role}/edit', [RoleController::class, 'edit'])->name('edit');
        Route::put('/{role}', [RoleController::class, 'update'])->name('update');
        Route::delete('/{role}', [RoleController::class, 'destroy'])->name('destroy');
        Route::post('/{role}/duplicate', [RoleController::class, 'duplicate'])->name('duplicate');

        // Role permissions management
        Route::get('/{role}/permissions', [RolePermissionController::class, 'index'])->name('permissions.index');
        Route::put('/{role}/permissions', [RolePermissionController::class, 'update'])->name('permissions.update');
        Route::post('/{role}/permissions/bulk', [RolePermissionController::class, 'bulkUpdate'])->name('permissions.bulk');

        // Role user assignments with entity support
        Route::get('/{role}/users', [RoleUserController::class, 'index'])->name('users.index');
        Route::post('/{role}/users', [RoleUserController::class, 'assign'])->name('users.assign');
        Route::delete('/{role}/users/{user}', [RoleUserController::class, 'remove'])->name('users.remove');
        Route::put('/{role}/users/{user}/entities', [RoleUserController::class, 'updateEntities'])->name('users.update-entities');
        Route::get('/{role}/available-users', [RoleUserController::class, 'availableUsers'])->name('users.available');
        Route::get('/{role}/available-entities', [RoleUserController::class, 'availableEntities'])->name('users.available-entities');
    });
});
