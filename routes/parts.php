<?php

use App\Http\Controllers\Parts\PartsController;
use App\Http\Controllers\Parts\PartsImportExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    // Import/Export routes (must come before dynamic routes)
    Route::prefix('parts')->group(function () {
        Route::get('/import', [PartsImportExportController::class, 'import'])->name('parts.import');
        Route::post('/import/analyze', [PartsImportExportController::class, 'analyzeCsv'])->name('parts.import.analyze');
        Route::post('/import/data', [PartsImportExportController::class, 'importData'])->name('parts.import.data');
        
        Route::get('/export', [PartsImportExportController::class, 'export'])->name('parts.export');
        Route::post('/export/data', [PartsImportExportController::class, 'exportData'])->name('parts.export.data');
    });
    
    // Parts Management (dynamic routes come after static ones)
    Route::get('parts', [PartsController::class, 'index'])->name('parts.index');
    Route::post('parts', [PartsController::class, 'store'])->name('parts.store');
    Route::get('parts/{part}', [PartsController::class, 'show'])->name('parts.show');
    Route::put('parts/{part}', [PartsController::class, 'update'])->name('parts.update');
    Route::delete('parts/{part}', [PartsController::class, 'destroy'])->name('parts.destroy');
    Route::get('parts/{part}/check-dependencies', [PartsController::class, 'checkDependencies'])->name('parts.check-dependencies');
    Route::post('parts/{part}/substitute-and-delete', [PartsController::class, 'substituteAndDelete'])->name('parts.substitute-and-delete');
});