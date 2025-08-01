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
        Schema::create('item_image_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('item_image_id')->constrained('item_images')->onDelete('cascade');
            $table->enum('variant_type', ['thumbnail', 'small', 'medium', 'large']);
            $table->string('storage_path');
            $table->integer('width');
            $table->integer('height');
            $table->integer('file_size');
            $table->timestamps();
            
            $table->unique(['item_image_id', 'variant_type']);
            $table->index('variant_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_image_variants');
    }
};