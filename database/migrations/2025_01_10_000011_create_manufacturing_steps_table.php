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
        Schema::create('manufacturing_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturing_route_id')->constrained('manufacturing_routes')->cascadeOnDelete();
            $table->integer('display_order')->default(0);
            $table->enum('step_type', ['standard', 'quality_check', 'rework'])->default('standard');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
            
            // State management
            // States: pending -> queued -> in_progress -> (awaiting_quality) -> completed
            // Alternative paths: skipped (bypassed), cancelled (parent order cancelled), on_hold (temporarily paused)
            $table->enum('status', ['pending', 'queued', 'in_progress', 'on_hold', 'awaiting_quality', 'completed', 'skipped', 'cancelled'])->default('pending');
            
            // Form association
            $table->foreignId('form_id')->nullable()->constrained('forms');
            $table->foreignId('form_version_id')->nullable()->constrained('form_versions');
            
            // Time tracking
            $table->integer('setup_time_minutes')->default(0);
            $table->integer('cycle_time_minutes');
            $table->timestamp('actual_start_time')->nullable();
            $table->timestamp('actual_end_time')->nullable();
            
            // Quality check specific fields
            $table->enum('quality_result', ['pending', 'passed', 'failed'])->nullable();
            $table->enum('failure_action', ['scrap', 'rework'])->nullable();
            $table->enum('quality_check_mode', ['every_part', 'entire_lot', 'sampling'])->default('every_part');
            $table->integer('sampling_size')->nullable();
            
            // Dependencies
            $table->foreignId('depends_on_step_id')->nullable()->constrained('manufacturing_steps');
            $table->enum('can_start_when_dependency', ['completed', 'in_progress'])->default('completed');
            
            // Progressive flow fields
            $table->enum('dependency_start_condition', ['completed', 'quantity_based', 'percentage_based', 'immediate'])->default('completed');
            $table->integer('dependency_minimum_quantity')->nullable();
            $table->decimal('dependency_minimum_percentage', 5, 2)->nullable();
            $table->integer('cumulative_quantity_completed')->default(0);
            $table->integer('cumulative_quantity_scrapped')->default(0);
            
            $table->timestamps();
            
            $table->index(['manufacturing_route_id', 'display_order']);
            $table->index('status');
            $table->index('step_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturing_steps');
    }
};