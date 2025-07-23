<?php

namespace Database\Factories;

use App\Models\Skill;
use Illuminate\Database\Eloquent\Factories\Factory;

class SkillFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Skill::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = [
            'Técnica',
            'Elétrica',
            'Mecânica',
            'Instrumentação',
            'Segurança',
            'Qualidade',
            'Gestão',
            'Informática',
            'Idiomas',
            'Outras',
        ];

        $skills = [
            'Técnica' => ['Soldagem MIG/MAG', 'Soldagem TIG', 'Usinagem CNC', 'Tornearia', 'Fresagem'],
            'Elétrica' => ['Instalações Elétricas', 'Comandos Elétricos', 'CLP', 'Inversores de Frequência', 'Soft Starter'],
            'Mecânica' => ['Manutenção Preventiva', 'Análise de Vibração', 'Alinhamento de Eixos', 'Balanceamento', 'Lubrificação Industrial'],
            'Instrumentação' => ['Calibração', 'Instrumentação Industrial', 'Controle de Processos', 'Sensores', 'Transmissores'],
            'Segurança' => ['NR-10', 'NR-12', 'NR-35', 'Primeiros Socorros', 'Combate a Incêndio'],
            'Qualidade' => ['ISO 9001', 'Controle de Qualidade', 'Metrologia', 'Inspeção Visual', 'Ensaios Não Destrutivos'],
            'Gestão' => ['Gestão de Equipes', 'Planejamento', 'Gestão de Projetos', 'Liderança', 'Comunicação'],
            'Informática' => ['Excel Avançado', 'AutoCAD', 'SolidWorks', 'SAP PM', 'Power BI'],
            'Idiomas' => ['Inglês Técnico', 'Espanhol', 'Alemão', 'Japonês', 'Mandarim'],
            'Outras' => ['Operação de Empilhadeira', 'Operação de Ponte Rolante', 'Direção Defensiva', 'Trabalho em Equipe', 'Resolução de Problemas'],
        ];

        $category = $this->faker->randomElement($categories);
        $skillName = $this->faker->randomElement($skills[$category]);

        return [
            'name' => $skillName,
            'description' => $this->faker->optional(0.8)->sentence(),
            'category' => $category,
        ];
    }

    /**
     * Indicate that the skill has a specific category.
     */
    public function category(string $category): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => $category,
        ]);
    }
}