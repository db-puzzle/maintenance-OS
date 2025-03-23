<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('tag');
            $table->string('serial_number')->nullable();
            $table->foreignId('machine_type_id')->constrained()->onDelete('restrict');
            $table->text('description')->nullable();
            $table->string('manufacturer')->nullable();
            $table->integer('manufacturing_year')->nullable();
            $table->foreignId('area_id')->constrained()->onDelete('restrict');
            $table->foreignId('sector_id')->nullable()->constrained()->onDelete('restrict');
            $table->string('photo_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
}; 