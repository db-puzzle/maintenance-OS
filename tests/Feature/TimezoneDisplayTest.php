<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('displays user timezone in profile page', function () {
    $timezone = 'America/New_York';
    $user = User::factory()->create([
        'timezone' => $timezone,
    ]);

    $response = $this->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('settings/profile')
                ->where('auth.user.timezone', $timezone)
        );
});

it('displays user timezone in shared auth data', function () {
    $timezone = 'Europe/London';
    $user = User::factory()->create([
        'timezone' => $timezone,
    ]);

    $response = $this->actingAs($user)
        ->get('/'); // Any page will have the shared auth data

    $response->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->where('auth.user.timezone', $timezone)
        );
});

it('displays UTC as default timezone', function () {
    $user = User::factory()->create([
        'timezone' => 'UTC',
    ]);

    $response = $this->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('settings/profile')
                ->where('auth.user.timezone', 'UTC')
        );
});
