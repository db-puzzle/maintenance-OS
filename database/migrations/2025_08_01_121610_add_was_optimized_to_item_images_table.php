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
        if (Schema::hasTable('item_images') && !Schema::hasColumn('item_images', 'was_optimized')) {
            Schema::table('item_images', function (Blueprint $table) {
                $table->boolean('was_optimized')->default(false)->after('metadata');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('item_images') && Schema::hasColumn('item_images', 'was_optimized')) {
            Schema::table('item_images', function (Blueprint $table) {
                $table->dropColumn('was_optimized');
            });
        }
    }
};
