<?php

namespace Database\Seeders;

use App\Models\AssetHierarchy\Plant;
use Illuminate\Database\Seeder;

class PlantSeeder extends Seeder
{
    public function run(): void
    {
        Plant::create([
            'name' => 'Superior Rafard',
            'street' => 'Rua João Squilassi',
            'number' => '286',
            'city' => 'Rafard',
            'state' => 'SP',
            'zip_code' => '13370-000',
            'gps_coordinates' => '-23.0322775,-47.5378189'
        ]);

        Plant::create([
            'name' => 'Superior Itapira',
            'street' => 'Rua Mauro Simões',
            'number' => '500',
            'city' => 'Itapira',
            'state' => 'SP',
            'zip_code' => '13971-088',
            'gps_coordinates' => '-22.4189712,-46.8253333'
        ]);

        Plant::create([
            'name' => 'Superior São Luis',
            'street' => 'Av. Eng. Emiliano Macieira',
            'number' => '15',
            'city' => 'São Luís',
            'state' => 'MA',
            'zip_code' => '65095-602',
            'gps_coordinates' => '-2.5299999,-44.2813889'
        ]);

        Plant::create([
            'name' => 'Sueprior Parauapebas',
            'street' => 'Av. Presidente Prudente, S/N, Lote 1,3,5,7',
            'number' => '',
            'city' => 'Parauapebas',
            'state' => 'PA',
            'zip_code' => '68515-000',
            'gps_coordinates' => '-6.0886386,-49.8766676'
        ]);
    }
} 