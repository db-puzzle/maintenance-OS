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
            $table->foreignId('form_execution_id')->constrained()->onDelete('cascade');
            $table->foreignId('form_task_id')->constrained()->onDelete('cascade');
            $table->json('response')->nullable()->comment('User response data');
            $table->boolean('is_completed')->default(false);
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index('form_execution_id');
            $table->index('form_task_id');
            $table->index('is_completed');
            $table->unique(['form_execution_id', 'form_task_id']);
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
