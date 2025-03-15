<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Factory;
use Illuminate\Database\Seeder;

class AreaSeeder extends Seeder
{
    public function run(): void
    {
        $factory = Factory::first();

        if (!$factory) {
            throw new \Exception('Fábrica não encontrada. Execute o FactorySeeder primeiro.');
        }

        Area::create([
            'name' => 'Produção',
            'factory_id' => $factory->id,
        ]);

        Area::create([
            'name' => 'Manutenção',
            'factory_id' => $factory->id,
        ]);

        Area::create([
            'name' => 'Utilidades',
            'factory_id' => $factory->id,
        ]);
    }
} 