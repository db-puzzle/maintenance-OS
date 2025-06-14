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
        Schema::create('form_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->cascadeOnDelete();
            $table->integer('version_number');
            $table->timestamp('published_at');
            $table->foreignId('published_by')->constrained('users');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['form_id', 'version_number']);
            $table->index(['form_id', 'is_active']);
            $table->index('published_at');
        });

        // Add foreign key constraint to forms table
        Schema::table('forms', function (Blueprint $table) {
            $table->foreign('current_version_id')->references('id')->on('form_versions')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->dropForeign(['current_version_id']);
        });
        
        Schema::dropIfExists('form_versions');
    }
}; 