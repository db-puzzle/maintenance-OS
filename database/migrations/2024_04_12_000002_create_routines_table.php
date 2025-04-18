<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_plan_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('trigger_hours');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routines');
    }
}; 