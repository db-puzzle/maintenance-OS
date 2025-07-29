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
        Schema::create('bill_of_materials', function (Blueprint $table) {
            $table->id();
            $table->string('bom_number', 100)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('external_reference', 100)->nullable(); // Inventor drawing number
            
            // NEW: Reference to the item this BOM produces
            $table->foreignId('output_item_id')->constrained('items');
            
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('bom_number');
            $table->index('external_reference');
            $table->index('is_active');
            $table->index('output_item_id'); // NEW index
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bill_of_materials');
    }
};