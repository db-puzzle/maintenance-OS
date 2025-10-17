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
        Schema::create('user_time_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('entity_type', ['work_cell', 'global']);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->enum('display_mode', ['cycle_time', 'throughput'])->default('cycle_time');
            $table->enum('time_scale', ['seconds', 'minutes', 'hours', 'auto'])->default('auto');
            $table->timestamps();

            $table->unique(['user_id', 'entity_type', 'entity_id']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_time_preferences');
    }
};
