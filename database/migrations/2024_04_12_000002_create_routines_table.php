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
            $table->foreignId('form_id')->unique()->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('trigger_hours');
            $table->integer('type')->comment('1: Inspection, 2: Maintenance Routine, 3: Maintenance Report')->default(2);
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index('type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routines');
    }
}; 