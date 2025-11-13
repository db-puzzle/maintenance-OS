<?php

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Here is where you can register tenant-specific routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| contains the "tenant" middleware group. Now create something great!
|
*/

// Include all application routes that should be tenant-scoped
require __DIR__ . '/admin.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/users.php';
require __DIR__ . '/asset-hierarchy.php';
require __DIR__ . '/work-orders.php';
require __DIR__ . '/maintenance.php';
require __DIR__ . '/planning.php';
require __DIR__ . '/production.php';
require __DIR__ . '/logistics.php';
require __DIR__ . '/scheduler.php';
require __DIR__ . '/skills-certifications.php';
require __DIR__ . '/settings.php';
require __DIR__ . '/media.php';
require __DIR__ . '/qr.php';
