<?php

namespace Database\Seeders;

use App\Models\Machine;
use App\Models\MachineType;
use App\Models\Area;
use Illuminate\Database\Seeder;

class MachineSeeder extends Seeder
{
    public function run(): void
    {
        // Obtém os tipos de máquina
        $bombType = MachineType::where('name', 'Bomba')->first();
        $motorType = MachineType::where('name', 'Motor Elétrico')->first();
        $valveType = MachineType::where('name', 'Válvula')->first();

        // Obtém a primeira área
        $area = Area::first();

        if (!$bombType || !$motorType || !$valveType || !$area) {
            throw new \Exception('Tipos de máquina ou área não encontrados. Execute o MachineTypeSeeder primeiro.');
        }

        // Cria algumas máquinas de exemplo
        Machine::create([
            'tag' => 'BOMB001',
            'machine_type_id' => $bombType->id,
            'description' => 'Bomba centrífuga de alta pressão',
            'nickname' => 'Bomba Principal',
            'manufacturer' => 'WEG',
            'manufacturing_year' => 2020,
            'area_id' => $area->id
        ]);

        Machine::create([
            'tag' => 'MOTR002',
            'machine_type_id' => $motorType->id,
            'description' => 'Motor elétrico trifásico',
            'nickname' => 'Motor Auxiliar',
            'manufacturer' => 'ABB',
            'manufacturing_year' => 2021,
            'area_id' => $area->id
        ]);

        Machine::create([
            'tag' => 'VALV003',
            'machine_type_id' => $valveType->id,
            'description' => 'Válvula de controle pneumática',
            'nickname' => 'Válvula de Processo',
            'manufacturer' => 'Emerson',
            'manufacturing_year' => 2019,
            'area_id' => $area->id
        ]);
    }
} 