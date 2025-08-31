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
        Schema::create('work_cell_parallel_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_cell_id')->constrained('work_cells')->cascadeOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->date('resource_date')->nullable();
            $table->integer('available_count')->default(1);
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Index for efficient lookups
            $table->index(['work_cell_id', 'resource_date', 'shift_id'], 'idx_resource_lookup');
            
            // Unique constraint to prevent duplicate entries
            $table->unique(['work_cell_id', 'shift_id', 'resource_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_cell_parallel_resources');
    }
};
