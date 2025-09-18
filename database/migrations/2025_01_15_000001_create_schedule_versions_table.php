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
        Schema::create('schedule_versions', function (Blueprint $table) {
            $table->id();
            $table->integer('version_number');
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->foreignId('published_by')->nullable()->constrained('users');
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            
            // Algorithm execution fields
            $table->string('last_algorithm_used')->nullable();
            $table->timestamp('last_scheduled_at')->nullable();
            $table->json('algorithm_metrics')->nullable();
            $table->float('algorithm_execution_time')->nullable()->comment('Execution time in seconds');
            $table->string('scheduling_job_id')->nullable();
            $table->enum('scheduling_status', ['idle', 'queued', 'running', 'completed', 'failed'])->default('idle');
            $table->text('scheduling_error')->nullable();
            
            $table->timestamps();

            $table->index(['status', 'version_number']);
            $table->index('published_at');
            $table->index('scheduling_status');
            $table->index('last_scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_versions');
    }
};
