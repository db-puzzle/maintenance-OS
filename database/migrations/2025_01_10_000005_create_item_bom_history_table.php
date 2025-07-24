<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('item_bom_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('bill_of_material_id')->constrained('bill_of_materials');
            
            // Effectivity dates
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            
            // Change tracking
            $table->text('change_reason')->nullable();
            $table->string('change_order_number', 100)->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['item_id', 'effective_from']);
            $table->index('bill_of_material_id');
        });
        
        // Add exclusion constraint for PostgreSQL to prevent overlapping date ranges
        DB::statement('ALTER TABLE item_bom_history ADD CONSTRAINT no_overlapping_dates EXCLUDE USING gist (item_id WITH =, daterange(effective_from, effective_to, \'[)\') WITH &&)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_bom_history');
    }
};