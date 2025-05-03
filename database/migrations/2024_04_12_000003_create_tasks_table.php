<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('routine_id')->constrained()->cascadeOnDelete();
            $table->text('description');
            $table->enum('type', ['Text', 'MultipleChoice', 'MultipleSelect', 'Measurement', 'Photo', 'CodeReader', 'FileUpload']);
            $table->json('options')->nullable();
            $table->string('measurement_unit')->nullable();
            $table->json('instruction_images')->nullable();
            $table->enum('code_reader_type', ['qr_code', 'barcode'])->nullable();
            $table->text('code_reader_instructions')->nullable();
            $table->text('file_upload_instructions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
}; 