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
        Schema::create('work_order_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 20)->unique();
            $table->foreignId('work_order_category_id')->constrained('work_order_categories');
            $table->text('description')->nullable();
            $table->string('color', 7)->nullable()->comment('Hex color for UI');
            $table->string('icon', 50)->nullable()->comment('Icon identifier for UI');
            $table->integer('default_priority_score')->default(50)->comment('Default priority score 0-100');
            $table->boolean('requires_approval')->default(true);
            $table->boolean('auto_approve_from_routine')->default(false);
            $table->integer('sla_hours')->nullable()->comment('Service level agreement in hours');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['is_active', 'work_order_category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_types');
    }
};
