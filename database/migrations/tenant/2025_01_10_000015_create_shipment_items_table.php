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

            // Shipment reference
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();

            // Manufacturing order reference
            $table->foreignId('manufacturing_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();

            // Step reference (for external processing shipments)
            $table->foreignId('manufacturing_step_id')->nullable()->constrained('manufacturing_steps')->nullOnDelete()->comment('Which step needs external processing');

            // Quantities
            $table->decimal('quantity_shipped', 10, 2);
            $table->decimal('quantity_received', 10, 2)->default(0);
            $table->decimal('quantity_rejected', 10, 2)->default(0)->comment('Failed QC on receipt');

            // Item details (denormalized for history)
            $table->string('item_code', 100)->nullable();
            $table->string('item_name')->nullable();
            $table->text('item_description')->nullable();

            // Packaging
            $table->integer('package_count')->nullable()->comment('Number of boxes/pallets');
            $table->enum('package_type', ['box', 'pallet', 'crate', 'bag', 'other'])->nullable();

            // Notes
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable()->comment('Why items were rejected on receipt');

            // Metadata
            $table->timestamps();

            // Indexes
            $table->index('shipment_id');
            $table->index('manufacturing_order_id');
            $table->index('manufacturing_step_id');
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
