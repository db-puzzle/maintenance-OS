<?php

use App\Http\Controllers\Logistics\ShipmentController;
use Illuminate\Support\Facades\Route;

/*
 * Logistics Module Routes
 *
 * Handles shipments for external manufacturing, customer deliveries,
 * and internal transfers.
 */
Route::middleware(['auth', 'verified'])->prefix('logistics')->name('logistics.')->group(function () {
    // Shipments
    Route::resource('shipments', ShipmentController::class);

    // Shipment Actions
    Route::post('shipments/{shipment}/mark-as-shipped', [ShipmentController::class, 'markAsShipped'])
        ->name('shipments.mark-as-shipped');

    Route::post('shipments/{shipment}/mark-as-received', [ShipmentController::class, 'markAsReceived'])
        ->name('shipments.mark-as-received');

    Route::get('shipments/{shipment}/packing-list', [ShipmentController::class, 'generatePackingList'])
        ->name('shipments.packing-list');

    // QR Code Scanning
    Route::get('shipments/find-mo/{mo_number}', [ShipmentController::class, 'findMoFromQr'])
        ->name('shipments.find-mo');
});
