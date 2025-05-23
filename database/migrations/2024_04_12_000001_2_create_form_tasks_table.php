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
            $table->foreignId('form_id')->constrained()->onDelete('cascade');
            $table->integer('position');
            $table->string('type')->comment('question, multiple_choice, multiple_select, measurement, photo, code_reader, file_upload');
            $table->string('description');
            $table->boolean('is_required')->default(false);
            $table->json('configuration')->nullable()->comment('Task-specific configuration');
            $table->timestamps();
            
            $table->index(['form_id', 'position']);
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
