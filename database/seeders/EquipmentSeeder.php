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
        $compressorType = EquipmentType::where('name', 'Compressor de Ar')->first();
        $tornoType = EquipmentType::where('name', 'Torno CNC')->first();
        $fresadoraType = EquipmentType::where('name', 'Fresadora')->first();
        $laserType = EquipmentType::where('name', 'Máquina de Corte a Laser')->first();
        $injetoraType = EquipmentType::where('name', 'Injetora de Plástico')->first();
        $empilhadeiraType = EquipmentType::where('name', 'Empilhadeira')->first();
        $servidorType = EquipmentType::where('name', 'Servidor')->first();
        $soldaType = EquipmentType::where('name', 'Máquina de Solda')->first();
        $geradorType = EquipmentType::where('name', 'Gerador')->first();
        $hvacType = EquipmentType::where('name', 'Sistema HVAC')->first();
        $elevadorType = EquipmentType::where('name', 'Elevador')->first();
        $esteiraType = EquipmentType::where('name', 'Esteira Transportadora')->first();

        // Obtém as áreas e setores
        $areas = Area::all();
        $sectors = Sector::all();

        if (!$bombType || !$motorType || !$valveType || $areas->isEmpty() || $sectors->isEmpty()) {
            throw new \Exception('Tipos de equipamento, áreas ou setores não encontrados. Execute os seeders anteriores primeiro.');
        }

        // Equipamentos com área e setor
        Equipment::create([
            'tag' => 'BOMB001',
            'serial_number' => 'SN-B001-2020',
            'equipment_type_id' => $bombType->id,
            'description' => 'Bomba centrífuga de alta pressão',
            'manufacturer' => 'WEG',
            'manufacturing_year' => 2020,
            'area_id' => $areas->where('name', 'Produção')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 1')->first()->id
        ]);

        Equipment::create([
            'tag' => 'MOTR002',
            'serial_number' => 'SN-M002-2021',
            'equipment_type_id' => $motorType->id,
            'description' => 'Motor elétrico trifásico',
            'manufacturer' => 'ABB',
            'manufacturing_year' => 2021,
            'area_id' => $areas->where('name', 'Manutenção')->first()->id,
            'sector_id' => $sectors->where('name', 'Mecânica')->first()->id
        ]);

        // Equipamentos apenas com área
        Equipment::create([
            'tag' => 'VALV003',
            'serial_number' => 'SN-V003-2019',
            'equipment_type_id' => $valveType->id,
            'description' => 'Válvula de controle pneumática',
            'manufacturer' => 'Emerson',
            'manufacturing_year' => 2019,
            'area_id' => $areas->where('name', 'Utilidades')->first()->id
        ]);

        Equipment::create([
            'tag' => 'BOMB004',
            'serial_number' => 'SN-B004-2022',
            'equipment_type_id' => $bombType->id,
            'description' => 'Bomba de água de resfriamento',
            'manufacturer' => 'KSB',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Utilidades')->first()->id
        ]);

        // Equipamentos para a planta 2
        Equipment::create([
            'tag' => 'MOTR005',
            'serial_number' => 'SN-M005-2023',
            'equipment_type_id' => $motorType->id,
            'description' => 'Motor de alta potência',
            'manufacturer' => 'Siemens',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Produção 2')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 3')->first()->id
        ]);

        // Equipamentos para área de qualidade
        Equipment::create([
            'tag' => 'VALV006',
            'serial_number' => 'SN-V006-2021',
            'equipment_type_id' => $valveType->id,
            'description' => 'Válvula de amostragem',
            'manufacturer' => 'Fisher',
            'manufacturing_year' => 2021,
            'area_id' => $areas->where('name', 'Qualidade')->first()->id
        ]);

        // Equipamentos para área de logística
        Equipment::create([
            'tag' => 'BOMB007',
            'serial_number' => 'SN-B007-2020',
            'equipment_type_id' => $bombType->id,
            'description' => 'Bomba de transferência',
            'manufacturer' => 'Grundfos',
            'manufacturing_year' => 2020,
            'area_id' => $areas->where('name', 'Logística')->first()->id
        ]);

        // Equipamento para área de manutenção 2 (vazia para testes)
        Equipment::create([
            'tag' => 'MOTR008',
            'serial_number' => 'SN-M008-2022',
            'equipment_type_id' => $motorType->id,
            'description' => 'Motor de reserva',
            'manufacturer' => 'WEG',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Manutenção 2')->first()->id
        ]);

        // Novos equipamentos
        Equipment::create([
            'tag' => 'COMP009',
            'serial_number' => 'SN-C009-2023',
            'equipment_type_id' => $compressorType->id,
            'description' => 'Compressor de ar industrial de alta pressão',
            'manufacturer' => 'Atlas Copco',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Utilidades')->first()->id,
            'sector_id' => $sectors->where('name', 'Ar Comprimido')->first()->id
        ]);

        Equipment::create([
            'tag' => 'TORN010',
            'serial_number' => 'SN-T010-2022',
            'equipment_type_id' => $tornoType->id,
            'description' => 'Torno CNC de alta precisão',
            'manufacturer' => 'DMG Mori',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Produção')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 1')->first()->id
        ]);

        Equipment::create([
            'tag' => 'FRES011',
            'serial_number' => 'SN-F011-2023',
            'equipment_type_id' => $fresadoraType->id,
            'description' => 'Fresadora CNC de 5 eixos',
            'manufacturer' => 'Haas',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Produção')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 2')->first()->id
        ]);

        Equipment::create([
            'tag' => 'LASR012',
            'serial_number' => 'SN-L012-2022',
            'equipment_type_id' => $laserType->id,
            'description' => 'Cortadora a laser de alta potência',
            'manufacturer' => 'Trumpf',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Produção 2')->first()->id
        ]);

        Equipment::create([
            'tag' => 'INJE013',
            'serial_number' => 'SN-I013-2023',
            'equipment_type_id' => $injetoraType->id,
            'description' => 'Injetora de plástico de grande porte',
            'manufacturer' => 'Arburg',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Produção 2')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 3')->first()->id
        ]);

        Equipment::create([
            'tag' => 'EMPI014',
            'serial_number' => 'SN-E014-2021',
            'equipment_type_id' => $empilhadeiraType->id,
            'description' => 'Empilhadeira elétrica',
            'manufacturer' => 'Toyota',
            'manufacturing_year' => 2021,
            'area_id' => $areas->where('name', 'Logística')->first()->id,
            'sector_id' => $sectors->where('name', 'Armazenamento')->first()->id
        ]);

        Equipment::create([
            'tag' => 'SERV015',
            'serial_number' => 'SN-S015-2023',
            'equipment_type_id' => $servidorType->id,
            'description' => 'Servidor de alta performance',
            'manufacturer' => 'Dell',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Qualidade')->first()->id
        ]);

        Equipment::create([
            'tag' => 'SOLD016',
            'serial_number' => 'SN-S016-2022',
            'equipment_type_id' => $soldaType->id,
            'description' => 'Máquina de solda MIG/MAG',
            'manufacturer' => 'Lincoln Electric',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Manutenção')->first()->id,
            'sector_id' => $sectors->where('name', 'Mecânica')->first()->id
        ]);

        Equipment::create([
            'tag' => 'GERA017',
            'serial_number' => 'SN-G017-2023',
            'equipment_type_id' => $geradorType->id,
            'description' => 'Gerador diesel de emergência',
            'manufacturer' => 'Cummins',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Utilidades')->first()->id
        ]);

        Equipment::create([
            'tag' => 'HVAC018',
            'serial_number' => 'SN-H018-2022',
            'equipment_type_id' => $hvacType->id,
            'description' => 'Sistema HVAC central',
            'manufacturer' => 'Trane',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Utilidades')->first()->id
        ]);

        Equipment::create([
            'tag' => 'ELEV019',
            'serial_number' => 'SN-E019-2023',
            'equipment_type_id' => $elevadorType->id,
            'description' => 'Elevador de carga industrial',
            'manufacturer' => 'Otis',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Logística')->first()->id
        ]);

        Equipment::create([
            'tag' => 'ESTE020',
            'serial_number' => 'SN-E020-2022',
            'equipment_type_id' => $esteiraType->id,
            'description' => 'Esteira transportadora de rolos',
            'manufacturer' => 'Interroll',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Produção')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 1')->first()->id
        ]);

        Equipment::create([
            'tag' => 'COMP021',
            'serial_number' => 'SN-C021-2023',
            'equipment_type_id' => $compressorType->id,
            'description' => 'Compressor de ar de baixa pressão',
            'manufacturer' => 'Ingersoll Rand',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Manutenção')->first()->id,
            'sector_id' => $sectors->where('name', 'Mecânica')->first()->id
        ]);

        Equipment::create([
            'tag' => 'TORN022',
            'serial_number' => 'SN-T022-2022',
            'equipment_type_id' => $tornoType->id,
            'description' => 'Torno CNC de pequeno porte',
            'manufacturer' => 'Okuma',
            'manufacturing_year' => 2022,
            'area_id' => $areas->where('name', 'Produção 2')->first()->id
        ]);

        Equipment::create([
            'tag' => 'FRES023',
            'serial_number' => 'SN-F023-2023',
            'equipment_type_id' => $fresadoraType->id,
            'description' => 'Fresadora CNC de 3 eixos',
            'manufacturer' => 'Mazak',
            'manufacturing_year' => 2023,
            'area_id' => $areas->where('name', 'Produção')->first()->id,
            'sector_id' => $sectors->where('name', 'Linha 2')->first()->id
        ]);
    }
} 