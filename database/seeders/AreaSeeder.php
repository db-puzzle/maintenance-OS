<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Plant;
use Illuminate\Database\Seeder;

class AreaSeeder extends Seeder
{
    public function run(): void
    {
        $plant = Plant::first();

        if (!$plant) {
            throw new \Exception('Planta não encontrada. Execute o PlantSeeder primeiro.');
        }

        // Áreas para a primeira planta
        Area::create([
            'name' => 'Produção',
            'plant_id' => $plant->id
        ]);

        Area::create([
            'name' => 'Manutenção',
            'plant_id' => $plant->id
        ]);

        Area::create([
            'name' => 'Utilidades',
            'plant_id' => $plant->id
        ]);

        Area::create([
            'name' => 'Qualidade',
            'plant_id' => $plant->id
        ]);

        Area::create([
            'name' => 'Logística',
            'plant_id' => $plant->id
        ]);

        // Cria uma segunda planta com áreas
        $plant2 = Plant::create([
            'name' => 'Planta 2',
            'street' => 'Rua das Flores',
            'number' => '123',
            'city' => 'São Paulo',
            'state' => 'SP',
            'zip_code' => '01234-567',
            'gps_coordinates' => '-23.550520,-46.633308'
        ]);

        Area::create([
            'name' => 'Produção 2',
            'plant_id' => $plant2->id
        ]);

        Area::create([
            'name' => 'Manutenção 2',
            'plant_id' => $plant2->id
        ]);

        // Cria uma terceira planta vazia (para testes de deleção)
        Plant::create([
            'name' => 'Planta 3',
            'street' => 'Rua das Palmeiras',
            'number' => '456',
            'city' => 'Rio de Janeiro',
            'state' => 'RJ',
            'zip_code' => '98765-432',
            'gps_coordinates' => '-22.906847,-43.172897'
        ]);
    }
} 