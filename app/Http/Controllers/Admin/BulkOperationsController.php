<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Controller for bulk operations on multiple tenant accounts.
 * Uses Laravel Tenancy package commands for efficient processing.
 */
class BulkOperationsController extends Controller
{
    /**
     * Suspend multiple tenant accounts.
     */
    public function suspend(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tenant_ids' => 'required|array',
            'tenant_ids.*' => 'exists:central.accounts,id',
            'reason' => 'required|string',
        ]);

        Account::whereIn('id', $validated['tenant_ids'])
            ->update([
                'status' => 'suspended',
                'suspension_reason' => $validated['reason'],
                'suspended_at' => now(),
            ]);

        // Events will be fired for status changes

        return back()->with(
            'success',
            count($validated['tenant_ids']) . ' accounts suspended'
        );
    }

    /**
     * Run a command on multiple tenants.
     */
    public function runCommand(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tenant_ids' => 'required|array',
            'tenant_ids.*' => 'exists:central.accounts,id',
            'command' => 'required|in:migrate,seed,cache:clear,optimize,down,up',
        ]);

        // Use package commands directly - no custom job needed!
        $tenantIdString = implode(',', $validated['tenant_ids']);

        // Map user-friendly commands to package commands
        $commandMap = [
            'migrate' => 'tenants:migrate',
            'seed' => 'tenants:seed',
            'cache:clear' => 'tenants:run cache:clear',
            'optimize' => 'tenants:run optimize',
            'down' => 'tenants:run down',
            'up' => 'tenants:run up',
        ];

        $packageCommand = $commandMap[$validated['command']];
        $args = ['--tenants' => $tenantIdString];

        if (str_starts_with($packageCommand, 'tenants:run')) {
            $args = [
                'commandname' => str_replace('tenants:run ', '', $packageCommand),
                '--tenants' => $tenantIdString,
            ];
            $packageCommand = 'tenants:run';
        }

        Artisan::call($packageCommand, $args);

        return back()->with(
            'success',
            'Bulk operation completed for ' . count($validated['tenant_ids']) . ' tenants'
        );
    }
}
