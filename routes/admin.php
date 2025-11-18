<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\UserInvitationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin Routes (for tenant admin panel, not central admin)
|--------------------------------------------------------------------------
|
| These routes are for administrative functions within a tenant context.
|
*/

Route::middleware(['auth', 'verified'])->group(function () {
    // User Invitations (authenticated routes)
    Route::prefix('invitations')->group(function () {
        Route::get('/', [UserInvitationController::class, 'index'])->name('invitations.index');
        Route::get('/create', [UserInvitationController::class, 'create'])->name('invitations.create');
        Route::post('/', [UserInvitationController::class, 'store'])->name('invitations.store');
        Route::post('/{invitation}/resend', [UserInvitationController::class, 'resend'])->name('invitations.resend');
        Route::delete('/{invitation}', [UserInvitationController::class, 'destroy'])->name('invitations.destroy');
        Route::get('/pending', [UserInvitationController::class, 'pending'])->name('invitations.pending');
    });

    // User Invitations (public routes for accepting invitations - must come after specific routes)
    Route::get('/invitations/{token}', [UserInvitationController::class, 'show'])->name('invitations.show')->middleware('signed')->withoutMiddleware(['auth', 'verified']);
    Route::post('/invitations/{token}/accept', [UserInvitationController::class, 'accept'])->name('invitations.accept')->withoutMiddleware(['auth', 'verified']);

    // Permission Management (Admin only)
    Route::middleware('can:users.manage-permissions')->group(function () {
        // Route::resource('permissions', PermissionController::class); // Deprecated - use roles page instead
        Route::post('permissions/sync-matrix', [PermissionController::class, 'syncMatrix'])->name('permissions.sync-matrix');
        Route::post('permissions/check', [PermissionController::class, 'check'])->name('permissions.check');
        Route::post('permissions/check-bulk', [PermissionController::class, 'checkBulk'])->name('permissions.check-bulk');
    });

    // Role Management
    // Note: Main role routes are in routes/settings.php
    // These are legacy API routes that may be deprecated
    Route::get('roles/{role}/permissions', [RoleController::class, 'permissions'])->name('roles.permissions');
    Route::post('roles/{role}/assign-user', [RoleController::class, 'assignUser'])->name('roles.assign-user');
    Route::post('roles/{role}/remove-user/{user}', [RoleController::class, 'removeUser'])->name('roles.remove-user');
    // Route::post('roles/{role}/duplicate', [RoleController::class, 'duplicate'])->name('roles.duplicate'); // Removed - duplicates routes/settings.php

    // Audit Logs (Super Admin only)
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('/export', [AuditLogController::class, 'export'])->name('audit-logs.export');
        Route::get('/stats', [AuditLogController::class, 'stats'])->name('audit-logs.stats');
        Route::get('/{auditLog}', [AuditLogController::class, 'show'])->name('audit-logs.show');
        Route::post('/cleanup', [AuditLogController::class, 'cleanup'])->name('audit-logs.cleanup');
    });

    // Super Admin Routes (API-only)
    Route::middleware('can:super-admin-access')->prefix('super-admin')->group(function () {
        Route::post('/invite-super-admin', [SuperAdminController::class, 'inviteSuperAdmin']);
    });
});
