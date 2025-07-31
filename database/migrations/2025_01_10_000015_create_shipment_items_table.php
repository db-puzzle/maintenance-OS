<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shipment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->foreignId('bom_item_id')->nullable()->constrained('bom_items');
            $table->foreignId('manufacturing_order_id')->nullable()->constrained('manufacturing_orders');
            
            // Item details
            $table->string('item_number', 100);
            $table->text('description')->nullable();
            $table->decimal('quantity', 10, 2);
            $table->string('unit_of_measure', 20)->default('EA');
            
            // Packaging
            $table->string('package_number', 50)->nullable();
            $table->string('package_type', 50)->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->json('dimensions')->nullable();
            
            // QR tracking
            $table->json('qr_codes')->nullable(); // Array of QR codes included
            
            $table->timestamps();
            
            $table->index('shipment_id');
            $table->index('package_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_items');
    }
};