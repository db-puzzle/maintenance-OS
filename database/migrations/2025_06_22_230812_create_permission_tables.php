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
        // Create permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('guard_name');
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            
            // Entity-scoped permissions
            $table->string('entity_type', 50)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->boolean('is_dynamic')->default(false);
            $table->json('metadata')->nullable();
            
            $table->timestamps();

            $table->unique(['name', 'guard_name']);
            $table->index(['entity_type', 'entity_id']);
            $table->index('is_dynamic');
        });

        // Create roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('guard_name');
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('parent_role_id')->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('is_administrator')->default(false);
            $table->timestamps();
            
            $table->unique(['name', 'guard_name']);
            $table->foreign('parent_role_id')->references('id')->on('roles');
        });

        // Create model_has_permissions pivot table
        Schema::create('model_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            
            $table->index(['model_id', 'model_type']);
            
            $table->foreign('permission_id')
                ->references('id')
                ->on('permissions')
                ->onDelete('cascade');
            
            $table->primary(['permission_id', 'model_id', 'model_type']);
        });

        // Create model_has_roles pivot table
        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            
            $table->index(['model_id', 'model_type']);
            
            $table->foreign('role_id')
                ->references('id')
                ->on('roles')
                ->onDelete('cascade');
            
            $table->primary(['role_id', 'model_id', 'model_type']);
        });

        // Create role_has_permissions pivot table
        Schema::create('role_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->unsignedBigInteger('role_id');

            $table->foreign('permission_id')
                ->references('id')
                ->on('permissions')
                ->onDelete('cascade');

            $table->foreign('role_id')
                ->references('id')
                ->on('roles')
                ->onDelete('cascade');

            $table->primary(['permission_id', 'role_id']);
        });
        
        // Clear permission cache
        app('cache')
            ->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
    }
};
