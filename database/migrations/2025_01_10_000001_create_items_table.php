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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('item_number', 100)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            
            // Item classification
            $table->enum('item_type', ['manufactured', 'purchased', 'phantom', 'service'])->default('manufactured');
            $table->boolean('can_be_sold')->default(true);
            $table->boolean('can_be_purchased')->default(false);
            $table->boolean('can_be_manufactured')->default(true);
            $table->boolean('is_active')->default(true);
            
            // Status for sellable items
            $table->enum('status', ['prototype', 'active', 'phasing_out', 'discontinued'])->default('active');
            
            // Current BOM reference (for manufactured items)
            $table->unsignedBigInteger('current_bom_id')->nullable();
            
            // Physical attributes
            $table->string('unit_of_measure', 20)->default('EA');
            $table->decimal('weight', 10, 4)->nullable();
            $table->json('dimensions')->nullable(); // {length, width, height, unit}
            
            // Business attributes (when sold)
            $table->decimal('list_price', 10, 2)->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->integer('lead_time_days')->default(0);
            
            // Inventory tracking
            $table->boolean('track_inventory')->default(true);
            $table->decimal('min_stock_level', 10, 2)->nullable();
            $table->decimal('max_stock_level', 10, 2)->nullable();
            $table->decimal('reorder_point', 10, 2)->nullable();
            
            // For purchased items
            $table->string('preferred_vendor', 255)->nullable();
            $table->string('vendor_item_number', 100)->nullable();
            
            // Metadata
            $table->json('tags')->nullable();
            $table->json('custom_attributes')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            // Indexes
            $table->index('item_number');
            $table->index('status');
            $table->index('category');
            $table->index('current_bom_id');
            $table->index(['can_be_sold', 'is_active']);
            $table->index(['can_be_manufactured', 'is_active']);
            $table->index(['can_be_purchased', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};