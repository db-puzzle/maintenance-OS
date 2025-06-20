<?php

use App\Http\Controllers\Scheduler\RouteEditorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('scheduler')->group(function () {
    // Rota para o editor de rotas
    Route::get('route-editor', [RouteEditorController::class, 'index'])->name('scheduler.route-editor');
});
