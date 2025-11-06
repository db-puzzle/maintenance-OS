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
        Schema::create('manufacturing_order_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('destination_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->decimal('quantity_transferred', 10, 2);
            $table->timestamp('transferred_at');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['source_order_id', 'destination_order_id']);
            $table->index('transferred_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturing_order_flows');
    }
};
