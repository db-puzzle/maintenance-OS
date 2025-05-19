<?php

use App\Http\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/items/bom-config', [ItemController::class, 'bomConfig'])->name('items.bom-config');
});
