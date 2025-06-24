<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Extend users table
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_super_admin')->default(false)->index();
        });
        
        // Extend Spatie's permissions table
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->index('name'); // For faster permission lookups
        });
        
        // Extend Spatie's roles table for hierarchy
        Schema::table('roles', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_role_id')->nullable();
            $table->boolean('is_system')->default(false);
            $table->foreign('parent_role_id')->references('id')->on('roles');
        });
        
        // Super admin grants tracking
        Schema::create('super_admin_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('granted_to')->constrained('users');
            $table->foreignId('granted_by')->constrained('users');
            $table->timestamp('granted_at');
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users');
            $table->text('reason')->nullable();
            $table->timestamps();
            $table->index(['granted_to', 'revoked_at']);
        });
        
        // User invitations
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
            $table->index(['email', 'expires_at']);
            $table->index('expires_at');
        });

        // Permission audit logs
        Schema::create('permission_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type');
            $table->string('event_action', 50)->index();
            $table->morphs('auditable');
            $table->foreignId('user_id')->constrained();
            $table->foreignId('impersonator_id')->nullable()->constrained('users');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('session_id', 100)->nullable();
            $table->timestamps();
            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['event_type', 'event_action']);
            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });

        // Performance indexes for Spatie tables
        Schema::table('model_has_permissions', function (Blueprint $table) {
            $table->index(['model_id', 'model_type']);
        });

        Schema::table('model_has_roles', function (Blueprint $table) {
            $table->index(['model_id', 'model_type']);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_super_admin');
        });

        Schema::table('permissions', function (Blueprint $table) {
            $table->dropColumn(['display_name', 'description', 'sort_order']);
            $table->dropIndex(['name']);
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropForeign(['parent_role_id']);
            $table->dropColumn(['parent_role_id', 'is_system']);
        });

        Schema::dropIfExists('super_admin_grants');
        Schema::dropIfExists('user_invitations');
        Schema::dropIfExists('permission_audit_logs');

        Schema::table('model_has_permissions', function (Blueprint $table) {
            $table->dropIndex(['model_id', 'model_type']);
        });

        Schema::table('model_has_roles', function (Blueprint $table) {
            $table->dropIndex(['model_id', 'model_type']);
        });
    }
};