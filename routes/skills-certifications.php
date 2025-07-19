<?php

use App\Http\Controllers\SkillController;
use App\Http\Controllers\CertificationController;
use Illuminate\Support\Facades\Route;

// Skills routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('skills')->name('skills.')->group(function () {
        Route::get('/', [SkillController::class, 'index'])->name('index');
        Route::post('/', [SkillController::class, 'store'])->name('store');
        Route::get('/{skill}', [SkillController::class, 'show'])->name('show');
        Route::put('/{skill}', [SkillController::class, 'update'])->name('update');
        Route::get('/{skill}/check-dependencies', [SkillController::class, 'checkDependencies'])->name('check-dependencies');
        Route::delete('/{skill}', [SkillController::class, 'destroy'])->name('destroy');
    });

    // Certifications routes
    Route::prefix('certifications')->name('certifications.')->group(function () {
        Route::get('/', [CertificationController::class, 'index'])->name('index');
        Route::post('/', [CertificationController::class, 'store'])->name('store');
        Route::get('/{certification}', [CertificationController::class, 'show'])->name('show');
        Route::put('/{certification}', [CertificationController::class, 'update'])->name('update');
        Route::get('/{certification}/check-dependencies', [CertificationController::class, 'checkDependencies'])->name('check-dependencies');
        Route::delete('/{certification}', [CertificationController::class, 'destroy'])->name('destroy');
    });
});