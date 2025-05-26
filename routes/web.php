<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\PlantsController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('home', function () {
        return Inertia::render('home');
    })->name('home');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/asset-hierarchy.php';
require __DIR__.'/maintenance.php';
require __DIR__.'/scheduler.php';
require __DIR__.'/item.php';