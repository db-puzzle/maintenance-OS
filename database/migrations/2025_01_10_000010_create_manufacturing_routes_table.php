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
        Schema::create('manufacturing_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manufacturing_order_id')->nullable()->unique()->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items');
            $table->boolean('is_template')->default(false);
            $table->foreignId('item_category_id')->nullable()->constrained('item_categories');
            $table->foreignId('template_source_id')->nullable()->constrained('manufacturing_routes');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index('item_id');
            $table->index('is_template');
            $table->index(['is_template', 'is_active']);
            $table->index('item_category_id');
            $table->index('template_source_id');

            // Note: Constraint enforced at model level - either manufacturing_order_id or is_template must be set
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('manufacturing_routes');
    }
};
