<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Team;
use App\Models\User;

class TeamSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $teams = [
            [
                'name' => 'Equipe Mecânica',
                'description' => 'Equipe responsável por manutenções mecânicas em bombas, motores e equipamentos rotativos',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Elétrica',
                'description' => 'Equipe responsável por manutenções elétricas, painéis e sistemas de controle',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Instrumentação',
                'description' => 'Equipe responsável por calibração e manutenção de instrumentos de medição',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Utilidades',
                'description' => 'Equipe responsável por sistemas de ar comprimido, vapor e água',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Emergência',
                'description' => 'Equipe de resposta rápida para emergências e paradas não programadas',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Predial',
                'description' => 'Equipe responsável por manutenção predial e infraestrutura',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Soldagem',
                'description' => 'Equipe especializada em soldagem e caldeiraria',
                'is_active' => true,
            ],
            [
                'name' => 'Equipe Automação',
                'description' => 'Equipe responsável por sistemas automatizados e PLCs',
                'is_active' => true,
            ],
        ];

        foreach ($teams as $teamData) {
            $team = Team::create($teamData);
            
            // Optionally assign some users to teams if they exist
            // This is just an example - adjust based on your needs
            $technicians = User::whereHas('roles', function ($query) {
                $query->where('name', 'Technician');
            })->take(3)->get();
            
            if ($technicians->count() > 0) {
                $team->users()->attach($technicians->pluck('id'));
            }
        }
    }
}
