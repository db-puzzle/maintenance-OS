<?php

namespace App\Http\Middleware;

use App\Services\FeatureService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        // Get enabled features for the current tenant
        $features = $this->getEnabledFeatures();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'features' => $features,
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'timezone' => $request->user()->timezone ?? null,
                    'roles' => method_exists($request->user(), 'getRoleNames')
                        ? $request->user()->roles->map(function ($role) {
                            return ['id' => $role->id, 'name' => $role->name];
                        })
                        : [],
                ] : null,
                'permissions' => $request->user() && method_exists($request->user(), 'getAllEffectivePermissions')
                    ? $request->user()->getAllEffectivePermissions()->pluck('name')
                    : [],
                'roles' => $request->user() && method_exists($request->user(), 'getRoleNames')
                    ? $request->user()->getRoleNames()
                    : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
                'newWorkCellId' => fn () => $request->session()->get('newWorkCellId'),
                'workCell' => fn () => $request->session()->get('workCell'),
                'result' => fn () => $request->session()->get('flash.result'),
                'validation' => fn () => $request->session()->get('validation'),
                'showValidationModal' => fn () => $request->session()->get('showValidationModal', false),
                'schedulingJob' => fn () => $request->session()->get('schedulingJob'),
            ],
            'subdomainCheck' => fn () => $request->session()->get('subdomainCheck'),
            'schedulingConfig' => fn () => [
                'locked_schedules_enabled' => config('scheduling.respect_locked_schedules', true),
                'max_scheduling_days' => config('scheduling.max_days_ahead', 90),
                'websocket_enabled' => config('broadcasting.default') !== null,
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
        ];
    }

    /**
     * Get enabled features for the current tenant.
     *
     * @return array<string, bool>
     */
    protected function getEnabledFeatures(): array
    {
        try {
            $featureService = app(FeatureService::class);
            $enabledFeatureKeys = $featureService->getEnabledFeatures();

            // Convert array of keys to associative array with true values
            $features = [];
            foreach ($enabledFeatureKeys as $key) {
                $features[$key] = true;
            }

            return $features;
        } catch (\Exception $e) {
            // If there's an error (e.g., tables don't exist yet), return empty array
            return [];
        }
    }
}
