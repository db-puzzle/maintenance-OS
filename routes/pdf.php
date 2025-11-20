<?php

use App\Http\Controllers\Production\ManufacturingOrderLabelController;
use Illuminate\Support\Facades\Route;

// PDF routes that return raw PDF responses (not Inertia pages)
// Security: These routes use the FULL 'web' middleware stack including:
//   - Tenant isolation (tenant context required)
//   - CSRF protection
//   - Authentication & authorization
//   - Session management
// The HandleInertiaRequests middleware skips response wrapping for pdf/* routes
// but all other security middleware runs normally
Route::middleware(['auth', 'verified'])->prefix('pdf')->group(function () {
    // Test route to verify PDF routes are working
    Route::get('/test', function () {
        \Log::info('PDF test route accessed');

        return response('PDF routes are working', 200)
            ->header('Content-Type', 'text/plain');
    });

    Route::get('/manufacturing-orders/{order}/label', [ManufacturingOrderLabelController::class, 'generate'])
        ->name('pdf.manufacturing-orders.label');
});
