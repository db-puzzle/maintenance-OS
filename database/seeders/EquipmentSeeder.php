<?php

namespace Database\Seeders;

use App\Models\Equipment;
use App\Models\EquipmentType;
use App\Models\Sector;
use App\Models\Area;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    public function run(): void
    {
        // Obtém os tipos de equipamento
        $bombType = EquipmentType::where('name', 'Bomba')->first();
        $motorType = EquipmentType::where('name', 'Motor Elétrico')->first();
        $valveType = EquipmentType::where('name', 'Válvula')->first();

        // Obtém a primeira área e o primeiro setor
        $area = Area::first();
        $sector = Sector::first();

        if (!$bombType || !$motorType || !$valveType || !$area || !$sector) {
            throw new \Exception('Tipos de equipamento, área ou setor não encontrados. Execute os seeders anteriores primeiro.');
        }

        // Cria alguns equipamentos de exemplo
        Equipment::create([
            'tag' => 'BOMB001',
            'serial_number' => 'SN-B001-2020',
            'equipment_type_id' => $bombType->id,
            'description' => 'Bomba centrífuga de alta pressão',
            'manufacturer' => 'WEG',
            'manufacturing_year' => 2020,
            'area_id' => $area->id,
            'sector_id' => $sector->id
        ]);

        Equipment::create([
            'tag' => 'MOTR002',
            'serial_number' => 'SN-M002-2021',
            'equipment_type_id' => $motorType->id,
            'description' => 'Motor elétrico trifásico',
            'manufacturer' => 'ABB',
            'manufacturing_year' => 2021,
            'area_id' => $area->id,
            'sector_id' => $sector->id
        ]);

        Equipment::create([
            'tag' => 'VALV003',
            'serial_number' => 'SN-V003-2019',
            'equipment_type_id' => $valveType->id,
            'description' => 'Válvula de controle pneumática',
            'manufacturer' => 'Emerson',
            'manufacturing_year' => 2019,
            'area_id' => $area->id,
            'sector_id' => $sector->id
        ]);
    }
} 