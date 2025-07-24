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
        Schema::create('shipment_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->cascadeOnDelete();
            $table->enum('photo_type', ['package', 'container', 'document', 'damage']);
            $table->string('file_path', 500);
            $table->string('thumbnail_path', 500)->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // EXIF data, GPS coordinates
            $table->foreignId('uploaded_by')->nullable()->constrained('users');
            $table->timestamp('created_at')->useCurrent();
            
            $table->index(['shipment_id', 'photo_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_photos');
    }
};