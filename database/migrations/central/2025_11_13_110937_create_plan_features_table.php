<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the pivot table linking plans to features.
     * This allows different subscription plans to have different feature access.
     */
    public function up(): void
    {
        Schema::connection('central')->create('plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->onDelete('cascade');
            $table->foreignId('feature_id')->constrained('features')->onDelete('cascade');
            $table->boolean('is_enabled')->default(true)->comment('Whether this feature is enabled for this plan');
            $table->json('configuration')->nullable()->comment('Plan-specific feature configuration');
            $table->timestamps();

            $table->unique(['plan_id', 'feature_id']);
            $table->index('plan_id');
            $table->index('feature_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('central')->dropIfExists('plan_features');
    }
};
