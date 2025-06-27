<?php

namespace Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class ModelTestCase extends TestCase
{
    use RefreshDatabase;

    /**
     * Indicates whether the default seeder should run before each test.
     *
     * @var bool
     */
    protected $seed = false;

    /**
     * Indicates if observers should be disabled during the test.
     * For unit tests, we disable observers to avoid issues with audit logging
     * when there's no authenticated user.
     *
     * @var bool
     */
    protected $withoutObservers = true;

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // For model unit tests, we don't need user/permission setup
        // Override the parent behavior
    }

    /**
     * Override to prevent system admin creation for unit tests
     */
    protected function ensureSystemAdminExists(): void
    {
        // Do nothing - unit tests don't need system admin
    }
} 