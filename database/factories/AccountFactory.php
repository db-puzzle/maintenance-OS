<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Account>
 */
class AccountFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Account::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $companyName = $this->faker->company();
        $subdomain = strtolower(str_replace([' ', '.', ',', '-'], '', $companyName)) . $this->faker->unique()->numberBetween(1, 9999);

        return [
            'name' => $companyName,
            'subdomain' => $subdomain,
            'status' => 'active',
            'trial_ends_at' => now()->addDays(30),
            'suspension_reason' => null,
            'suspended_at' => null,
            'metadata' => [
                'admin_email' => $this->faker->companyEmail(),
                'admin_name' => $this->faker->name(),
                'created_via' => 'factory',
            ],
        ];
    }

    /**
     * Indicate that the account is suspended.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'suspended',
            'suspension_reason' => $this->faker->sentence(),
            'suspended_at' => now(),
        ]);
    }

    /**
     * Indicate that the account is in maintenance mode.
     */
    public function maintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'maintenance',
        ]);
    }

    /**
     * Indicate that the account has expired trial.
     */
    public function expiredTrial(): static
    {
        return $this->state(fn (array $attributes) => [
            'trial_ends_at' => now()->subDays(5),
        ]);
    }

    /**
     * Configure model to skip database creation.
     * Useful for testing admin portal without creating actual tenant databases.
     */
    public function withoutDatabase(): static
    {
        return $this->afterCreating(function () {
            // Skip database creation by not doing anything
            // The Account model's booted() method creates domains
            // but database creation is handled by events which we can fake
        });
    }
}
