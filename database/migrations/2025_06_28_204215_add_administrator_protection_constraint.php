<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only create database triggers for PostgreSQL
        if (config('database.default') !== 'pgsql') {
            return;
        }

        // Create a function to check if at least one administrator exists
        DB::unprepared('
            CREATE OR REPLACE FUNCTION check_administrator_exists()
            RETURNS TRIGGER AS $$
            DECLARE
                admin_role_id INTEGER;
                admin_count INTEGER;
                is_admin BOOLEAN;
            BEGIN
                -- Get the Administrator role ID
                SELECT id INTO admin_role_id 
                FROM roles 
                WHERE name = \'Administrator\' 
                LIMIT 1;
                
                -- If no administrator role exists, allow the operation
                IF admin_role_id IS NULL THEN
                    RETURN NEW;
                END IF;
                
                -- Check if the user being deleted/updated is an administrator
                SELECT EXISTS(
                    SELECT 1 
                    FROM model_has_roles 
                    WHERE model_type = \'App\\\\Models\\\\User\' 
                    AND model_id = OLD.id 
                    AND role_id = admin_role_id
                ) INTO is_admin;
                
                -- If not an admin, allow the operation
                IF NOT is_admin THEN
                    RETURN NEW;
                END IF;
                
                -- Count remaining active administrators (excluding the current user)
                SELECT COUNT(*) INTO admin_count
                FROM users u
                INNER JOIN model_has_roles mhr ON mhr.model_id = u.id
                WHERE mhr.model_type = \'App\\\\Models\\\\User\'
                AND mhr.role_id = admin_role_id
                AND u.deleted_at IS NULL
                AND u.id != OLD.id;
                
                -- If this is the last administrator, prevent the operation
                IF admin_count = 0 THEN
                    IF TG_OP = \'UPDATE\' THEN
                        RAISE EXCEPTION \'Cannot soft delete the last administrator. The system must always have at least one active administrator.\';
                    ELSE
                        RAISE EXCEPTION \'Cannot delete the last administrator. The system must always have at least one administrator.\';
                    END IF;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        ');
        
        // Create trigger for soft deletes (UPDATE with deleted_at)
        DB::unprepared('
            CREATE TRIGGER ensure_administrator_on_soft_delete
            BEFORE UPDATE ON users
            FOR EACH ROW
            WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
            EXECUTE FUNCTION check_administrator_exists();
        ');
        
        // Create trigger for hard deletes
        DB::unprepared('
            CREATE TRIGGER ensure_administrator_on_delete
            BEFORE DELETE ON users
            FOR EACH ROW
            EXECUTE FUNCTION check_administrator_exists();
        ');
        
        // Create a function to check role removal
        DB::unprepared('
            CREATE OR REPLACE FUNCTION check_administrator_role_removal()
            RETURNS TRIGGER AS $$
            DECLARE
                admin_role_id INTEGER;
                admin_count INTEGER;
                user_deleted_at TIMESTAMP;
            BEGIN
                -- Get the Administrator role ID
                SELECT id INTO admin_role_id 
                FROM roles 
                WHERE name = \'Administrator\' 
                LIMIT 1;
                
                -- If this is not the administrator role being removed, allow it
                IF OLD.role_id != admin_role_id THEN
                    RETURN OLD;
                END IF;
                
                -- Check if the user is soft-deleted
                SELECT deleted_at INTO user_deleted_at
                FROM users
                WHERE id = OLD.model_id;
                
                -- If user is already soft-deleted, allow role removal
                IF user_deleted_at IS NOT NULL THEN
                    RETURN OLD;
                END IF;
                
                -- Count remaining active administrators (excluding the current user)
                SELECT COUNT(*) INTO admin_count
                FROM users u
                INNER JOIN model_has_roles mhr ON mhr.model_id = u.id
                WHERE mhr.model_type = \'App\\\\Models\\\\User\'
                AND mhr.role_id = admin_role_id
                AND u.deleted_at IS NULL
                AND u.id != OLD.model_id;
                
                -- If this is the last administrator, prevent the role removal
                IF admin_count = 0 THEN
                    RAISE EXCEPTION \'Cannot remove Administrator role from the last active administrator. The system must always have at least one active administrator.\';
                END IF;
                
                RETURN OLD;
            END;
            $$ LANGUAGE plpgsql;
        ');
        
        // Create trigger for role removal
        DB::unprepared('
            CREATE TRIGGER ensure_administrator_on_role_removal
            BEFORE DELETE ON model_has_roles
            FOR EACH ROW
            WHEN (OLD.model_type = \'App\\\\Models\\\\User\')
            EXECUTE FUNCTION check_administrator_role_removal();
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only drop triggers for PostgreSQL
        if (config('database.default') !== 'pgsql') {
            return;
        }

        // Drop triggers
        DB::unprepared('DROP TRIGGER IF EXISTS ensure_administrator_on_soft_delete ON users;');
        DB::unprepared('DROP TRIGGER IF EXISTS ensure_administrator_on_delete ON users;');
        DB::unprepared('DROP TRIGGER IF EXISTS ensure_administrator_on_role_removal ON model_has_roles;');
        
        // Drop functions
        DB::unprepared('DROP FUNCTION IF EXISTS check_administrator_exists();');
        DB::unprepared('DROP FUNCTION IF EXISTS check_administrator_role_removal();');
    }
}; 