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
        Schema::create('work_cell_constraints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_cell_id')->constrained('work_cells')->cascadeOnDelete();
            $table->string('constraint_type', 50); // maintenance, training, audit, holiday, other
            $table->timestamp('start_datetime');
            $table->timestamp('end_datetime');
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_pattern', 255)->nullable(); // RRULE format or simple pattern
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index(['work_cell_id', 'start_datetime', 'end_datetime']);
            $table->index('constraint_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_cell_constraints');
    }
};
