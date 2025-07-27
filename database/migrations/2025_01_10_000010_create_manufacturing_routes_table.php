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
            $table->foreignId('production_order_id')->constrained('manufacturing_orders')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items');
            $table->foreignId('route_template_id')->nullable()->constrained('route_templates');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->index('production_order_id');
            $table->index('item_id');
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