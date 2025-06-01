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
        Schema::create('asset_runtime_measurements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('restrict');
            $table->float('reported_hours')->comment('The runtime hours reported by the user');
            $table->enum('source', ['manual', 'shift', 'iot', 'api'])->default('manual');
            $table->text('notes')->nullable();
            $table->timestamp('measurement_datetime')->comment('When the measurement was taken');
            $table->timestamps();
            
            $table->index(['asset_id', 'measurement_datetime']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_runtime_measurements');
    }
};
