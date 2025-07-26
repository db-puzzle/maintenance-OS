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
        Schema::create('production_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 100)->unique();
            $table->foreignId('parent_id')->nullable()->constrained('production_orders')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items');
            $table->foreignId('bill_of_material_id')->nullable()->constrained('bill_of_materials');
            $table->decimal('quantity', 10, 2);
            $table->decimal('quantity_completed', 10, 2)->default(0);
            $table->decimal('quantity_scrapped', 10, 2)->default(0);
            $table->string('unit_of_measure', 20)->default('EA');
            
            // Status tracking
            $table->enum('status', ['draft', 'planned', 'released', 'in_progress', 'completed', 'cancelled'])->default('draft');
            $table->integer('priority')->default(50); // 0-100
            
            // Child order tracking
            $table->integer('child_orders_count')->default(0);
            $table->integer('completed_child_orders_count')->default(0);
            $table->boolean('auto_complete_on_children')->default(true);
            
            // Dates
            $table->date('requested_date')->nullable();
            $table->timestamp('planned_start_date')->nullable();
            $table->timestamp('planned_end_date')->nullable();
            $table->timestamp('actual_start_date')->nullable();
            $table->timestamp('actual_end_date')->nullable();
            
            // Source
            $table->string('source_type', 50)->nullable(); // 'manual', 'sales_order', 'forecast'
            $table->string('source_reference', 100)->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index(['status', 'priority']);
            $table->index(['planned_start_date', 'planned_end_date']);
            $table->index('item_id');
            $table->index('bill_of_material_id');
            $table->index('parent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_orders');
    }
};