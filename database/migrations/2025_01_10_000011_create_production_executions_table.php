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
        Schema::create('production_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_schedule_id')->nullable()->constrained('production_schedules');
            $table->foreignId('routing_step_id')->nullable()->constrained('routing_steps');
            
            // QR code tracking
            $table->string('item_qr_code', 100);
            $table->foreignId('scanned_by')->nullable()->constrained('users');
            
            // Timing
            $table->timestamp('started_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('resumed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('total_pause_duration')->default(0); // minutes
            
            // Quantities
            $table->decimal('quantity_started', 10, 2)->nullable();
            $table->decimal('quantity_completed', 10, 2)->nullable();
            $table->decimal('quantity_scrapped', 10, 2)->default(0);
            
            // Quality
            $table->json('quality_checks')->nullable();
            $table->json('defects_reported')->nullable();
            
            // Notes
            $table->text('operator_notes')->nullable();
            
            $table->timestamps();
            
            $table->index(['item_qr_code', 'routing_step_id']);
            $table->index('production_schedule_id');
            $table->index(['started_at', 'completed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_executions');
    }
};