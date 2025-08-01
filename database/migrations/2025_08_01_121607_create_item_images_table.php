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
        Schema::create('item_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('item_id')->constrained('items')->onDelete('cascade');
            $table->string('filename');
            $table->string('storage_path');
            $table->string('mime_type');
            $table->integer('file_size');
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->integer('display_order')->default(0);
            $table->string('alt_text')->nullable();
            $table->text('caption')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignUuid('uploaded_by')->constrained('users');
            $table->timestamps();
            
            $table->index(['item_id', 'is_primary']);
            $table->index(['item_id', 'display_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_images');
    }
};