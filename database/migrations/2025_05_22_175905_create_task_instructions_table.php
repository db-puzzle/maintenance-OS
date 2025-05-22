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
        Schema::create('task_instructions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_task_id')->constrained()->onDelete('cascade');
            $table->string('type')->comment('text, image, video');
            $table->text('content')->nullable()->comment('For text type');
            $table->string('media_url')->nullable()->comment('For image/video types');
            $table->string('caption')->nullable()->comment('For image/video types');
            $table->integer('position');
            $table->timestamps();
            
            $table->index(['form_task_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_instructions');
    }
};
