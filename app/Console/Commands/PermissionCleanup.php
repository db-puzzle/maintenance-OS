<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\PermissionValidationService;
use App\Services\AuditLogService;

class PermissionCleanup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:cleanup 
                            {--validate : Only validate permissions without cleanup}
                            {--force : Force cleanup without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Validate and cleanup orphaned permissions (V2)';

    /**
     * Execute the console command.
     */
    public function handle(PermissionValidationService $validationService): int
    {
        $this->info('Starting Permission System V2 validation...');
        
        // Validate all permissions
        $results = $validationService->validateAllPermissions();
        
        $this->info("Total permissions: {$results['total']}");
        $this->info("Valid permissions: {$results['valid']}");
        $this->warn("Invalid permissions: {$results['invalid']}");
        
        if ($results['invalid'] > 0) {
            $this->table(
                ['Permission ID', 'Permission Name', 'Errors'],
                collect($results['errors'])->map(function ($errors, $id) {
                    return [
                        $id,
                        $errors['permission'],
                        implode("\n", $errors['errors'])
                    ];
                })->toArray()
            );
        }
        
        // Check for duplicates
        $duplicates = $validationService->findDuplicatePermissions();
        if (count($duplicates) > 0) {
            $this->warn('Found duplicate permissions:');
            $this->table(
                ['Permission Name', 'Guard', 'Count'],
                collect($duplicates)->map(function ($dup) {
                    return [$dup->name, $dup->guard_name, $dup->count];
                })->toArray()
            );
        }
        
        // Check hierarchy consistency
        $hierarchyIssues = $validationService->validateHierarchyConsistency();
        if (count($hierarchyIssues) > 0) {
            $this->warn('Found hierarchy consistency issues:');
            foreach ($hierarchyIssues as $issue) {
                $this->error("- $issue");
            }
        }
        
        // Cleanup if not in validate-only mode
        if (!$this->option('validate')) {
            if ($this->option('force') || $this->confirm('Do you want to cleanup orphaned permissions?')) {
                $this->info('Cleaning up orphaned permissions...');
                
                $deleted = $validationService->cleanupOrphanedPermissions();
                
                $this->info("Deleted $deleted orphaned permissions.");
                
                // Log the cleanup
                AuditLogService::log(
                    'permissions.cleanup',
                    'cleanup',
                    null,
                    [],
                    ['deleted_count' => $deleted],
                    [
                        'command' => 'permissions:cleanup',
                        'user' => auth()->user()?->name ?? 'system',
                        'invalid_permissions' => $results['invalid'],
                        'duplicates' => count($duplicates),
                        'hierarchy_issues' => count($hierarchyIssues)
                    ]
                );
            }
        }
        
        $this->info('Permission validation complete.');
        
        return Command::SUCCESS;
    }
}