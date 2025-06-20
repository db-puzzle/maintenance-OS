<?php

namespace Database\Seeders;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetType;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use Illuminate\Database\Seeder;

class AssetSeeder extends Seeder
{
    public function run(): void
    {
        // Obtém os tipos de ativo
        $bombType = AssetType::where('name', 'Bomba')->first();
        $motorType = AssetType::where('name', 'Motor Elétrico')->first();
        $valveType = AssetType::where('name', 'Válvula')->first();
        $compressorType = AssetType::where('name', 'Compressor de Ar')->first();
        $tornoType = AssetType::where('name', 'Torno CNC')->first();
        $fresadoraType = AssetType::where('name', 'Fresadora')->first();
        $laserType = AssetType::where('name', 'Máquina de Corte a Laser')->first();
        $injetoraType = AssetType::where('name', 'Injetora de Plástico')->first();
        $empilhadeiraType = AssetType::where('name', 'Empilhadeira')->first();
        $servidorType = AssetType::where('name', 'Servidor')->first();
        $soldaType = AssetType::where('name', 'Máquina de Solda')->first();
        $geradorType = AssetType::where('name', 'Gerador')->first();
        $hvacType = AssetType::where('name', 'Sistema HVAC')->first();
        $elevadorType = AssetType::where('name', 'Elevador')->first();
        $esteiraType = AssetType::where('name', 'Esteira Transportadora')->first();

        // Obtém as plantas, áreas e setores
        $plants = Plant::all();
        $areas = Area::all();
        $sectors = Sector::all();

        if (! $bombType || ! $motorType || ! $valveType || $plants->isEmpty() || $areas->isEmpty() || $sectors->isEmpty()) {
            throw new \Exception('Tipos de ativo, plantas, áreas ou setores não encontrados. Execute os seeders anteriores primeiro.');
        }

        // Obtém a primeira planta como padrão
        $defaultPlant = $plants->first();
        $plant2 = $plants->where('name', 'Planta 2')->first();

        // Função auxiliar para validar área e setor
        $validateAreaAndSector = function ($area, $sector, $plant) {
            if ($area && $area->plant_id !== $plant->id) {
                throw new \Exception("A área {$area->name} não pertence à planta {$plant->name}");
            }
            if ($sector && $sector->area->plant_id !== $plant->id) {
                throw new \Exception("O setor {$sector->name} não pertence à planta {$plant->name}");
            }
        };

        // Ativos com área e setor
        $areaProducao = $areas->where('name', 'Produção')->first();
        $sectorLinha1 = $sectors->where('name', 'Linha 1')->first();
        $validateAreaAndSector($areaProducao, $sectorLinha1, $defaultPlant);
        Asset::create([
            'tag' => 'BOMB001',
            'serial_number' => 'SN-B001-2020',
            'asset_type_id' => $bombType->id,
            'description' => 'Bomba centrífuga de alta pressão',
            'manufacturer' => 'WEG',
            'manufacturing_year' => 2020,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaProducao->id,
            'sector_id' => $sectorLinha1->id,
        ]);

        $areaManutencao = $areas->where('name', 'Manutenção')->first();
        $sectorMecanica = $sectors->where('name', 'Mecânica')->first();
        $validateAreaAndSector($areaManutencao, $sectorMecanica, $defaultPlant);
        Asset::create([
            'tag' => 'MOTR002',
            'serial_number' => 'SN-M002-2021',
            'asset_type_id' => $motorType->id,
            'description' => 'Motor elétrico trifásico',
            'manufacturer' => 'ABB',
            'manufacturing_year' => 2021,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaManutencao->id,
            'sector_id' => $sectorMecanica->id,
        ]);

        // Ativos apenas com área
        $areaUtilidades = $areas->where('name', 'Utilidades')->first();
        $validateAreaAndSector($areaUtilidades, null, $defaultPlant);
        Asset::create([
            'tag' => 'VALV003',
            'serial_number' => 'SN-V003-2019',
            'asset_type_id' => $valveType->id,
            'description' => 'Válvula de controle pneumática',
            'manufacturer' => 'Emerson',
            'manufacturing_year' => 2019,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaUtilidades->id,
        ]);

        $validateAreaAndSector($areaUtilidades, null, $defaultPlant);
        Asset::create([
            'tag' => 'BOMB004',
            'serial_number' => 'SN-B004-2022',
            'asset_type_id' => $bombType->id,
            'description' => 'Bomba de água de resfriamento',
            'manufacturer' => 'KSB',
            'manufacturing_year' => 2022,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaUtilidades->id,
        ]);

        // Ativos para a planta 2
        $areaProducao2 = $areas->where('name', 'Produção 2')->first();
        $sectorLinha3 = $sectors->where('name', 'Linha 3')->first();
        $validateAreaAndSector($areaProducao2, $sectorLinha3, $plant2);
        Asset::create([
            'tag' => 'MOTR005',
            'serial_number' => 'SN-M005-2023',
            'asset_type_id' => $motorType->id,
            'description' => 'Motor de alta potência',
            'manufacturer' => 'Siemens',
            'manufacturing_year' => 2023,
            'plant_id' => $plant2->id,
            'area_id' => $areaProducao2->id,
            'sector_id' => $sectorLinha3->id,
        ]);

        // Ativos para área de qualidade
        $areaQualidade = $areas->where('name', 'Qualidade')->first();
        $validateAreaAndSector($areaQualidade, null, $defaultPlant);
        Asset::create([
            'tag' => 'VALV006',
            'serial_number' => 'SN-V006-2021',
            'asset_type_id' => $valveType->id,
            'description' => 'Válvula de amostragem',
            'manufacturer' => 'Fisher',
            'manufacturing_year' => 2021,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaQualidade->id,
        ]);

        // Ativos para área de logística
        $areaLogistica = $areas->where('name', 'Logística')->first();
        $validateAreaAndSector($areaLogistica, null, $defaultPlant);
        Asset::create([
            'tag' => 'BOMB007',
            'serial_number' => 'SN-B007-2020',
            'asset_type_id' => $bombType->id,
            'description' => 'Bomba de transferência',
            'manufacturer' => 'Grundfos',
            'manufacturing_year' => 2020,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaLogistica->id,
        ]);

        // Ativo para área de manutenção 2 (vazia para testes)
        $areaManutencao2 = $areas->where('name', 'Manutenção 2')->first();
        $validateAreaAndSector($areaManutencao2, null, $plant2);
        Asset::create([
            'tag' => 'MOTR008',
            'serial_number' => 'SN-M008-2022',
            'asset_type_id' => $motorType->id,
            'description' => 'Motor de reserva',
            'manufacturer' => 'WEG',
            'manufacturing_year' => 2022,
            'plant_id' => $plant2->id,
            'area_id' => $areaManutencao2->id,
        ]);

        // Novos ativos
        $sectorArComprimido = $sectors->where('name', 'Ar Comprimido')->first();
        $validateAreaAndSector($areaUtilidades, $sectorArComprimido, $defaultPlant);
        Asset::create([
            'tag' => 'COMP009',
            'serial_number' => 'SN-C009-2023',
            'asset_type_id' => $compressorType->id,
            'description' => 'Compressor de ar industrial de alta pressão',
            'manufacturer' => 'Atlas Copco',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaUtilidades->id,
            'sector_id' => $sectorArComprimido->id,
        ]);

        $validateAreaAndSector($areaProducao, $sectorLinha1, $defaultPlant);
        Asset::create([
            'tag' => 'TORN010',
            'serial_number' => 'SN-T010-2022',
            'asset_type_id' => $tornoType->id,
            'description' => 'Torno CNC de alta precisão',
            'manufacturer' => 'DMG Mori',
            'manufacturing_year' => 2022,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaProducao->id,
            'sector_id' => $sectorLinha1->id,
        ]);

        $sectorLinha2 = $sectors->where('name', 'Linha 2')->first();
        $validateAreaAndSector($areaProducao, $sectorLinha2, $defaultPlant);
        Asset::create([
            'tag' => 'FRES011',
            'serial_number' => 'SN-F011-2023',
            'asset_type_id' => $fresadoraType->id,
            'description' => 'Fresadora CNC de 5 eixos',
            'manufacturer' => 'Haas',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaProducao->id,
            'sector_id' => $sectorLinha2->id,
        ]);

        $validateAreaAndSector($areaProducao2, null, $plant2);
        Asset::create([
            'tag' => 'LASR012',
            'serial_number' => 'SN-L012-2022',
            'asset_type_id' => $laserType->id,
            'description' => 'Cortadora a laser de alta potência',
            'manufacturer' => 'Trumpf',
            'manufacturing_year' => 2022,
            'plant_id' => $plant2->id,
            'area_id' => $areaProducao2->id,
        ]);

        $validateAreaAndSector($areaProducao2, $sectorLinha3, $plant2);
        Asset::create([
            'tag' => 'INJE013',
            'serial_number' => 'SN-I013-2023',
            'asset_type_id' => $injetoraType->id,
            'description' => 'Injetora de plástico de grande porte',
            'manufacturer' => 'Arburg',
            'manufacturing_year' => 2023,
            'plant_id' => $plant2->id,
            'area_id' => $areaProducao2->id,
            'sector_id' => $sectorLinha3->id,
        ]);

        $sectorArmazenamento = $sectors->where('name', 'Armazenamento')->first();
        $validateAreaAndSector($areaLogistica, $sectorArmazenamento, $defaultPlant);
        Asset::create([
            'tag' => 'EMPI014',
            'serial_number' => 'SN-E014-2021',
            'asset_type_id' => $empilhadeiraType->id,
            'description' => 'Empilhadeira elétrica',
            'manufacturer' => 'Toyota',
            'manufacturing_year' => 2021,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaLogistica->id,
            'sector_id' => $sectorArmazenamento->id,
        ]);

        $validateAreaAndSector($areaQualidade, null, $defaultPlant);
        Asset::create([
            'tag' => 'SERV015',
            'serial_number' => 'SN-S015-2023',
            'asset_type_id' => $servidorType->id,
            'description' => 'Servidor de alta performance',
            'manufacturer' => 'Dell',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaQualidade->id,
        ]);

        $validateAreaAndSector($areaManutencao, $sectorMecanica, $defaultPlant);
        Asset::create([
            'tag' => 'SOLD016',
            'serial_number' => 'SN-S016-2022',
            'asset_type_id' => $soldaType->id,
            'description' => 'Máquina de solda MIG/MAG',
            'manufacturer' => 'Lincoln Electric',
            'manufacturing_year' => 2022,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaManutencao->id,
            'sector_id' => $sectorMecanica->id,
        ]);

        $validateAreaAndSector($areaUtilidades, null, $defaultPlant);
        Asset::create([
            'tag' => 'GERA017',
            'serial_number' => 'SN-G017-2023',
            'asset_type_id' => $geradorType->id,
            'description' => 'Gerador diesel de emergência',
            'manufacturer' => 'Cummins',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaUtilidades->id,
        ]);

        $validateAreaAndSector($areaUtilidades, null, $defaultPlant);
        Asset::create([
            'tag' => 'HVAC018',
            'serial_number' => 'SN-H018-2022',
            'asset_type_id' => $hvacType->id,
            'description' => 'Sistema HVAC central',
            'manufacturer' => 'Trane',
            'manufacturing_year' => 2022,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaUtilidades->id,
        ]);

        $validateAreaAndSector($areaLogistica, null, $defaultPlant);
        Asset::create([
            'tag' => 'ELEV019',
            'serial_number' => 'SN-E019-2023',
            'asset_type_id' => $elevadorType->id,
            'description' => 'Elevador de carga industrial',
            'manufacturer' => 'Otis',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaLogistica->id,
        ]);

        $validateAreaAndSector($areaProducao, $sectorLinha1, $defaultPlant);
        Asset::create([
            'tag' => 'ESTE020',
            'serial_number' => 'SN-E020-2022',
            'asset_type_id' => $esteiraType->id,
            'description' => 'Esteira transportadora de rolos',
            'manufacturer' => 'Interroll',
            'manufacturing_year' => 2022,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaProducao->id,
            'sector_id' => $sectorLinha1->id,
        ]);

        $validateAreaAndSector($areaManutencao, $sectorMecanica, $defaultPlant);
        Asset::create([
            'tag' => 'COMP021',
            'serial_number' => 'SN-C021-2023',
            'asset_type_id' => $compressorType->id,
            'description' => 'Compressor de ar de baixa pressão',
            'manufacturer' => 'Ingersoll Rand',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaManutencao->id,
            'sector_id' => $sectorMecanica->id,
        ]);

        $validateAreaAndSector($areaProducao2, null, $plant2);
        Asset::create([
            'tag' => 'TORN022',
            'serial_number' => 'SN-T022-2022',
            'asset_type_id' => $tornoType->id,
            'description' => 'Torno CNC de pequeno porte',
            'manufacturer' => 'Okuma',
            'manufacturing_year' => 2022,
            'plant_id' => $plant2->id,
            'area_id' => $areaProducao2->id,
        ]);

        $validateAreaAndSector($areaProducao, $sectorLinha2, $defaultPlant);
        Asset::create([
            'tag' => 'FRES023',
            'serial_number' => 'SN-F023-2023',
            'asset_type_id' => $fresadoraType->id,
            'description' => 'Fresadora CNC de 3 eixos',
            'manufacturer' => 'Mazak',
            'manufacturing_year' => 2023,
            'plant_id' => $defaultPlant->id,
            'area_id' => $areaProducao->id,
            'sector_id' => $sectorLinha2->id,
        ]);
    }
}
