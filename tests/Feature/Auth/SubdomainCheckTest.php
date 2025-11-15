<?php

use App\Models\Account;

use function Pest\Laravel\post;

/*
 * Subdomain availability checking tests
 */
beforeEach(function () {
    // Switch to central database for tenant management
    $this->app['config']->set('database.default', 'central');
});

it('returns available for non-existent subdomain', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => 'testcompany',
    ]);

    $response->assertSessionHas('subdomainCheck');
    expect(session('subdomainCheck'))->toMatchArray([
        'available' => true,
        'subdomain' => 'testcompany',
    ]);
});

it('returns unavailable for existing subdomain', function () {
    // Create an existing account
    Account::factory()->create(['subdomain' => 'existingcompany']);

    $response = post(route('subdomain.check'), [
        'subdomain' => 'existingcompany',
    ]);

    $response->assertSessionHas('subdomainCheck');
    expect(session('subdomainCheck'))->toMatchArray([
        'available' => false,
        'subdomain' => 'existingcompany',
    ]);
});

it('returns unavailable for reserved subdomain', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => 'admin',
    ]);

    $response->assertSessionHas('subdomainCheck');
    expect(session('subdomainCheck'))->toMatchArray([
        'available' => false,
        'subdomain' => 'admin',
    ]);
});

it('validates subdomain format', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => 'AB',
    ]);

    $response->assertSessionHasErrors('subdomain');
});

it('rejects subdomain with invalid characters', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => 'test_company',
    ]);

    $response->assertSessionHasErrors('subdomain');
});

it('rejects subdomain that is too long', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => str_repeat('a', 64),
    ]);

    $response->assertSessionHasErrors('subdomain');
});

it('rejects subdomain starting with hyphen', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => '-testcompany',
    ]);

    $response->assertSessionHasErrors('subdomain');
});

it('rejects subdomain ending with hyphen', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => 'testcompany-',
    ]);

    $response->assertSessionHasErrors('subdomain');
});

it('rejects subdomain with consecutive hyphens', function () {
    $response = post(route('subdomain.check'), [
        'subdomain' => 'test--company',
    ]);

    $response->assertSessionHasErrors('subdomain');
});

it('rate limits excessive requests', function () {
    // Make 11 requests (limit is 10 per minute)
    for ($i = 0; $i < 11; $i++) {
        $response = post(route('subdomain.check'), [
            'subdomain' => "test{$i}",
        ]);
    }

    // The 11th request should be rate limited
    $response->assertStatus(429);
});

