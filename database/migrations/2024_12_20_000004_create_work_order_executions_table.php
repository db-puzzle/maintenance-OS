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
        Schema::create('work_order_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('executed_by')->constrained('users');
            $table->enum('status', ['assigned', 'in_progress', 'paused', 'completed'])->default('assigned');
            
            // Time tracking
            $table->timestamp('started_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('resumed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('total_pause_duration')->default(0)->comment('Total pause time in minutes');
            
            // Work details
            $table->text('work_performed')->nullable();
            $table->text('observations')->nullable();
            $table->text('recommendations')->nullable();
            $table->boolean('follow_up_required')->default(false);
            
            // Completion checklist
            $table->boolean('safety_checks_completed')->default(false);
            $table->boolean('quality_checks_completed')->default(false);
            $table->boolean('area_cleaned')->default(false);
            $table->boolean('tools_returned')->default(false);
            
            $table->timestamps();
            
            $table->index(['executed_by', 'status']);
            $table->index('started_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_executions');
    }
};