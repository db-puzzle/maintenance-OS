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
        // Add indexes for performance on routine_executions
        Schema::table('routine_executions', function (Blueprint $table) {
            $table->index('created_at', 'idx_routine_executions_created_at');
            $table->index(['executed_by', 'created_at'], 'idx_routine_executions_executor_date');
            
            // Only create fulltext indexes for MySQL/MariaDB, not SQLite
            $connection = config('database.default');
            if (in_array($connection, ['mysql', 'mariadb'])) {
                $table->fullText('notes', 'idx_routine_executions_notes_fulltext');
            }
        });

        // Add indexes for performance on task_responses
        Schema::table('task_responses', function (Blueprint $table) {
            $table->index(['form_execution_id', 'is_completed'], 'idx_task_responses_execution_completed');
            
            // Only create fulltext indexes for MySQL/MariaDB, not SQLite
            $connection = config('database.default');
            if (in_array($connection, ['mysql', 'mariadb'])) {
                $table->fullText('response', 'idx_task_responses_response_fulltext');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('routine_executions', function (Blueprint $table) {
            $table->dropIndex('idx_routine_executions_created_at');
            $table->dropIndex('idx_routine_executions_executor_date');
            
            // Only drop fulltext indexes if they exist (MySQL/MariaDB)
            $connection = config('database.default');
            if (in_array($connection, ['mysql', 'mariadb'])) {
                $table->dropFullText('idx_routine_executions_notes_fulltext');
            }
        });

        Schema::table('task_responses', function (Blueprint $table) {
            $table->dropIndex('idx_task_responses_execution_completed');
            
            // Only drop fulltext indexes if they exist (MySQL/MariaDB)
            $connection = config('database.default');
            if (in_array($connection, ['mysql', 'mariadb'])) {
                $table->dropFullText('idx_task_responses_response_fulltext');
            }
        });
    }
};
