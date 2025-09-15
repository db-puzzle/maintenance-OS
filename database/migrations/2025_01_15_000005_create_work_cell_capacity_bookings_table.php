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
            $table->foreignId('production_schedule_id')->nullable()->constrained('production_schedules')->cascadeOnDelete();
            $table->timestamp('start_time');
            $table->timestamp('end_time');
            $table->enum('booking_type', ['scheduled', 'maintenance', 'unavailable'])->default('scheduled');
            $table->string('reason')->nullable();
            $table->timestamps();
            
            $table->index(['work_cell_id', 'start_time', 'end_time']);
            $table->index('booking_type');
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