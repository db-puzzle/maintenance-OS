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
        Schema::create('schedule_versions', function (Blueprint $table) {
            $table->id();
            $table->integer('version_number');
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->foreignId('published_by')->nullable()->constrained('users');
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            
            $table->index('status');
            $table->index('version_number');
            $table->index('published_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_versions');
    }
};