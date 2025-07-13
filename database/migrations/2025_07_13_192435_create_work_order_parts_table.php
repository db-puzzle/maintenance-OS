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
        Schema::create('work_order_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->nullable()->constrained('inventory_parts');
            $table->string('part_number', 100)->nullable();
            $table->string('part_name');
            
            // Quantities
            $table->decimal('estimated_quantity', 10, 2)->nullable();
            $table->decimal('reserved_quantity', 10, 2)->nullable();
            $table->decimal('used_quantity', 10, 2)->nullable();
            
            // Costs
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->decimal('total_cost', 10, 2)->nullable();
            
            // Status tracking
            $table->enum('status', ['planned', 'reserved', 'issued', 'used', 'returned'])->default('planned');
            
            // Audit fields
            $table->timestamp('reserved_at')->nullable();
            $table->foreignId('reserved_by')->nullable()->constrained('users');
            $table->timestamp('issued_at')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by')->nullable()->constrained('users');
            
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['work_order_id', 'status']);
            $table->index('part_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_parts');
    }
};
