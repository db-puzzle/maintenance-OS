<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routine_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();
            $table->timestamp('triggered_at');
            $table->timestamp('completed_at')->nullable();
            $table->enum('status', ['Programada', 'Em Andamento', 'Completa', 'Atrasada'])->default('Programada');
            $table->float('accumulated_hours_at_execution');
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users');
            $table->string('signature')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routine_executions');
    }
}; 