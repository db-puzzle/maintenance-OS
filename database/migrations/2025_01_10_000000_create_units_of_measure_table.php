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
        Schema::create('units_of_measure', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 50);
            $table->string('symbol', 10)->nullable();
            $table->enum('uom_type', ['COUNT', 'MASS', 'LENGTH', 'AREA', 'VOLUME', 'TIME']);
            $table->boolean('is_base_unit')->default(false);
            $table->foreignId('base_unit_id')->nullable()->constrained('units_of_measure');
            $table->decimal('conversion_to_base', 20, 10)->default(1.0);
            $table->integer('decimal_places')->default(2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('uom_type');
            $table->index('is_active');
            $table->index('is_base_unit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units_of_measure');
    }
};
