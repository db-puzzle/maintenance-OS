<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Sector;
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
            'description' => 'Linha de produção principal',
            'area_id' => $areaProducao->id
        ]);

        Sector::create([
            'name' => 'Linha 2',
            'description' => 'Linha de produção secundária',
            'area_id' => $areaProducao->id
        ]);

        // Setores para a área de Manutenção
        $areaManutencao = $areas->where('name', 'Manutenção')->first();
        Sector::create([
            'name' => 'Mecânica',
            'description' => 'Setor de manutenção mecânica',
            'area_id' => $areaManutencao->id
        ]);

        Sector::create([
            'name' => 'Elétrica',
            'description' => 'Setor de manutenção elétrica',
            'area_id' => $areaManutencao->id
        ]);

        // Setores para a área de Utilidades
        $areaUtilidades = $areas->where('name', 'Utilidades')->first();
        Sector::create([
            'name' => 'Ar Comprimido',
            'description' => 'Setor de ar comprimido',
            'area_id' => $areaUtilidades->id
        ]);

        Sector::create([
            'name' => 'Vapor',
            'description' => 'Setor de geração de vapor',
            'area_id' => $areaUtilidades->id
        ]);

        // Setores para a área de Qualidade
        $areaQualidade = $areas->where('name', 'Qualidade')->first();
        Sector::create([
            'name' => 'Controle',
            'description' => 'Setor de controle de qualidade',
            'area_id' => $areaQualidade->id
        ]);

        // Setores para a área de Logística
        $areaLogistica = $areas->where('name', 'Logística')->first();
        Sector::create([
            'name' => 'Armazenamento',
            'description' => 'Setor de armazenamento',
            'area_id' => $areaLogistica->id
        ]);

        // Setores para a área de Produção 2
        $areaProducao2 = $areas->where('name', 'Produção 2')->first();
        Sector::create([
            'name' => 'Linha 3',
            'description' => 'Linha de produção da planta 2',
            'area_id' => $areaProducao2->id
        ]);

        // Deixa a área de Manutenção 2 vazia para testes de deleção
    }
} 