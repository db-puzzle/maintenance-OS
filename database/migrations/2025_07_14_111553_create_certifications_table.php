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
        Schema::create('certifications', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->string('issuing_organization')->nullable();
            $table->integer('validity_period_days')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            
            $table->index('name');
            $table->index('issuing_organization');
            $table->index('active');
        });
        
        // Create pivot table for user certifications
        Schema::create('user_certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('certification_id')->constrained()->onDelete('cascade');
            $table->date('issued_at');
            $table->date('expires_at')->nullable();
            $table->string('certificate_number')->nullable();
            $table->timestamps();
            
            $table->unique(['user_id', 'certification_id']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_certifications');
        Schema::dropIfExists('certifications');
    }
};
