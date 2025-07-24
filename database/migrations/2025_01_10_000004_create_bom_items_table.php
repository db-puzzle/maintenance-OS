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
            $table->foreign('parent_item_id')->references('id')->on('bom_items')->cascadeOnDelete();
            
            // Reference to item master
            $table->foreignId('item_id')->constrained('items');
            
            // BOM-specific attributes
            $table->decimal('quantity', 10, 4)->default(1);
            $table->string('unit_of_measure', 20)->default('EA');
            $table->integer('level')->default(0); // Hierarchy level
            $table->integer('sequence_number')->nullable(); // Order within parent
            
            // Reference designators (for electronics)
            $table->text('reference_designators')->nullable();
            
            // 3D rendering support
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('model_file_path', 500)->nullable();
            
            // BOM-specific metadata
            $table->json('bom_notes')->nullable();
            $table->json('assembly_instructions')->nullable();
            
            // QR code tracking
            $table->string('qr_code', 100)->unique()->nullable();
            $table->timestamp('qr_generated_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['bom_version_id', 'parent_item_id']);
            $table->index('item_id');
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