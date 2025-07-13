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
        Schema::create('task_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_order_execution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->text('response')->nullable();
            $table->json('response_data')->nullable()->comment('Structured data for specific response types');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['work_order_execution_id', 'form_task_id']);
            $table->index('user_id');
            $table->index('completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_responses');
    }
};
