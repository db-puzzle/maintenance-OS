<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Sector;
use Illuminate\Database\Seeder;

class SectorSeeder extends Seeder
{
    public function run(): void
    {
        // Obtém a primeira área
        $area = Area::first();

        if (!$area) {
            throw new \Exception('Área não encontrada. Execute o AreaSeeder primeiro.');
        }

        // Cria alguns setores de exemplo
        Sector::create([
            'name' => 'Produção',
            'description' => 'Setor de produção principal',
            'area_id' => $area->id
        ]);

        Sector::create([
            'name' => 'Manutenção',
            'description' => 'Setor de manutenção de equipamentos',
            'area_id' => $area->id
        ]);

        Sector::create([
            'name' => 'Utilidades',
            'description' => 'Setor de utilidades e serviços auxiliares',
            'area_id' => $area->id
        ]);
    }
} 