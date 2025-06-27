<?php

namespace Database\Factories\Forms;

use App\Models\Forms\FormExecution;
use App\Models\Forms\FormVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Forms\FormExecution>
 */
class FormExecutionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = FormExecution::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'form_version_id' => FormVersion::factory(),
            'user_id' => User::factory(),
            'started_at' => now()->subHour(),
            'completed_at' => now(),
            'status' => 'completed',
        ];
    }

    /**
     * Indicate that the execution is in progress.
     */
    public function inProgress(): static
    {
        return $this->state(fn (array $attributes) => [
            'started_at' => now()->subMinutes(30),
            'completed_at' => null,
            'status' => 'in_progress',
        ]);
    }

    /**
     * Indicate that the execution is draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'started_at' => null,
            'completed_at' => null,
            'status' => 'draft',
        ]);
    }

    /**
     * Indicate that the execution was cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    /**
     * Indicate that the execution is for a specific form version.
     */
    public function forFormVersion(FormVersion $version): static
    {
        return $this->state(fn (array $attributes) => [
            'form_version_id' => $version->id,
        ]);
    }

    /**
     * Indicate that the execution was done by a specific user.
     */
    public function byUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
        ]);
    }
} 