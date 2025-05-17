<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Scheduler\RouteEditorController;

Route::middleware(['auth', 'verified'])->prefix('scheduler')->group(function () {
    // Rota para o editor de rotas
    Route::get('route-editor', [RouteEditorController::class, 'index'])->name('scheduler.route-editor');
});
