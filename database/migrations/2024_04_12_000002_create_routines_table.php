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
        Schema::create('routines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            
            // Trigger configuration
            $table->enum('trigger_type', ['runtime_hours', 'calendar_days'])->default('runtime_hours');
            $table->integer('trigger_runtime_hours')->nullable()->comment('Hours between executions (runtime-based)');
            $table->integer('trigger_calendar_days')->nullable()->comment('Days between executions (calendar-based)');
            
            // Execution configuration
            $table->enum('execution_mode', ['automatic', 'manual'])->default('automatic');
            $table->text('description')->nullable();
            $table->foreignId('form_id')->constrained();
            $table->foreignId('active_form_version_id')->nullable()->constrained('form_versions')->nullOnDelete();
            
            // Work order generation settings
            $table->integer('advance_generation_days')->default(24)->comment('Generate WO this many hours in advance');
            $table->boolean('auto_approve_work_orders')->default(false)->comment('Requires work-orders.approve permission');
            $table->integer('priority_score')->default(50)->comment('Priority score 0-100');
            
            // Execution tracking
            $table->decimal('last_execution_runtime_hours', 10, 2)->nullable();
            $table->timestamp('last_execution_completed_at')->nullable();
            $table->foreignId('last_execution_form_version_id')->nullable()->constrained('form_versions')->nullOnDelete();
            
            // Status
            $table->boolean('is_active')->default(true);
            
            // User tracking
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();

            // Indexes
            $table->index(['execution_mode', 'trigger_type']);
            $table->index(['trigger_type', 'is_active']);
            $table->index('last_execution_completed_at');
            $table->index('form_id');
            $table->index('active_form_version_id');
            $table->index('asset_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routines');
    }
};
