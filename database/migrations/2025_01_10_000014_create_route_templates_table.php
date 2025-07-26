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
        Schema::create('route_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('item_category', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('name');
            $table->index('item_category');
        });

        Schema::create('route_template_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_template_id')->constrained('route_templates')->cascadeOnDelete();
            $table->integer('step_number');
            $table->enum('step_type', ['standard', 'quality_check', 'rework'])->default('standard');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->integer('setup_time_minutes')->default(0);
            $table->integer('cycle_time_minutes');
            $table->foreignId('work_cell_id')->nullable()->constrained('work_cells');
            $table->foreignId('form_id')->nullable()->constrained('forms');
            $table->enum('quality_check_mode', ['every_part', 'entire_lot', 'sampling'])->default('every_part');
            $table->integer('sampling_size')->nullable();
            $table->timestamps();
            
            $table->unique(['route_template_id', 'step_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_template_steps');
        Schema::dropIfExists('route_templates');
    }
};