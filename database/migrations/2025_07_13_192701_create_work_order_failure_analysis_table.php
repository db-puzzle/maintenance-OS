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
        Schema::create('work_order_failure_analysis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->unique()->constrained()->cascadeOnDelete();
            
            // Failure classification
            $table->foreignId('failure_mode_id')->nullable()->constrained();
            $table->string('failure_mode_other')->nullable();
            $table->foreignId('root_cause_id')->nullable()->constrained('root_causes');
            $table->string('root_cause_other')->nullable();
            $table->foreignId('immediate_cause_id')->nullable()->constrained('immediate_causes');
            $table->string('immediate_cause_other')->nullable();
            
            // Impact assessment
            $table->enum('failure_effect', ['none', 'minor', 'moderate', 'major', 'critical'])->default('moderate');
            $table->integer('downtime_minutes')->nullable();
            $table->integer('production_loss_units')->nullable();
            $table->boolean('safety_incident')->default(false);
            $table->boolean('environmental_incident')->default(false);
            
            // Analysis details
            $table->text('failure_description')->nullable();
            $table->text('corrective_actions')->nullable();
            $table->text('preventive_recommendations')->nullable();
            
            $table->foreignId('analyzed_by')->constrained('users');
            $table->timestamp('analyzed_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_failure_analysis');
    }
};
