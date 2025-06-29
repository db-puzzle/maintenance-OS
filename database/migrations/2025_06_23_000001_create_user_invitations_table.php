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
        Schema::create('user_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token', 64)->unique();
            $table->foreignId('invited_by')->constrained('users');
            $table->string('initial_role')->nullable();
            $table->json('initial_permissions')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by')->nullable()->constrained('users');
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users');
            $table->string('revocation_reason')->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['email', 'expires_at']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_invitations');
    }
}; 