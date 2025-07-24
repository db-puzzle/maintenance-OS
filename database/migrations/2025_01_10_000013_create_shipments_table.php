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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('shipment_number', 100)->unique();
            $table->enum('shipment_type', ['customer', 'internal_transfer', 'vendor_return'])->default('customer');
            
            // Destination
            $table->string('destination_type', 50)->nullable(); // 'customer', 'warehouse', 'vendor'
            $table->string('destination_reference', 100)->nullable();
            $table->json('destination_details')->nullable(); // Address, contact info
            
            // Status
            $table->enum('status', ['draft', 'ready', 'in_transit', 'delivered', 'cancelled'])->default('draft');
            
            // Dates
            $table->date('scheduled_ship_date')->nullable();
            $table->timestamp('actual_ship_date')->nullable();
            $table->date('estimated_delivery_date')->nullable();
            $table->timestamp('actual_delivery_date')->nullable();
            
            // Documentation
            $table->timestamp('manifest_generated_at')->nullable();
            $table->string('manifest_path', 500)->nullable();
            
            // Logistics
            $table->string('carrier', 100)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->decimal('freight_cost', 10, 2)->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('status');
            $table->index(['scheduled_ship_date', 'actual_ship_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};