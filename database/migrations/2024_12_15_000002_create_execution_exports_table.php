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
        Schema::create('execution_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('export_type', ['single', 'batch'])->default('single');
            $table->enum('export_format', ['pdf', 'csv', 'excel'])->default('pdf');
            $table->json('execution_ids')->comment('Array of execution IDs being exported');
            $table->string('file_path')->nullable();
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->json('metadata')->nullable()->comment('Export options and additional data');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            // Indexes for common queries
            $table->index(['user_id', 'status'], 'idx_execution_exports_user_status');
            $table->index('created_at', 'idx_execution_exports_created_at');
            $table->index('status', 'idx_execution_exports_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('execution_exports');
    }
};