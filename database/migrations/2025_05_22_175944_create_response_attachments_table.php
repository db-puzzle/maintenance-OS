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
        Schema::create('response_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_response_id')->constrained()->onDelete('cascade');
            $table->string('type')->comment('photo, video, file');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->integer('file_size');
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index('task_response_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('response_attachments');
    }
};
