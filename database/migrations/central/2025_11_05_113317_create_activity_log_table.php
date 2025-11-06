<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates activity_log table for central database to track Account/Tenant operations.
     * Uses uuidMorphs to support Account model's UUID primary keys.
     */
    public function up(): void
    {
        Schema::connection('central')->create('activity_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('log_name')->nullable();
            $table->text('description');
            // Use uuidMorphs for subject to support UUID-based models like Account
            $table->uuidMorphs('subject', 'subject');
            // Use nullableUuidMorphs for causer - not all activities have a causer (system events, automation)
            $table->nullableUuidMorphs('causer', 'causer');
            $table->uuid('batch_uuid')->nullable();
            $table->json('properties')->nullable();
            $table->string('event')->nullable();
            $table->timestamps();
            $table->index('log_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('central')->dropIfExists('activity_log');
    }
};
