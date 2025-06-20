<?php

namespace Database\Seeders;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Sector;
use Illuminate\Database\Seeder;

class SectorSeeder extends Seeder
{
    public function run(): void
    {
        // Obtém as áreas
        $areas = Area::all();

        if ($areas->isEmpty()) {
            throw new \Exception('Áreas não encontradas. Execute o AreaSeeder primeiro.');
        }

        // Setores para a área de Produção
        $areaProducao = $areas->where('name', 'Produção')->first();
        Sector::create([
            'name' => 'Linha 1',
            'area_id' => $areaProducao->id,
        ]);

        Sector::create([
            'name' => 'Linha 2',
            'area_id' => $areaProducao->id,
        ]);

        // Setores para a área de Manutenção
        $areaManutencao = $areas->where('name', 'Manutenção')->first();
        Sector::create([
            'name' => 'Mecânica',
            'area_id' => $areaManutencao->id,
        ]);

        Sector::create([
            'name' => 'Elétrica',
            'area_id' => $areaManutencao->id,
        ]);

        // Setores para a área de Utilidades
        $areaUtilidades = $areas->where('name', 'Utilidades')->first();
        Sector::create([
            'name' => 'Ar Comprimido',
            'area_id' => $areaUtilidades->id,
        ]);

        Sector::create([
            'name' => 'Vapor',
            'area_id' => $areaUtilidades->id,
        ]);

        // Setores para a área de Qualidade
        $areaQualidade = $areas->where('name', 'Qualidade')->first();
        Sector::create([
            'name' => 'Controle',
            'area_id' => $areaQualidade->id,
        ]);

        // Setores para a área de Logística
        $areaLogistica = $areas->where('name', 'Logística')->first();
        Sector::create([
            'name' => 'Armazenamento',
            'area_id' => $areaLogistica->id,
        ]);

        // Setores para a área de Produção 2
        $areaProducao2 = $areas->where('name', 'Produção 2')->first();
        Sector::create([
            'name' => 'Linha 3',
            'area_id' => $areaProducao2->id,
        ]);

        // Deixa a área de Manutenção 2 vazia para testes de deleção
    }
}
