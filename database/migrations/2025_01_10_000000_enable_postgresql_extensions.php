<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Enable btree_gist extension for exclusion constraints
        DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: We don't drop the extension as it might be used by other migrations
    }
}; 