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
            $table->foreignId('item_id')->nullable()->constrained('items')->comment('Reference to item - populated from order for production routes, null for templates');
            $table->boolean('is_template')->default(false);
            $table->foreignId('item_category_id')->nullable()->constrained('item_categories')->comment('For templates: restricts usage to items of this category');
            $table->foreignId('template_source_id')->nullable()->constrained('manufacturing_routes');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('version')->default(1);
            $table->boolean('is_latest_for_category')->default(false);
            $table->foreignId('created_from_route_id')->nullable()->constrained('manufacturing_routes');
            $table->json('template_metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index('item_id');
            $table->index('is_template');
            $table->index(['is_template', 'is_active']);
            $table->index('item_category_id');
            $table->index('template_source_id');
            $table->index('created_from_route_id');
            $table->index(['item_category_id', 'is_latest_for_category', 'version'], 'idx_route_templates_latest')
                ->where('is_template', '=', true);

            // Constraints:
            // - Production routes (is_template=false): must have manufacturing_order_id, item_id is auto-populated from order
            // - Template routes (is_template=true): must NOT have manufacturing_order_id, may have item_category_id
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
