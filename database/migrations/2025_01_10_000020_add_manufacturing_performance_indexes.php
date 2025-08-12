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
        // Add indexes for manufacturing steps performance
        Schema::table('manufacturing_steps', function (Blueprint $table) {
            // Composite index for work cell and status queries
            $table->index(['work_cell_id', 'status'], 'idx_manufacturing_steps_work_cell_status');
            
            // Index for status alone (for facility-wide queries)
            $table->index('status', 'idx_manufacturing_steps_status');
            
            // Index for step number ordering
            $table->index('step_number', 'idx_manufacturing_steps_step_number');
            
            // Index for actual times (for historical queries)
            $table->index('actual_start_time', 'idx_manufacturing_steps_actual_start_time');
            $table->index('actual_end_time', 'idx_manufacturing_steps_actual_end_time');
        });
        
        // Add indexes for manufacturing orders performance
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            // Composite index for status and actual start date
            $table->index(['status', 'actual_start_date'], 'idx_manufacturing_orders_status_start_date');
            
            // Index for requested date (for urgency calculations)
            $table->index('requested_date', 'idx_manufacturing_orders_requested_date');
            
            // Index for parent relationship queries
            $table->index('parent_id', 'idx_manufacturing_orders_parent_id');
        });
        
        // Add indexes for manufacturing step executions
        if (Schema::hasTable('manufacturing_step_executions')) {
            Schema::table('manufacturing_step_executions', function (Blueprint $table) {
                // Index for work cell analytics queries
                $table->index('completed_at', 'idx_step_executions_completed_at');
                
                // Composite index for step and status
                $table->index(['manufacturing_step_id', 'status'], 'idx_step_executions_step_status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manufacturing_steps', function (Blueprint $table) {
            $table->dropIndex('idx_manufacturing_steps_work_cell_status');
            $table->dropIndex('idx_manufacturing_steps_status');
            $table->dropIndex('idx_manufacturing_steps_step_number');
            $table->dropIndex('idx_manufacturing_steps_actual_start_time');
            $table->dropIndex('idx_manufacturing_steps_actual_end_time');
        });
        
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            $table->dropIndex('idx_manufacturing_orders_status_start_date');
            $table->dropIndex('idx_manufacturing_orders_requested_date');
            $table->dropIndex('idx_manufacturing_orders_parent_id');
        });
        
        if (Schema::hasTable('manufacturing_step_executions')) {
            Schema::table('manufacturing_step_executions', function (Blueprint $table) {
                $table->dropIndex('idx_step_executions_completed_at');
                $table->dropIndex('idx_step_executions_step_status');
            });
        }
    }
};
