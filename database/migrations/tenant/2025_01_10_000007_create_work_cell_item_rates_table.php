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
        Schema::create('work_cell_item_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_cell_id')->constrained('work_cells')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->integer('setup_time_seconds')->default(0);
            $table->decimal('cycle_time_seconds', 10, 3);
            $table->string('unit_of_measure_code', 20);
            $table->foreign('unit_of_measure_code')->references('code')->on('units_of_measure');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['work_cell_id', 'item_id']);
            $table->index('work_cell_id');
            $table->index('item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_cell_item_rates');
    }
};
