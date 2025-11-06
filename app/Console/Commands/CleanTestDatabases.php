<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanTestDatabases extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:clean-db
                            {--force : Force the operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up all test databases (tenant and central)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Safety check - only allow in non-production environments
        if (app()->environment('production')) {
            $this->error('This command cannot be run in production!');

            return self::FAILURE;
        }

        // Confirm before proceeding
        if (! $this->option('force')) {
            if (! $this->confirm('This will delete ALL test databases. Are you sure?')) {
                $this->info('Operation cancelled.');

                return self::SUCCESS;
            }
        }

        $this->info('Cleaning up test databases...');
        $this->newLine();

        // Clean up tenant databases
        $tenantCount = $this->cleanTenantDatabases();

        // Clean up central test database
        $centralCleaned = $this->cleanCentralTestDatabase();

        $this->newLine();
        $this->info('✓ Cleanup complete!');
        $this->line("  - Tenant databases removed: {$tenantCount}");
        $this->line('  - Central test database: ' . ($centralCleaned ? 'removed' : 'did not exist'));

        return self::SUCCESS;
    }

    /**
     * Clean up all tenant test databases.
     */
    protected function cleanTenantDatabases(): int
    {
        $this->line('Searching for tenant databases...');

        try {
            // Get all tenant databases
            $databases = DB::connection('pgsql')->select("
                SELECT datname 
                FROM pg_database 
                WHERE datname LIKE 'tenant_%'
                AND datistemplate = false
            ");

            if (empty($databases)) {
                $this->line('  No tenant databases found.');

                return 0;
            }

            $count = 0;
            $progressBar = $this->output->createProgressBar(count($databases));
            $progressBar->start();

            foreach ($databases as $database) {
                try {
                    // Terminate active connections
                    DB::connection('pgsql')->statement('
                        SELECT pg_terminate_backend(pid) 
                        FROM pg_stat_activity 
                        WHERE datname = ? 
                        AND pid <> pg_backend_pid()
                    ', [$database->datname]);

                    // Drop the database
                    DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS \"{$database->datname}\"");

                    $count++;
                    $progressBar->advance();
                } catch (\Exception $e) {
                    // Log but continue
                    $this->warn("  Failed to drop {$database->datname}: " . $e->getMessage());
                }
            }

            $progressBar->finish();
            $this->newLine();

            return $count;
        } catch (\Exception $e) {
            $this->error('  Error accessing database: ' . $e->getMessage());

            return 0;
        }
    }

    /**
     * Clean up the central test database.
     */
    protected function cleanCentralTestDatabase(): bool
    {
        $this->line('Cleaning central test database...');

        try {
            $dbName = 'maintenance_os_central_test';

            // Check if database exists
            $exists = DB::connection('pgsql')->select(
                'SELECT 1 FROM pg_database WHERE datname = ?',
                [$dbName]
            );

            if (empty($exists)) {
                return false;
            }

            // Terminate active connections
            DB::connection('pgsql')->statement('
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = ? 
                AND pid <> pg_backend_pid()
            ', [$dbName]);

            // Drop the database
            DB::connection('pgsql')->statement("DROP DATABASE IF EXISTS \"{$dbName}\"");

            return true;
        } catch (\Exception $e) {
            $this->warn('  Failed to clean central database: ' . $e->getMessage());

            return false;
        }
    }
}
