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
        Schema::create('production_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturing_step_id')->constrained('manufacturing_steps')->cascadeOnDelete();
            $table->timestamp('scheduled_start');
            $table->timestamp('scheduled_end');
            $table->foreignId('work_cell_id')->constrained('work_cells');
            $table->boolean('is_locked')->default(false);
            $table->foreignId('locked_by')->nullable()->constrained('users');
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('schedule_version_id')->constrained('schedule_versions')->cascadeOnDelete();
            $table->timestamps();
            
            $table->index(['scheduled_start', 'scheduled_end']);
            $table->index(['work_cell_id', 'scheduled_start', 'scheduled_end']);
            $table->index('is_locked');
            $table->index('schedule_version_id');
            $table->unique(['manufacturing_step_id', 'schedule_version_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_schedules');
    }
};