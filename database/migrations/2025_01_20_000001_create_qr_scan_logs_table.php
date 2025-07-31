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
        Schema::create('qr_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->string('resource_type'); // 'item', 'order', 'shipment'
            $table->string('resource_id');
            $table->foreignId('user_id')->nullable()->constrained();
            $table->string('ip_address');
            $table->string('user_agent');
            $table->string('device_type'); // 'mobile', 'tablet', 'desktop'
            $table->boolean('in_app')->default(false);
            $table->json('metadata')->nullable(); // Additional tracking data
            $table->timestamp('scanned_at');
            $table->timestamps();
            
            $table->index(['resource_type', 'resource_id']);
            $table->index('user_id');
            $table->index('scanned_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_scan_logs');
    }
};