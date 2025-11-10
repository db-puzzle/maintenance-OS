<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AdminLoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin authenticated session controller.
 *
 * Handles authentication for system administrators accessing the admin portal.
 * Uses the 'admin' guard which authenticates against admin_users in the central database.
 */
class AdminAuthenticatedSessionController extends Controller
{
    /**
     * Show the admin login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => false, // Admin password resets handled separately
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming admin authentication request.
     */
    public function store(AdminLoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Redirect to admin dashboard
        return redirect()->intended(route('admin.dashboard', absolute: false));
    }

    /**
     * Destroy an admin authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Use the admin guard for logout
        Auth::guard('admin')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Redirect to admin login page
        return redirect()->route('admin.login');
    }
}
