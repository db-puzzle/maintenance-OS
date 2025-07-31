<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\UserInvitationController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\SuperAdminController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('welcome');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('home', function () {
        return Inertia::render('home');
    })->name('home');

    // User Invitations (authenticated routes)
    Route::prefix('invitations')->group(function () {
        Route::get('/', [UserInvitationController::class, 'index'])->name('invitations.index');
        Route::get('/create', [UserInvitationController::class, 'create'])->name('invitations.create');
        Route::post('/', [UserInvitationController::class, 'store'])->name('invitations.store');
        Route::post('/{invitation}/revoke', [UserInvitationController::class, 'revoke'])->name('invitations.revoke');
        Route::post('/{invitation}/resend', [UserInvitationController::class, 'resend'])->name('invitations.resend');
        Route::get('/pending', [UserInvitationController::class, 'pending'])->name('invitations.pending');
    });

    // User Invitations (public routes for accepting invitations - must come after specific routes)
    Route::get('/invitations/{token}', [UserInvitationController::class, 'show'])->name('invitations.show')->withoutMiddleware(['auth', 'verified']);
    Route::post('/invitations/{token}/accept', [UserInvitationController::class, 'accept'])->name('invitations.accept')->withoutMiddleware(['auth', 'verified']);

    // Permission Management (Admin only)
    Route::middleware('can:users.manage-permissions')->group(function () {
        Route::resource('permissions', PermissionController::class);
        Route::post('permissions/sync-matrix', [PermissionController::class, 'syncMatrix'])->name('permissions.sync-matrix');
        Route::post('permissions/check', [PermissionController::class, 'check'])->name('permissions.check');
        Route::post('permissions/check-bulk', [PermissionController::class, 'checkBulk'])->name('permissions.check-bulk');
    });

    // Role Management
    Route::resource('roles', RoleController::class);
    Route::get('roles/{role}/permissions', [RoleController::class, 'permissions'])->name('roles.permissions');
    Route::post('roles/{role}/assign-user', [RoleController::class, 'assignUser'])->name('roles.assign-user');
    Route::post('roles/{role}/remove-user/{user}', [RoleController::class, 'removeUser'])->name('roles.remove-user');
    Route::post('roles/{role}/duplicate', [RoleController::class, 'duplicate'])->name('roles.duplicate');

    // Audit Logs (Super Admin only)
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('/export', [AuditLogController::class, 'export'])->name('audit-logs.export');
        Route::get('/stats', [AuditLogController::class, 'stats'])->name('audit-logs.stats');
        Route::get('/{auditLog}', [AuditLogController::class, 'show'])->name('audit-logs.show');
        Route::post('/cleanup', [AuditLogController::class, 'cleanup'])->name('audit-logs.cleanup');
        Route::get('/event-breakdown', [AuditLogController::class, 'eventBreakdown'])->name('audit-logs.event-breakdown');
        Route::get('/timeline', [AuditLogController::class, 'timeline'])->name('audit-logs.timeline');
    });

    // Super Admin Management
    Route::prefix('super-admin')->group(function () {
        Route::post('/users/{user}/grant', [SuperAdminController::class, 'grant'])->name('super-admin.grant');
        Route::post('/users/{user}/revoke', [SuperAdminController::class, 'revoke'])->name('super-admin.revoke');
        Route::get('/grants', [SuperAdminController::class, 'grants'])->name('super-admin.grants');
        Route::get('/current', [SuperAdminController::class, 'current'])->name('super-admin.current');
    });
});

// Asset Hierarchy
require __DIR__.'/asset-hierarchy.php';

// Maintenance
require __DIR__.'/maintenance.php';

// Work Orders
require __DIR__.'/work-orders.php';

// Parts
require __DIR__.'/parts.php';

// Skills and Certifications
require __DIR__.'/skills-certifications.php';

// Settings
require __DIR__.'/settings.php';

// Scheduler
require __DIR__.'/scheduler.php';

// Users
require __DIR__.'/users.php';

// Production
require __DIR__.'/production.php';

// QR Scanning (public routes)
require __DIR__.'/qr.php';

require __DIR__.'/auth.php';
