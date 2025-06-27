<?php

namespace Database\Factories\Forms;

use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Forms\FormVersion>
 */
class FormVersionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = FormVersion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'form_id' => Form::factory(),
            'version_number' => 1,
            'published_at' => now(),
            'published_by' => User::factory(),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the form version is published.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'published_at' => now(),
            'published_by' => User::factory(),
            'is_active' => true,
        ]);
    }

    /**
     * Indicate that the form version is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Set a specific version number.
     */
    public function version(int $number): static
    {
        return $this->state(fn (array $attributes) => [
            'version_number' => $number,
        ]);
    }
} 