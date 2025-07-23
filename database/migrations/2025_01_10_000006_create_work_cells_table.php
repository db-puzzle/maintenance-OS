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
        Schema::create('work_cells', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('cell_type', ['internal', 'external'])->default('internal');
            
            // Capacity
            $table->decimal('available_hours_per_day', 4, 2)->default(8);
            $table->decimal('efficiency_percentage', 5, 2)->default(85);
            
            // Location
            $table->foreignId('plant_id')->nullable()->constrained('plants');
            $table->foreignId('area_id')->nullable()->constrained('areas');
            
            // External vendor info (if cell_type = 'external')
            $table->string('vendor_name', 255)->nullable();
            $table->json('vendor_contact')->nullable();
            $table->integer('lead_time_days')->default(0);
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['cell_type', 'is_active']);
            $table->index(['plant_id', 'area_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_cells');
    }
};