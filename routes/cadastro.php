<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('cadastro/maquinas', function () {
        return Inertia::render('cadastro/maquinas');
    })->name('cadastro.maquinas');

    Route::get('cadastro/tipos-maquina', function () {
        return Inertia::render('cadastro/tipos-maquina');
    })->name('cadastro.tipos-maquina');

    Route::get('cadastro/areas', function () {
        return Inertia::render('cadastro/areas');
    })->name('cadastro.areas');
}); 