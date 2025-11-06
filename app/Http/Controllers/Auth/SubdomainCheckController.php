<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\Request;

/**
 * SubdomainCheckController.
 *
 * Handles subdomain availability checking for tenant registration.
 * Returns Inertia responses with flash data containing availability status.
 */
class SubdomainCheckController extends Controller
{
    /**
     * List of reserved subdomains that cannot be registered.
     *
     * @var array<string>
     */
    protected array $reservedSubdomains = [
        'admin',
        'api',
        'app',
        'www',
        'mail',
        'ftp',
        'localhost',
        'staging',
        'dev',
        'test',
        'demo',
        'support',
        'help',
        'docs',
        'blog',
        'cdn',
        'static',
        'assets',
        'media',
        'files',
        'download',
        'uploads',
    ];

    /**
     * Check subdomain availability.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function check(Request $request)
    {
        // Validate subdomain format
        $validated = $request->validate([
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:63',
                'regex:/^[a-z0-9-]+$/',
                'not_regex:/^-|-$/',
                'not_regex:/--/',
            ],
        ], [
            'subdomain.required' => 'Please enter a subdomain',
            'subdomain.min' => 'Subdomain must be at least 3 characters',
            'subdomain.max' => 'Subdomain cannot exceed 63 characters',
            'subdomain.regex' => 'Only lowercase letters, numbers, and hyphens allowed',
            'subdomain.not_regex' => 'Cannot start/end with hyphen or have consecutive hyphens',
        ]);

        $subdomain = $validated['subdomain'];

        // Log the check attempt
        \Log::info('🔍 Subdomain availability check', [
            'subdomain' => $subdomain,
            'ip' => $request->ip(),
        ]);

        // Check if reserved
        if ($this->isReserved($subdomain)) {
            \Log::info('⛔ Subdomain is reserved', ['subdomain' => $subdomain]);

            return back()->with([
                'subdomainCheck' => [
                    'available' => false,
                    'message' => 'This subdomain is reserved and cannot be used',
                    'subdomain' => $subdomain,
                ],
            ]);
        }

        // Check if available in database
        $available = $this->isAvailable($subdomain);

        \Log::info($available ? '✅ Subdomain is available' : '❌ Subdomain is taken', [
            'subdomain' => $subdomain,
        ]);

        return back()->with([
            'subdomainCheck' => [
                'available' => $available,
                'message' => $available
                    ? 'This subdomain is available!'
                    : 'This subdomain is already taken',
                'subdomain' => $subdomain,
            ],
        ]);
    }

    /**
     * Check if subdomain is available in the database.
     */
    protected function isAvailable(string $subdomain): bool
    {
        return ! Account::on('central')
            ->where('subdomain', $subdomain)
            ->exists();
    }

    /**
     * Check if subdomain is in the reserved list.
     */
    protected function isReserved(string $subdomain): bool
    {
        return in_array(strtolower($subdomain), $this->reservedSubdomains);
    }
}
