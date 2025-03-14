<?php

namespace Database\Seeders;

use App\Models\Factory;
use Illuminate\Database\Seeder;

class FactorySeeder extends Seeder
{
    public function run(): void
    {
        Factory::create([
            'name' => 'Fábrica São Paulo',
            'street' => 'Avenida Paulista',
            'number' => '1000',
            'city' => 'São Paulo',
            'state' => 'SP',
            'zip_code' => '01310-100',
            'gps_coordinates' => '-23.5505, -46.6333'
        ]);

        Factory::create([
            'name' => 'Fábrica Rio de Janeiro',
            'street' => 'Avenida Rio Branco',
            'number' => '500',
            'city' => 'Rio de Janeiro',
            'state' => 'RJ',
            'zip_code' => '20040-002',
            'gps_coordinates' => '-22.9068, -43.1729'
        ]);

        Factory::create([
            'name' => 'Fábrica Belo Horizonte',
            'street' => 'Avenida Afonso Pena',
            'number' => '2000',
            'city' => 'Belo Horizonte',
            'state' => 'MG',
            'zip_code' => '30130-007',
            'gps_coordinates' => '-19.9167, -43.9345'
        ]);

        Factory::create([
            'name' => 'Fábrica Curitiba',
            'street' => 'Rua XV de Novembro',
            'number' => '800',
            'city' => 'Curitiba',
            'state' => 'PR',
            'zip_code' => '80020-010',
            'gps_coordinates' => '-25.4284, -49.2733'
        ]);
    }
} 