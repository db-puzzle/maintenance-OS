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
            $table->integer('default_setup_time_seconds')->default(0);
            $table->decimal('default_cycle_time_seconds', 10, 3)->nullable();
            $table->string('default_unit_of_measure_code', 20)->default('PC');
            $table->foreign('default_unit_of_measure_code')->references('code')->on('units_of_measure');
            $table->integer('max_parallel_executions')->default(1);

            // Time display preferences
            $table->enum('time_display_preference', ['cycle_time', 'throughput'])->default('cycle_time');
            $table->enum('time_scale_preference', ['seconds', 'minutes', 'hours', 'auto'])->default('auto');

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
