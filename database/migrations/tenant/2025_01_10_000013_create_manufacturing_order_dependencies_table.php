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
        Schema::create('manufacturing_order_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('child_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->enum('dependency_type', ['required', 'optional'])->default('required');
            $table->decimal('minimum_quantity', 10, 2)->nullable();
            $table->decimal('minimum_percentage', 5, 2)->nullable();
            $table->decimal('quantity_completed', 10, 2)->default(0);
            $table->boolean('is_satisfied')->default(false);
            $table->timestamp('satisfied_at')->nullable();
            $table->timestamps();

            $table->unique(['parent_order_id', 'child_order_id'], 'unique_parent_child');
            $table->index(['parent_order_id', 'is_satisfied']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturing_order_dependencies');
    }
};
