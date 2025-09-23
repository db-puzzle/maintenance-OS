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
        Schema::table('media', function (Blueprint $table) {
            // Advanced metadata fields
            $table->string('file_hash', 64)->nullable()->index()->after('size');
            $table->string('perceptual_hash', 64)->nullable()->index()->after('file_hash');
            $table->string('blurhash', 191)->nullable()->after('perceptual_hash');
            $table->string('dominant_color', 7)->nullable()->after('blurhash');
            
            // Image dimensions
            $table->unsignedInteger('width')->nullable()->after('dominant_color');
            $table->unsignedInteger('height')->nullable()->after('width');
            $table->decimal('aspect_ratio', 5, 3)->nullable()->after('height');
            
            // Upload metadata
            $table->string('upload_method', 20)->default('standard')->after('aspect_ratio');
            $table->unsignedBigInteger('original_size')->nullable()->after('upload_method');
            $table->decimal('compression_ratio', 3, 2)->nullable()->after('original_size');
            
            // Performance tracking
            $table->unsignedInteger('access_count')->default(0)->after('compression_ratio');
            $table->timestamp('last_accessed_at')->nullable()->after('access_count');
            
            // Duplicate tracking
            $table->unsignedBigInteger('duplicate_of')->nullable()->after('last_accessed_at');
            $table->string('duplicate_type', 20)->nullable()->after('duplicate_of');
            
            // Add indexes for performance
            $table->index(['mime_type', 'size']);
            $table->index(['collection_name', 'created_at']);
            $table->index('last_accessed_at');
            $table->index('duplicate_of');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn([
                'file_hash',
                'perceptual_hash',
                'blurhash',
                'dominant_color',
                'width',
                'height',
                'aspect_ratio',
                'upload_method',
                'original_size',
                'compression_ratio',
                'access_count',
                'last_accessed_at',
                'duplicate_of',
                'duplicate_type',
            ]);
            
            $table->dropIndex(['mime_type', 'size']);
            $table->dropIndex(['collection_name', 'created_at']);
        });
    }
};
