<?php

namespace App\Http\Middleware;

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

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'timezone' => $request->user()->timezone,
                    'roles' => $request->user()->roles->map(function ($role) {
                        return ['id' => $role->id, 'name' => $role->name];
                    }),
                ] : null,
                'permissions' => $request->user() ? $request->user()->getAllEffectivePermissions()->pluck('name') : [],
                'roles' => $request->user() ? $request->user()->getRoleNames() : [],
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
}
