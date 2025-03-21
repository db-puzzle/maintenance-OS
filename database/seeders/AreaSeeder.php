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

        Area::create([
            'name' => 'Produção',
            'plant_id' => $plant->id,
        ]);

        Area::create([
            'name' => 'Manutenção',
            'plant_id' => $plant->id,
        ]);

        Area::create([
            'name' => 'Utilidades',
            'plant_id' => $plant->id,
        ]);
    }
} 