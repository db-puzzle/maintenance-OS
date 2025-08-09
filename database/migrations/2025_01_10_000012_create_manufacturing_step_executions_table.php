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
        Schema::create('manufacturing_step_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturing_step_id')->constrained('manufacturing_steps');
            $table->foreignId('manufacturing_order_id')->constrained('manufacturing_orders');
            
            // Part tracking for lot production
            $table->integer('part_number')->nullable(); // Which part in the lot (1, 2, 3...)
            $table->integer('total_parts')->nullable(); // Total parts in the lot
            
            // State and timing
            $table->enum('status', ['queued', 'in_progress', 'on_hold', 'completed']);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('on_hold_at')->nullable();
            $table->timestamp('resumed_at')->nullable();
            $table->integer('total_hold_duration')->default(0); // minutes
            // Hold details
            $table->string('hold_reason', 100)->nullable();
            $table->text('hold_notes')->nullable();
            
            // Execution details
            $table->foreignId('executed_by')->nullable()->constrained('users');
            $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
            
            // Quality check results
            $table->enum('quality_result', ['passed', 'failed'])->nullable();
            $table->text('quality_notes')->nullable();
            $table->enum('failure_action', ['scrap', 'rework'])->nullable();
            
            // Form execution reference
            $table->foreignId('form_execution_id')->nullable();
            
            $table->timestamps();
            
            $table->index(['manufacturing_step_id', 'manufacturing_order_id']);
            $table->index('status');
            $table->index(['manufacturing_order_id', 'part_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturing_step_executions');
    }
};