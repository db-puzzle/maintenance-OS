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
        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->string('part_number')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('unit_cost', 10, 2)->default(0);
            $table->integer('available_quantity')->default(0);
            $table->integer('minimum_quantity')->default(0);
            $table->integer('maximum_quantity')->nullable();
            $table->string('location')->nullable();
            $table->string('supplier')->nullable();
            $table->string('manufacturer')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            
            $table->index('part_number');
            $table->index('name');
            $table->index('active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parts');
    }
};
