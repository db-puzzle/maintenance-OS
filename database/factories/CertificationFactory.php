<?php

namespace Database\Factories;

use App\Models\Certification;
use Illuminate\Database\Eloquent\Factories\Factory;

class CertificationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Certification::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $certifications = [
            [
                'name' => 'NR-10 - Segurança em Instalações e Serviços em Eletricidade',
                'issuing_organization' => 'SENAI',
                'validity_period_days' => 730, // 2 years
            ],
            [
                'name' => 'NR-12 - Segurança no Trabalho em Máquinas e Equipamentos',
                'issuing_organization' => 'SENAI',
                'validity_period_days' => 365, // 1 year
            ],
            [
                'name' => 'NR-35 - Trabalho em Altura',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 730, // 2 years
            ],
            [
                'name' => 'ISO 9001:2015 - Auditor Interno',
                'issuing_organization' => 'Bureau Veritas',
                'validity_period_days' => 1095, // 3 years
            ],
            [
                'name' => 'Six Sigma Green Belt',
                'issuing_organization' => 'ASQ',
                'validity_period_days' => null, // No expiration
            ],
            [
                'name' => 'Certified Maintenance & Reliability Professional (CMRP)',
                'issuing_organization' => 'SMRP',
                'validity_period_days' => 1095, // 3 years
            ],
            [
                'name' => 'Operador de Empilhadeira',
                'issuing_organization' => 'SENAI',
                'validity_period_days' => 1825, // 5 years
            ],
            [
                'name' => 'Análise de Vibração - Nível I',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 1460, // 4 years
            ],
            [
                'name' => 'Termografia - Nível I',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 1460, // 4 years
            ],
            [
                'name' => 'Inspetor de Soldagem - Nível 1',
                'issuing_organization' => 'FBTS',
                'validity_period_days' => 1825, // 5 years
            ],
        ];

        $certification = $this->faker->randomElement($certifications);

        return [
            'name' => $certification['name'],
            'description' => $this->faker->optional(0.7)->sentence(),
            'issuing_organization' => $certification['issuing_organization'],
            'validity_period_days' => $certification['validity_period_days'],
            'active' => $this->faker->boolean(95), // 95% chance of being active
        ];
    }

    /**
     * Indicate that the certification is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }

    /**
     * Indicate that the certification is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => true,
        ]);
    }

    /**
     * Indicate that the certification has no expiration.
     */
    public function noExpiration(): static
    {
        return $this->state(fn (array $attributes) => [
            'validity_period_days' => null,
        ]);
    }

    /**
     * Indicate that the certification expires in a specific number of days.
     */
    public function expiresInDays(int $days): static
    {
        return $this->state(fn (array $attributes) => [
            'validity_period_days' => $days,
        ]);
    }
}