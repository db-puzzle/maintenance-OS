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
        Schema::create('manufacturing_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 150)->unique()->comment('Format: MO-YYDDD-###[.N.N.N...] where YYDDD is year+julian day, ### is daily counter, .N is hierarchy');
            $table->foreignId('parent_id')->nullable()->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items');
            $table->foreignId('bill_of_material_id')->nullable()->constrained('bill_of_materials');
            $table->decimal('quantity', 10, 2);
            $table->decimal('quantity_completed', 10, 2)->default(0);
            $table->decimal('quantity_scrapped', 10, 2)->default(0);
            $table->string('unit_of_measure', 20)->default('EA');

            // Smart progress tracking
            $table->decimal('smart_progress_percentage', 5, 2)->default(0)->comment('Calculated progress based on work units across hierarchy');
            $table->timestamp('progress_calculated_at')->nullable()->comment('Last time smart progress was calculated');

            // Status tracking
            $table->enum('status', ['draft', 'planned', 'scheduled', 'released', 'in_progress', 'on_hold', 'completed', 'cancelled'])->default('draft');
            $table->string('hold_reason')->nullable();
            $table->timestamp('hold_at')->nullable();
            $table->integer('priority')->default(50); // 0-100

            // Child order tracking
            $table->integer('child_orders_count')->default(0);
            $table->integer('completed_child_orders_count')->default(0);
            $table->boolean('auto_complete_on_children')->default(true);

            // Hierarchical dependency fields for progressive flow
            $table->enum('dependency_type', ['none', 'all_children_released', 'children_quantity', 'children_percentage', 'progressive'])->default('none');
            $table->decimal('dependency_minimum_quantity', 10, 2)->nullable();
            $table->decimal('dependency_minimum_percentage', 5, 2)->nullable();
            $table->boolean('can_release_before_children')->default(false);
            $table->decimal('cumulative_children_quantity_completed', 10, 2)->default(0);
            $table->decimal('cumulative_children_quantity_required', 10, 2)->default(0);

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
            $table->index('dependency_type');
            $table->index('smart_progress_percentage');
            $table->index(['progress_calculated_at', 'smart_progress_percentage']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturing_orders');
    }
};
