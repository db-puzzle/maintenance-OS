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
        // This allows tracking which BOMs can produce an item
        Schema::create('item_bom', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('bill_of_material_id')->constrained('bill_of_materials')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false); // Primary BOM for the item
            $table->timestamps();
            
            $table->unique(['item_id', 'bill_of_material_id']);
            $table->index('item_id');
            $table->index('bill_of_material_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_bom');
    }
}; 