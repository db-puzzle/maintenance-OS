<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Central\Plan;
use Illuminate\Auth\Events\Registered;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Handle tenant registration.
 */
class TenantRegistrationController extends Controller
{
    /**
     * Reserved subdomains that cannot be registered.
     *
     * @var array<string>
     */
    protected const RESERVED_SUBDOMAINS = [
        'www',
        'admin',
        'api',
        'app',
        'mail',
        'ftp',
        'blog',
        'help',
        'support',
        'docs',
        'status',
        'cdn',
        'media',
        'static',
        'assets',
        'files',
        'download',
        'downloads',
        'uploads',
        'mysql',
        'pgsql',
        'redis',
        'database',
        'staging',
        'dev',
        'test',
        'testing',
        'demo',
    ];

    /**
     * Show the tenant registration form.
     */
    public function create(): Response
    {
        // Get available plans for selection
        $plans = Plan::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('auth/signup', [
            'plans' => $plans,
        ]);
    }

    /**
     * Construct the full tenant URL with proper protocol and port.
     * Handles both local development (with port) and production environments.
     *
     * @param string $domain The tenant domain (e.g., 'subdomain.localhost')
     * @return string The full URL (e.g., 'http://subdomain.localhost:8000')
     */
    protected function getTenantUrl(string $domain): string
    {
        // Parse the APP_URL to extract protocol and port
        $appUrl = config('app.url', 'http://localhost');
        $parsedUrl = parse_url($appUrl);

        // Extract components
        $scheme = $parsedUrl['scheme'] ?? 'http';
        $port = $parsedUrl['port'] ?? null;

        // Build the URL
        $url = $scheme . '://' . $domain;

        // Add port if present (for local development)
        if ($port && ! in_array($port, [80, 443])) {
            $url .= ':' . $port;
        }

        return $url;
    }

    /**
     * Handle tenant registration.
     */
    public function store(Request $request): RedirectResponse|HttpResponse
    {
        try {
            // Validate incoming data with simple rules
            // Let Laravel Tenancy middleware handle runtime validation
            $validated = $request->validate([
                'company_name' => ['required', 'string', 'max:255'],
                'subdomain' => [
                    'required',
                    'string',
                    'min:3',
                    'max:63',
                    'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/', // DNS-compliant format
                    'not_in:' . implode(',', self::RESERVED_SUBDOMAINS), // Business rules only
                    Rule::unique('domains', 'domain')->where(function ($query) use ($request) {
                        // Check full subdomain with domain suffix
                        $fullDomain = $request->input('subdomain') . '.' . config('app.domain', 'localhost');

                        return $query->where('domain', $fullDomain);
                    }),
                ],
                'plan_id' => ['required', 'exists:plans,id'],
                'admin_name' => ['required', 'string', 'max:255'],
                'admin_email' => ['required', 'string', 'email:rfc', 'max:255'],
                'admin_password' => ['required', 'confirmed', Password::defaults()],
                'terms_accepted' => ['required', 'accepted'],
            ], [
                'subdomain.regex' => 'The subdomain must start and end with a letter or number, and can only contain letters, numbers, and hyphens.',
                'subdomain.not_in' => 'This subdomain is reserved and cannot be used.',
                'subdomain.unique' => 'This subdomain is already taken. Please choose another.',
                'admin_email.required' => 'Please provide an email address.',
                'admin_email.email' => 'Please provide a valid email address with a valid domain.',
                'admin_email.max' => 'The email address cannot exceed 255 characters.',
            ]);

            // Create tenant - database operations happen automatically via Laravel Tenancy
            // Note: No transaction wrapper because PostgreSQL cannot CREATE DATABASE inside a transaction

            // Create tenant - database created, migrated, and seeded automatically!
            $account = Account::create([
                'name' => $validated['company_name'],
                'subdomain' => $validated['subdomain'],
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
                'metadata' => [
                    'admin_email' => $validated['admin_email'],
                    'admin_name' => $validated['admin_name'],
                    'admin_password' => bcrypt($validated['admin_password']),
                ],
            ]);

            // Domain created automatically via Account model event
            // Database created automatically by package
            // Migrations run automatically
            // Seeding happens automatically via CreateTenantAdmin job

            // Create subscription
            $account->subscription()->create([
                'plan_id' => $validated['plan_id'],
                'status' => 'trialing',
                'trial_ends_at' => $account->trial_ends_at,
            ]);

            // Fire registered event for any additional processing
            event(new Registered($account));

            // Redirect to tenant domain using Inertia::location for external redirect
            $domain = $account->domains()->first();

            // Construct the tenant URL with proper protocol and port
            // In local dev: http://subdomain.localhost:8000
            // In production: https://subdomain.domain.com
            $tenantUrl = $this->getTenantUrl($domain->domain);

            // Use Inertia::location() for cross-domain redirects (forces full page visit)
            return Inertia::location($tenantUrl);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Re-throw validation exceptions so Inertia can handle them properly
            throw $e;
        } catch (UniqueConstraintViolationException $e) {
            \Log::error('Subdomain already exists', [
                'subdomain' => $validated['subdomain'] ?? 'unknown',
                'error' => $e->getMessage(),
            ]);

            return back()
                ->withErrors([
                    'subdomain' => 'This subdomain is already taken. Please choose another one.',
                ])
                ->withInput($request->except(['admin_password', 'admin_password_confirmation']));
        } catch (\PDOException $e) {
            \Log::error('Database error during tenant registration', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
            ]);

            return back()
                ->withErrors([
                    'general' => 'A database error occurred while creating your account. This may be due to invalid data or a system issue. Please verify your information and try again, or contact support if the problem persists.',
                ])
                ->withInput($request->except(['admin_password', 'admin_password_confirmation']));
        } catch (\Exception $e) {
            \Log::error('Tenant registration failed', [
                'error' => $e->getMessage(),
                'error_class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Provide a more helpful error message based on the exception type
            $errorMessage = 'An unexpected error occurred while creating your account. ';

            // Add context-specific information if available
            if (str_contains($e->getMessage(), 'email')) {
                $errorMessage .= 'There may be an issue with the email address provided. ';
            } elseif (str_contains($e->getMessage(), 'password')) {
                $errorMessage .= 'There may be an issue with the password provided. ';
            } elseif (str_contains($e->getMessage(), 'database') || str_contains($e->getMessage(), 'connection')) {
                $errorMessage .= 'There appears to be a database connectivity issue. ';
            }

            $errorMessage .= 'Please try again or contact support if the problem persists. Error ID: ' . now()->format('YmdHis');

            return back()
                ->withErrors([
                    'general' => $errorMessage,
                ])
                ->withInput($request->except(['admin_password', 'admin_password_confirmation']));
        }
    }
}
