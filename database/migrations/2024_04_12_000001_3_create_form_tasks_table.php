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
        Schema::create('form_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_version_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('form_id')->nullable()->constrained()->cascadeOnDelete()->comment('Temporary reference for draft tasks');
            $table->integer('position');
            $table->string('type')->comment('question, multiple_choice, multiple_select, measurement, photo, code_reader, file_upload');
            $table->text('description');
            $table->boolean('is_required')->default(false);
            $table->json('configuration')->nullable()->comment('Type-specific configuration');
            $table->timestamps();
            
            $table->index(['form_version_id', 'position']);
            $table->index(['form_id', 'position']);
            $table->index('type');
            $table->index(['form_version_id', 'is_required'], 'form_tasks_version_required_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_tasks');
    }
};
