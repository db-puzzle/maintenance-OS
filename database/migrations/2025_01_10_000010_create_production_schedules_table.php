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
            $table->foreignId('production_order_id')->constrained('production_orders')->cascadeOnDelete();
            $table->foreignId('routing_step_id')->nullable()->constrained('routing_steps');
            $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
            
            // Scheduling
            $table->timestamp('scheduled_start');
            $table->timestamp('scheduled_end');
            $table->integer('buffer_time_minutes')->default(0);
            
            // Assignment
            $table->foreignId('assigned_team_id')->nullable()->constrained('teams');
            $table->json('assigned_operators')->nullable(); // Array of user IDs
            
            // Status
            $table->enum('status', ['scheduled', 'ready', 'in_progress', 'completed', 'delayed'])->default('scheduled');
            
            $table->timestamps();
            
            $table->index(['scheduled_start', 'scheduled_end']);
            $table->index(['work_cell_id', 'scheduled_start']);
            $table->index('status');
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