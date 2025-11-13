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

            // Shipment identification
            $table->string('shipment_number', 50)->unique()->comment('Auto-generated: SHIP-YYYYMMDD-XXXX');

            // Destination
            $table->enum('destination_type', ['manufacturer', 'customer', 'warehouse', 'work_cell']);
            $table->unsignedBigInteger('destination_id')->nullable()->comment('ID of manufacturer/customer/warehouse/work_cell');

            // Destination details (denormalized for history)
            $table->string('destination_name')->nullable();
            $table->text('destination_address')->nullable();

            // Shipping details
            $table->enum('shipping_method', ['courier', 'freight', 'pickup', 'internal', 'other'])->default('courier');
            $table->string('carrier_name')->nullable()->comment('UPS, FedEx, etc.');
            $table->string('tracking_number')->nullable();

            // Dates
            $table->date('planned_ship_date')->nullable();
            $table->date('actual_ship_date')->nullable();
            $table->date('expected_delivery_date')->nullable();
            $table->date('actual_delivery_date')->nullable();

            // Status
            $table->enum('status', ['planned', 'packed', 'shipped', 'in_transit', 'delivered', 'received'])->default('planned');

            // Documentation
            $table->boolean('packing_list_generated')->default(false);
            $table->string('packing_list_path', 500)->nullable()->comment('Path to PDF file');

            // Notes
            $table->text('shipping_notes')->nullable();
            $table->text('receiving_notes')->nullable();

            // User tracking
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('shipped_by')->nullable()->constrained('users')->nullOnDelete()->comment('User who marked as shipped');
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete()->comment('User who received the shipment');

            // Metadata
            $table->timestamps();

            // Indexes
            $table->index('shipment_number');
            $table->index('status');
            $table->index(['destination_type', 'destination_id']);
            $table->index(['planned_ship_date', 'actual_ship_date']);
            $table->index('tracking_number');
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
