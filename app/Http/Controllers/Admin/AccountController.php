<?php

namespace App\Http\Controllers\Admin;

use App\Events\TenantStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Central\Plan;
use App\Services\AdminTenantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Controller for managing tenant accounts in the admin portal.
 * Handles CRUD operations for tenants using Laravel Tenancy's automatic features.
 */
class AccountController extends Controller
{
    public function __construct(
        private AdminTenantService $tenantService
    ) {}

    /**
     * Display a listing of tenant accounts.
     */
    public function index(Request $request): Response
    {
        // Optimized query with selective loading
        $accounts = Account::query()
            ->select(['id', 'name', 'subdomain', 'status', 'trial_ends_at', 'created_at'])
            ->with([
                'domains:tenant_id,domain',
                'subscription:account_id,plan_id,status',
                'subscription.plan:id,name,price',
            ])
            ->when($request->search, function ($query, $search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('subdomain', 'like', "%{$search}%");
                });
            })
            ->when($request->status, function ($query, $status): void {
                $query->where('status', $status);
            })
            ->latest()
            ->paginate(20);

        return Inertia::render('admin/accounts/index', [
            'accounts' => $accounts,
            'filters' => $request->only(['search', 'status']),
            'statistics' => $this->tenantService->getTenantStatistics(),
        ]);
    }

    /**
     * Show the form for creating a new tenant account.
     */
    public function create(): Response
    {
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('admin/accounts/create', [
            'plans' => $plans,
        ]);
    }

    /**
     * Store a newly created tenant account.
     * Laravel Tenancy automatically creates database, runs migrations, and seeds.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'not_in:www,admin,api,app,mail,ftp,blog,help,support',
                Rule::unique('central.domains', 'domain'),
            ],
            'plan_id' => 'required|exists:central.plans,id',
            'admin_email' => 'required|email',
            'admin_name' => 'required|string',
        ]);

        // Create tenant outside of transaction
        // PostgreSQL can't CREATE DATABASE inside a transaction block
        $tenant = Account::create([
            'name' => $validated['name'],
            'subdomain' => $validated['subdomain'],
            'status' => 'active',
            'trial_ends_at' => now()->addDays(30),
            'metadata' => [
                'admin_email' => $validated['admin_email'],
                'admin_name' => $validated['admin_name'],
                'created_by_admin' => auth()->id(),
            ],
        ]);

        // Domain created via model event
        // Database created via package
        // Events fired automatically:
        // - TenantCreated
        // - DatabaseCreated
        // - DatabaseMigrated
        // - DatabaseSeeded

        // Create subscription in a transaction
        DB::transaction(function () use ($tenant, $validated) {
            $tenant->subscription()->create([
                'plan_id' => $validated['plan_id'],
                'status' => 'trialing',
                'trial_ends_at' => $tenant->trial_ends_at,
            ]);
        });

        return redirect()->route('admin.accounts.show', $tenant)
            ->with('success', 'Account created successfully. Database setup is automatic!');
    }

    /**
     * Display the specified tenant account.
     */
    public function show(Account $account): Response
    {
        $account->load([
            'domains',
            'subscription.plan',
        ]);

        $stats = $account->getDatabaseStats();

        return Inertia::render('admin/accounts/show', [
            'account' => $account,
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for editing the specified tenant account.
     */
    public function edit(Account $account): Response
    {
        $account->load('subscription.plan');

        return Inertia::render('admin/accounts/edit', [
            'account' => $account,
        ]);
    }

    /**
     * Update the specified tenant account.
     */
    public function update(Request $request, Account $account): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:active,suspended,maintenance',
            'suspension_reason' => 'required_if:status,suspended|nullable|string',
        ]);

        $oldStatus = $account->status;

        $account->update([
            'name' => $validated['name'],
            'status' => $validated['status'],
            'suspension_reason' => $validated['suspension_reason'] ?? null,
            'suspended_at' => $validated['status'] === 'suspended' ? now() : null,
        ]);

        // Fire custom event if status changed
        if ($oldStatus !== $account->status) {
            event(new TenantStatusChanged($account, $oldStatus));
        }

        return back()->with('success', 'Account updated successfully');
    }

    /**
     * Remove the specified tenant account.
     * Laravel Tenancy automatically drops the database and fires cleanup events.
     */
    public function destroy(Request $request, Account $account): RedirectResponse
    {
        // Confirm deletion
        if (! $request->boolean('confirm')) {
            return back()->with('error', 'Please confirm deletion');
        }

        // Just delete - package handles everything!
        $account->delete();

        // Package automatically:
        // - Fires DeletingTenant event
        // - Drops the database
        // - Fires TenantDeleted event
        // - Fires DatabaseDeleted event

        return redirect()->route('admin.accounts.index')
            ->with('success', 'Account and database deleted automatically');
    }
}
