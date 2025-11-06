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
        // DEPRECATED: Using Spatie Media Library instead
        // Schema::create('item_images', function (Blueprint $table) {
        //     $table->uuid('id')->primary();
        //     $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
        //     $table->string('filename');
        //     $table->string('storage_path');
        //     $table->string('mime_type');
        //     $table->integer('file_size');
        //     $table->integer('width')->nullable();
        //     $table->integer('height')->nullable();
        //     $table->string('hash', 64)->nullable()->index(); // SHA-256 hash for duplicate detection
        //     $table->string('blurhash')->nullable(); // For progressive loading
        //     $table->string('alt_text')->nullable();
        //     $table->text('caption')->nullable();
        //     $table->json('metadata')->nullable();
        //     $table->boolean('was_optimized')->default(false);
        //     $table->foreignId('uploaded_by')->constrained('users');
        //     $table->unsignedBigInteger('media_id')->nullable(); // For migration tracking
        //     $table->timestamps();
        //
        //     // Ensure only one image per item
        //     $table->unique('item_id', 'unique_item_image');
        //     $table->index('media_id');
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_images');
    }
};
