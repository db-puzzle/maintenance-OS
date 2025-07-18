<?php

namespace Database\Factories\WorkOrders;

use App\Models\WorkOrders\WorkOrderCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkOrders\WorkOrderCategory>
 */
class WorkOrderCategoryFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = WorkOrderCategory::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $disciplines = ['maintenance', 'quality'];
        $discipline = $this->faker->randomElement($disciplines);
        
        $categoryCodes = $discipline === 'maintenance' 
            ? ['preventive', 'corrective', 'inspection', 'project']
            : ['calibration', 'quality_control', 'quality_audit', 'non_conformance'];
            
        $code = $this->faker->unique()->randomElement($categoryCodes);
        
        $names = [
            'preventive' => 'Manutenção Preventiva',
            'corrective' => 'Manutenção Corretiva',
            'inspection' => 'Inspeção',
            'project' => 'Projeto',
            'calibration' => 'Calibração',
            'quality_control' => 'Controle de Qualidade',
            'quality_audit' => 'Auditoria de Qualidade',
            'non_conformance' => 'Não Conformidade',
        ];
        
        $colors = [
            'preventive' => '#10B981',
            'corrective' => '#EF4444',
            'inspection' => '#3B82F6',
            'project' => '#8B5CF6',
            'calibration' => '#F59E0B',
            'quality_control' => '#10B981',
            'quality_audit' => '#6366F1',
            'non_conformance' => '#DC2626',
        ];
        
        $icons = [
            'preventive' => 'shield-check',
            'corrective' => 'wrench',
            'inspection' => 'search',
            'project' => 'briefcase',
            'calibration' => 'gauge',
            'quality_control' => 'check-circle',
            'quality_audit' => 'clipboard-check',
            'non_conformance' => 'alert-triangle',
        ];
        
        return [
            'discipline' => $discipline,
            'name' => $names[$code] ?? $this->faker->words(2, true),
            'code' => $code,
            'description' => $this->faker->sentence(),
            'color' => $colors[$code] ?? $this->faker->hexColor(),
            'icon' => $icons[$code] ?? $this->faker->randomElement(['cog', 'tool', 'settings']),
            'display_order' => $this->faker->numberBetween(1, 10),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the category is for maintenance.
     */
    public function maintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'discipline' => 'maintenance',
        ]);
    }

    /**
     * Indicate that the category is for quality.
     */
    public function quality(): static
    {
        return $this->state(fn (array $attributes) => [
            'discipline' => 'quality',
        ]);
    }

    /**
     * Indicate that the category is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
