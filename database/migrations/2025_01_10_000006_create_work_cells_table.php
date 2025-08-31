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
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('cell_type', ['internal', 'external'])->default('internal');

            // Capacity
            $table->boolean('has_finite_capacity')->default(true);
            $table->decimal('default_production_rate_per_hour', 10, 3)->nullable();
            $table->string('default_unit_of_measure', 50)->default('PC');
            $table->integer('default_setup_time_minutes')->default(0);
            $table->integer('max_parallel_executions')->default(1);

            // Shift relationship (required for internal cells)
            $table->foreignId('shift_id')->nullable()->constrained('shifts');

            // Location (optional)
            $table->foreignId('plant_id')->nullable()->constrained('plants');
            $table->foreignId('area_id')->nullable()->constrained('areas');
            $table->foreignId('sector_id')->nullable()->constrained('sectors');

            // External vendor info (if cell_type = 'external')
            $table->foreignId('manufacturer_id')->nullable()->constrained('manufacturers');

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['cell_type', 'is_active']);
            $table->index(['plant_id', 'area_id', 'sector_id']);
            $table->index('shift_id');
            $table->index('manufacturer_id');
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
