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
        Schema::create('bom_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bom_version_id')->constrained('bom_versions')->cascadeOnDelete();
            $table->unsignedBigInteger('parent_item_id')->nullable();
            $table->string('item_number', 100);
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('item_type', ['part', 'assembly', 'subassembly']);
            $table->decimal('quantity', 10, 4)->default(1);
            $table->string('unit_of_measure', 20)->default('EA');
            $table->integer('level')->default(0); // Hierarchy level
            $table->integer('sequence_number')->nullable(); // Order within parent
            
            // 3D rendering support
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('model_file_path', 500)->nullable();
            
            // Metadata
            $table->string('material', 100)->nullable();
            $table->decimal('weight', 10, 4)->nullable();
            $table->json('dimensions')->nullable(); // {length, width, height, unit}
            $table->json('custom_attributes')->nullable();
            
            // QR code tracking
            $table->string('qr_code', 100)->nullable()->unique();
            $table->timestamp('qr_generated_at')->nullable();
            
            $table->timestamps();
            
            $table->foreign('parent_item_id')->references('id')->on('bom_items')->cascadeOnDelete();
            $table->index(['bom_version_id', 'parent_item_id']);
            $table->index('item_number');
            $table->index('qr_code');
            $table->index(['level', 'sequence_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bom_items');
    }
};