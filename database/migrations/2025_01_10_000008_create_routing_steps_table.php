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
        Schema::create('routing_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_routing_id')->constrained('production_routings')->cascadeOnDelete();
            $table->integer('step_number');
            $table->string('operation_code', 50);
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
            
            // Time estimates
            $table->integer('setup_time_minutes')->default(0);
            $table->integer('cycle_time_minutes');
            $table->integer('tear_down_time_minutes')->default(0);
            
            // Resources
            $table->integer('labor_requirement')->default(1); // Number of operators
            $table->json('skill_requirements')->nullable(); // Array of skill IDs
            $table->json('tool_requirements')->nullable();
            
            // Instructions
            $table->text('work_instructions')->nullable();
            $table->text('safety_notes')->nullable();
            $table->json('quality_checkpoints')->nullable();
            $table->json('attachments')->nullable(); // Array of file paths
            
            $table->timestamps();
            
            $table->unique(['production_routing_id', 'step_number']);
            $table->index(['production_routing_id', 'step_number']);
            $table->index('work_cell_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routing_steps');
    }
};