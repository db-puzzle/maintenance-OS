<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_execution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->timestamp('executed_at')->nullable();
            $table->text('text_response')->nullable();
            $table->string('selected_option')->nullable();
            $table->json('measurement_values')->nullable();
            $table->json('photo_urls')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_executions');
    }
}; 