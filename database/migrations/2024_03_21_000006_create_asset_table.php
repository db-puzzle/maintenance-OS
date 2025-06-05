<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('tag');
            $table->string('serial_number')->nullable();
            $table->string('part_number')->nullable();
            $table->foreignId('asset_type_id')->nullable()->constrained()->onDelete('restrict');
            $table->text('description')->nullable();
            $table->string('manufacturer')->nullable();
            $table->integer('manufacturing_year')->nullable();
            $table->foreignId('plant_id')->nullable()->constrained()->onDelete('restrict');
            $table->foreignId('area_id')->nullable()->constrained()->onDelete('restrict');
            $table->foreignId('sector_id')->nullable()->constrained()->onDelete('restrict');
            $table->string('photo_path')->nullable();
            $table->foreignId('shift_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
}; 