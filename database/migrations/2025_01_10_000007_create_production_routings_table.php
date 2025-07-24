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
        Schema::create('production_routings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bom_item_id')->constrained('bom_items')->cascadeOnDelete();
            $table->string('routing_number', 100)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('routing_type', ['inherited', 'defined'])->default('defined');
            $table->unsignedBigInteger('parent_routing_id')->nullable(); // For inheritance
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
            
            $table->foreign('parent_routing_id')->references('id')->on('production_routings');
            $table->index('bom_item_id');
            $table->index('routing_number');
            $table->index('parent_routing_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_routings');
    }
};