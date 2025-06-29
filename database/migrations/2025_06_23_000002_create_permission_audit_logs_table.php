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
        Schema::create('permission_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type');
            $table->string('event_action', 50)->index();
            $table->nullableMorphs('auditable');
            $table->foreignId('user_id')->constrained();
            $table->foreignId('affected_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('impersonator_id')->nullable()->constrained('users');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('session_id', 100)->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['event_type', 'event_action']);
            $table->index(['user_id', 'created_at']);
            $table->index('affected_user_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('permission_audit_logs');
    }
}; 