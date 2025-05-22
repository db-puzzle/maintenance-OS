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
        Schema::create('routine_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_id')->constrained()->cascadeOnDelete();
            $table->foreignId('form_execution_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('executed_by')->constrained('users');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->string('status')->default('not_started')->comment('not_started,scheduled, in_progress, late, completed, cancelled');
            $table->text('notes')->nullable();
            $table->json('execution_data')->nullable()->comment('Additional execution metadata');
            $table->timestamps();
            
            // Índices para consultas comuns
            $table->index(['routine_id', 'status']);
            $table->index(['executed_by', 'status']);
            $table->index('started_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routine_executions');
    }
};
