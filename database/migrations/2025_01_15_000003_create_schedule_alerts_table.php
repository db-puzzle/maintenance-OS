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
        Schema::create('schedule_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_version_id')->constrained('schedule_versions')->cascadeOnDelete();
            $table->enum('alert_type', ['capacity_overrun', 'dependency_violation', 'late_delivery']);
            $table->enum('severity', ['warning', 'error'])->default('warning');
            $table->foreignId('manufacturing_order_id')->nullable()->constrained('manufacturing_orders');
            $table->foreignId('manufacturing_step_id')->nullable()->constrained('manufacturing_steps');
            $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
            $table->text('message');
            $table->boolean('resolved')->default(false);
            $table->timestamps();
            
            $table->index(['schedule_version_id', 'resolved']);
            $table->index('alert_type');
            $table->index('severity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_alerts');
    }
};