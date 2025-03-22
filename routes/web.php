<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\Cadastro\MachineTypeController;
use App\Http\Controllers\PlantsController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    Route::resource('cadastro/tipos-maquina', MachineTypeController::class)
        ->names('cadastro.tipos-maquina')
        ->parameters(['tipos-maquina' => 'machineType']);
    Route::delete('/equipment/{equipment}/photo', [EquipmentController::class, 'removePhoto'])->name('equipamentos.remove-photo');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/cadastro.php';
