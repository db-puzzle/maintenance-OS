<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('plant_id')->nullable()->constrained('plants')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('shift_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->string('weekday');
            $table->timestamps();
        });

        Schema::create('shift_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_schedule_id')->constrained('shift_schedules')->cascadeOnDelete();
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('shift_breaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_time_id')->constrained('shift_times')->cascadeOnDelete();
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_breaks');
        Schema::dropIfExists('shift_times');
        Schema::dropIfExists('shift_schedules');
        Schema::dropIfExists('shifts');
    }
}; 