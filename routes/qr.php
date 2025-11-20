<?php

use App\Http\Controllers\Production\QrCodeController;
use Illuminate\Support\Facades\Route;

// QR Code Scanning Routes
// Note: Authentication is handled in the controller to allow proper redirect with intended URL
Route::prefix('qr')->group(function () {
    Route::get('/items/{item_number}', [QrCodeController::class, 'handleItemScan'])
        ->name('qr.item');
    Route::get('/orders/{mo_number}', [QrCodeController::class, 'handleOrderScan'])
        ->name('qr.order');
    // Future: Route for shipments
    // Route::get('/shipments/{shipment_number}', [QrCodeController::class, 'handleShipmentScan'])
    //     ->name('qr.shipment');
});
