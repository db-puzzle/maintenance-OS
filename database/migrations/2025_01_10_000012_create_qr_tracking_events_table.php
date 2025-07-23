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
        Schema::create('qr_tracking_events', function (Blueprint $table) {
            $table->id();
            $table->string('qr_code', 100);
            $table->enum('event_type', ['generated', 'scanned', 'status_update', 'location_change']);
            $table->json('event_data')->nullable();
            $table->string('location', 255)->nullable();
            $table->foreignId('scanned_by')->nullable()->constrained('users');
            $table->json('device_info')->nullable();
            $table->timestamp('created_at')->useCurrent();
            
            $table->index(['qr_code', 'created_at']);
            $table->index(['event_type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_tracking_events');
    }
};