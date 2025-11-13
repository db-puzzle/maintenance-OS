<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the features table for managing feature flags.
     * Features can be global (enabled/disabled for all tenants) or plan-based.
     */
    public function up(): void
    {
        Schema::connection('central')->create('features', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique()->comment('Unique key for the feature (e.g., production_scheduler)');
            $table->string('name')->comment('Human-readable name');
            $table->text('description')->nullable()->comment('Description of what this feature does');
            $table->string('category')->nullable()->comment('Feature category (e.g., production, scheduling, reporting)');
            $table->boolean('is_global')->default(false)->comment('If true, this is a global feature (not plan-specific)');
            $table->boolean('is_enabled_globally')->default(false)->comment('If is_global=true, this controls global enablement');
            $table->boolean('requires_backend_validation')->default(true)->comment('Whether backend should validate this feature');
            $table->json('metadata')->nullable()->comment('Additional metadata about the feature');
            $table->timestamps();

            $table->index('key');
            $table->index('is_global');
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('central')->dropIfExists('features');
    }
};
