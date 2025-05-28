<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_routine', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->foreignId('routine_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            
            $table->unique(['asset_id', 'routine_id']);
            $table->index('asset_id');
            $table->index('routine_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_routine');
    }
}; 