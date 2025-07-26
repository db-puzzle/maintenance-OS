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
        Schema::create('user_work_cells', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('work_cell_id')->constrained('work_cells')->cascadeOnDelete();
            $table->timestamps();
            
            $table->unique(['user_id', 'work_cell_id']);
            $table->index('user_id');
            $table->index('work_cell_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_work_cells');
    }
};