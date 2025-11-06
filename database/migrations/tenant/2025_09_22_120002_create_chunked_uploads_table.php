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
        Schema::create('chunked_uploads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('total_size');
            $table->unsignedInteger('total_chunks');
            $table->json('uploaded_chunks');
            $table->string('file_hash', 64);
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'expired']);
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->string('collection');
            $table->json('metadata')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('expires_at');
            $table->index(['model_type', 'model_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chunked_uploads');
    }
};
