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
        Schema::create('work_cell_capacity_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_cell_id')->constrained('work_cells')->cascadeOnDelete();
            $table->foreignId('manufacturing_step_id')->constrained('manufacturing_steps')->cascadeOnDelete();
            $table->date('scheduled_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('time_minutes');
            $table->integer('parallel_slot')->default(1);
            $table->decimal('quantity', 10, 3)->nullable();
            $table->string('unit_of_measure', 50)->nullable();
            $table->enum('status', ['reserved', 'confirmed', 'in_progress', 'completed', 'cancelled'])->default('reserved');
            $table->timestamps();
            
            $table->index(['scheduled_date', 'work_cell_id', 'start_time']);
            $table->index(['work_cell_id', 'scheduled_date']);
            $table->index('manufacturing_step_id');
            $table->index('status');
            $table->index(['work_cell_id', 'scheduled_date', 'start_time', 'parallel_slot'], 'idx_parallel_slots');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_cell_capacity_bookings');
    }
};
