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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('product_number', 100)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            $table->enum('product_type', ['manufactured', 'purchased', 'phantom'])->default('manufactured');
            $table->enum('status', ['prototype', 'active', 'phasing_out', 'discontinued'])->default('active');
            
            // Current BOM reference (will be set after bill_of_materials table is created)
            $table->unsignedBigInteger('current_bom_id')->nullable();
            
            // Product attributes
            $table->string('unit_of_measure', 20)->default('EA');
            $table->decimal('weight', 10, 4)->nullable();
            $table->json('dimensions')->nullable(); // {length, width, height, unit}
            
            // Business attributes
            $table->decimal('list_price', 10, 2)->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->integer('lead_time_days')->default(0);
            
            // Metadata
            $table->json('tags')->nullable();
            $table->json('custom_attributes')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('product_number');
            $table->index('status');
            $table->index('category');
            $table->index('current_bom_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};