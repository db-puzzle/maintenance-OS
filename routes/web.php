<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// Get central domains from config
$appDomain = config('app.domain', 'localhost');

// Main central domain routes (marketing, registration, etc.)
// NOTE: These routes are only on the main domain, not admin subdomain
Route::domain($appDomain)->group(function () {
    Route::get('/', function () {
        return \Inertia\Inertia::render('welcome');
    })->name('welcome');

    // Registration for new tenants
    Route::get('/register', [\App\Http\Controllers\Auth\TenantRegistrationController::class, 'create'])
        ->name('register');
    Route::post('/register', [\App\Http\Controllers\Auth\TenantRegistrationController::class, 'store']);

    // Subdomain availability check
    Route::post('/check-subdomain', [\App\Http\Controllers\Auth\SubdomainCheckController::class, 'check'])
        ->middleware(['throttle:subdomain-check'])
        ->name('subdomain.check');
});

// Admin portal routes on admin subdomain
Route::domain('admin.' . $appDomain)->middleware(['web'])->group(function () {
    require __DIR__ . '/central.php';
});

// Tenant routes - all existing application routes
// Apply both 'tenant' (for tenancy initialization) and 'web' (for sessions, CSRF, etc.)
// Order matters: tenant MUST come before web so tenancy is initialized before sessions load
Route::middleware(['tenant', 'web'])->group(function () {
    // Dashboard/Home route
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/', function () {
            return \Inertia\Inertia::render('home');
        })->name('home');

        Route::get('/home', function () {
            return redirect('/');
        });
    });

    // Include all tenant-specific routes
    require __DIR__ . '/tenant.php';
});
