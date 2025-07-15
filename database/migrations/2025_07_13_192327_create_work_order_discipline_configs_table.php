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
        Schema::create('work_order_discipline_configs', function (Blueprint $table) {
            $table->id();
            $table->string('discipline', 50)->unique();
            $table->json('allowed_categories');
            $table->json('allowed_sources');
            $table->boolean('requires_compliance_fields')->default(false);
            $table->boolean('requires_calibration_tracking')->default(false);
            $table->json('custom_fields')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_discipline_configs');
    }
}; 