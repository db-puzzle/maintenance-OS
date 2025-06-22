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
        Schema::create('routines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('trigger_hours')->comment('Hours between executions');
            $table->string('status')->default('Inactive')->comment('Active, Inactive');
            $table->text('description')->nullable();
            $table->foreignId('form_id')->constrained();
            $table->foreignId('active_form_version_id')->nullable()->constrained('form_versions')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'trigger_hours']);
            $table->index('form_id');
            $table->index('active_form_version_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routines');
    }
};
