<?php

use App\Http\Controllers\Api\AdvancedChunkedUploadController;
use App\Http\Controllers\Api\ChunkedUploadController;
use App\Http\Controllers\Api\MediaUploadController;
use App\Http\Controllers\Api\PublicMediaController;
use App\Http\Controllers\Api\SecureMediaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Media Routes
|--------------------------------------------------------------------------
|
| Here is where you can register media related routes for your application.
|
*/

// API Routes
Route::prefix('api')->middleware('auth:sanctum')->group(function () {
    // Media upload
    Route::post('media/upload', [MediaUploadController::class, 'store'])->name('api.media.upload');
    
    // Chunked upload
    Route::prefix('media/upload')->group(function () {
        Route::post('initialize', [AdvancedChunkedUploadController::class, 'initializeUpload'])->name('api.media.upload.initialize');
        Route::post('chunk', [AdvancedChunkedUploadController::class, 'uploadChunk'])->name('api.media.upload.chunk');
        Route::get('status/{uploadId}', [AdvancedChunkedUploadController::class, 'getUploadStatus'])->name('api.media.upload.status');
        Route::post('resume/{uploadId}', [AdvancedChunkedUploadController::class, 'resumeUpload'])->name('api.media.upload.resume');
        Route::delete('cancel/{uploadId}', [AdvancedChunkedUploadController::class, 'cancelUpload'])->name('api.media.upload.cancel');
    });
    
    // Secure media access
    Route::prefix('media/secure')->group(function () {
        Route::get('{media}', [SecureMediaController::class, 'show'])->name('api.media.secure.show');
        Route::get('{media}/download', [SecureMediaController::class, 'download'])->name('api.media.secure.download');
        Route::get('{media}/stream', [SecureMediaController::class, 'stream'])->name('api.media.secure.stream');
        Route::delete('{media}', [SecureMediaController::class, 'destroy'])->name('api.media.secure.destroy');
    });
});

// Public media routes (no auth required)
Route::prefix('media')->group(function () {
    Route::get('{media}', [PublicMediaController::class, 'show'])->name('media.public.show');
    Route::get('{media}/conversions/{conversion}', [PublicMediaController::class, 'conversion'])->name('media.public.conversion');
});
