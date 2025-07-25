<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Production\Item;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use App\Models\Production\WorkCell;
use App\Models\Production\ProductionRouting;
use App\Models\Production\RoutingStep;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionSchedule;
use App\Models\Production\ProductionExecution;
use App\Models\Production\QrTracking;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use App\Models\Production\ShipmentPhoto;
use App\Models\Production\ItemBomHistory;

class ProductionTestDataSeeder extends Seeder
{
    private $items = [];
    private $workCells = [];
    
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Criando dados de produção de bicicletas...');
        
        // Clean up existing data in reverse dependency order
        $this->cleanDatabase();
        
        // Get the first user as creator
        $creator = User::first();
        
        // Create work cells
        $this->createWorkCells();
        
        // Create items for bicycle production
        $this->createBicycleItems($creator);
        
        // Create BOM structure
        $this->createBicycleBOM($creator);
        
        // Create production routings
        $this->createProductionRoutings($creator);
        
        // Create production orders
        $this->createProductionOrders($creator);
        
        $this->command->info('Dados de produção de bicicletas criados com sucesso!');
    }
    
    private function cleanDatabase(): void
    {
        DB::statement('SET CONSTRAINTS ALL DEFERRED');
        
        ShipmentPhoto::query()->delete();
        ShipmentItem::query()->delete();
        Shipment::query()->delete();
        QrTracking::query()->delete();
        ProductionExecution::query()->delete();
        ProductionSchedule::query()->delete();
        ProductionOrder::query()->delete();
        RoutingStep::query()->delete();
        ProductionRouting::query()->delete();
        BomItem::query()->delete();
        BomVersion::query()->delete();
        ItemBomHistory::query()->delete();
        BillOfMaterial::query()->delete();
        Item::query()->delete();
        WorkCell::query()->delete();
        
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
    }
    
    private function createWorkCells(): void
    {
        $this->command->info('Criando células de trabalho...');
        
        $this->workCells = [
            'usinagem' => WorkCell::factory()->create([
                'code' => 'USI-01',
                'name' => 'Centro de Usinagem',
                'description' => 'Centro de usinagem para componentes metálicos',
                'cell_type' => 'internal',
                'capacity_per_hour' => 20,
                'setup_time_minutes' => 30,
            ]),
            'soldagem' => WorkCell::factory()->create([
                'code' => 'SOL-01',
                'name' => 'Estação de Soldagem',
                'description' => 'Soldagem de quadros e componentes',
                'cell_type' => 'internal',
                'capacity_per_hour' => 10,
                'setup_time_minutes' => 45,
            ]),
            'pintura' => WorkCell::factory()->create([
                'code' => 'PIN-01',
                'name' => 'Cabine de Pintura',
                'description' => 'Pintura eletrostática e acabamento',
                'cell_type' => 'internal',
                'capacity_per_hour' => 15,
                'setup_time_minutes' => 60,
            ]),
            'montagem_rodas' => WorkCell::factory()->create([
                'code' => 'MTR-01',
                'name' => 'Montagem de Rodas',
                'description' => 'Montagem e alinhamento de rodas',
                'cell_type' => 'internal',
                'capacity_per_hour' => 25,
                'setup_time_minutes' => 15,
            ]),
            'montagem_final' => WorkCell::factory()->create([
                'code' => 'MTF-01',
                'name' => 'Linha de Montagem Final',
                'description' => 'Montagem final de bicicletas',
                'cell_type' => 'internal',
                'capacity_per_hour' => 8,
                'setup_time_minutes' => 20,
            ]),
            'inspecao' => WorkCell::factory()->create([
                'code' => 'INS-01',
                'name' => 'Inspeção de Qualidade',
                'description' => 'Inspeção final e testes',
                'cell_type' => 'internal',
                'capacity_per_hour' => 12,
                'setup_time_minutes' => 10,
            ]),
            'embalagem' => WorkCell::factory()->create([
                'code' => 'EMB-01',
                'name' => 'Estação de Embalagem',
                'description' => 'Embalagem e preparação para envio',
                'cell_type' => 'internal',
                'capacity_per_hour' => 20,
                'setup_time_minutes' => 15,
            ]),
        ];
    }
    
    private function createBicycleItems($creator): void
    {
        $this->command->info('Criando itens de bicicleta...');
        
        // Nível 0 - Produto Final
        $this->items['bicicleta'] = Item::factory()->create([
            'item_number' => 'BIKE-001',
            'name' => 'Bicicleta Urbana Completa',
            'description' => 'Bicicleta urbana de 21 marchas com acessórios completos',
            'category' => 'Produto Final',
            'item_type' => 'manufactured',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'unit_of_measure' => 'UN',
            'weight' => 15.5,
            'dimensions' => ['length' => 180, 'width' => 60, 'height' => 110, 'unit' => 'cm'],
            'list_price' => 1500.00,
            'cost' => 750.00,
            'lead_time_days' => 5,
            'tags' => ['bicicleta', 'produto-final', 'urbana'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 1 - Subconjuntos Principais
        $this->items['quadro_completo'] = Item::factory()->create([
            'item_number' => 'QDR-001',
            'name' => 'Quadro Completo',
            'description' => 'Quadro de alumínio com garfo e componentes',
            'category' => 'Subconjunto',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 3.5,
            'cost' => 250.00,
            'lead_time_days' => 3,
            'tags' => ['quadro', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['conjunto_rodas'] = Item::factory()->create([
            'item_number' => 'CRD-001',
            'name' => 'Conjunto de Rodas',
            'description' => 'Par de rodas completas com pneus',
            'category' => 'Subconjunto',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'PAR',
            'weight' => 4.0,
            'cost' => 150.00,
            'lead_time_days' => 2,
            'tags' => ['rodas', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['grupo_transmissao'] = Item::factory()->create([
            'item_number' => 'GTR-001',
            'name' => 'Grupo de Transmissão',
            'description' => 'Sistema completo de transmissão 21 marchas',
            'category' => 'Subconjunto',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 2.5,
            'cost' => 180.00,
            'lead_time_days' => 2,
            'tags' => ['transmissao', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['sistema_freios'] = Item::factory()->create([
            'item_number' => 'FRE-001',
            'name' => 'Sistema de Freios',
            'description' => 'Sistema completo de freios V-brake',
            'category' => 'Subconjunto',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 0.8,
            'cost' => 60.00,
            'lead_time_days' => 1,
            'tags' => ['freios', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 2 - Componentes do Quadro
        $this->items['estrutura_quadro'] = Item::factory()->create([
            'item_number' => 'EST-001',
            'name' => 'Estrutura do Quadro',
            'description' => 'Estrutura principal do quadro em alumínio',
            'category' => 'Componente',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 2.0,
            'cost' => 120.00,
            'lead_time_days' => 2,
            'tags' => ['estrutura', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['garfo'] = Item::factory()->create([
            'item_number' => 'GAR-001',
            'name' => 'Garfo Dianteiro',
            'description' => 'Garfo dianteiro em alumínio',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.8,
            'cost' => 45.00,
            'lead_time_days' => 7,
            'preferred_vendor' => 'Fornecedor de Garfos Ltda',
            'vendor_item_number' => 'FOR-GAR-2024',
            'tags' => ['garfo', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['mesa_direcao'] = Item::factory()->create([
            'item_number' => 'MES-001',
            'name' => 'Mesa e Direção',
            'description' => 'Conjunto de mesa e direção',
            'category' => 'Componente',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 0.5,
            'cost' => 35.00,
            'lead_time_days' => 1,
            'tags' => ['mesa', 'direcao', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 2 - Componentes das Rodas
        $this->items['roda_montada'] = Item::factory()->create([
            'item_number' => 'RDA-001',
            'name' => 'Roda Montada',
            'description' => 'Roda individual montada sem pneu',
            'category' => 'Componente',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 1.5,
            'cost' => 50.00,
            'lead_time_days' => 1,
            'tags' => ['roda', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['conjunto_pneu'] = Item::factory()->create([
            'item_number' => 'PNE-001',
            'name' => 'Conjunto Pneu e Câmara',
            'description' => 'Pneu com câmara de ar instalada',
            'category' => 'Componente',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 0.5,
            'cost' => 25.00,
            'lead_time_days' => 1,
            'tags' => ['pneu', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 3 - Componentes da Estrutura
        $this->items['tubo_superior'] = Item::factory()->create([
            'item_number' => 'TUB-001',
            'name' => 'Tubo Superior',
            'description' => 'Tubo superior do quadro',
            'category' => 'Matéria Prima',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.5,
            'cost' => 20.00,
            'lead_time_days' => 10,
            'preferred_vendor' => 'Tubos de Alumínio SA',
            'vendor_item_number' => 'AL-TUB-50',
            'tags' => ['tubo', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['tubo_inferior'] = Item::factory()->create([
            'item_number' => 'TUB-002',
            'name' => 'Tubo Inferior',
            'description' => 'Tubo inferior do quadro',
            'category' => 'Matéria Prima',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.6,
            'cost' => 22.00,
            'lead_time_days' => 10,
            'preferred_vendor' => 'Tubos de Alumínio SA',
            'vendor_item_number' => 'AL-TUB-60',
            'tags' => ['tubo', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['tubo_selim'] = Item::factory()->create([
            'item_number' => 'TUB-003',
            'name' => 'Tubo do Selim',
            'description' => 'Tubo vertical para o selim',
            'category' => 'Matéria Prima',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.4,
            'cost' => 18.00,
            'lead_time_days' => 10,
            'preferred_vendor' => 'Tubos de Alumínio SA',
            'vendor_item_number' => 'AL-TUB-40',
            'tags' => ['tubo', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['suporte_traseiro'] = Item::factory()->create([
            'item_number' => 'SUP-001',
            'name' => 'Suporte Traseiro',
            'description' => 'Suporte traseiro do quadro',
            'category' => 'Componente',
            'item_type' => 'manufactured',
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 15.00,
            'lead_time_days' => 1,
            'tags' => ['suporte', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 3 - Componentes das Rodas
        $this->items['aro'] = Item::factory()->create([
            'item_number' => 'ARO-001',
            'name' => 'Aro 26"',
            'description' => 'Aro de alumínio 26 polegadas',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.6,
            'cost' => 25.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Aros e Componentes Ltda',
            'vendor_item_number' => 'ARO-26-AL',
            'tags' => ['aro', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['cubo'] = Item::factory()->create([
            'item_number' => 'CUB-001',
            'name' => 'Cubo de Roda',
            'description' => 'Cubo com rolamentos',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 15.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Cubos Industriais SA',
            'vendor_item_number' => 'CUB-STD',
            'tags' => ['cubo', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['raios'] = Item::factory()->create([
            'item_number' => 'RAI-001',
            'name' => 'Conjunto de Raios',
            'description' => 'Kit com 36 raios e niples',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'KIT',
            'weight' => 0.2,
            'cost' => 8.00,
            'lead_time_days' => 7,
            'preferred_vendor' => 'Raios e Acessórios Ltda',
            'vendor_item_number' => 'RAI-36',
            'tags' => ['raios', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 3 - Componentes de Pneu
        $this->items['pneu'] = Item::factory()->create([
            'item_number' => 'PNE-002',
            'name' => 'Pneu 26x1.95',
            'description' => 'Pneu urbano 26 polegadas',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.7,
            'cost' => 20.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Pneus Nacionais SA',
            'vendor_item_number' => 'PNE-26195',
            'tags' => ['pneu', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['camara'] = Item::factory()->create([
            'item_number' => 'CAM-001',
            'name' => 'Câmara de Ar 26"',
            'description' => 'Câmara de ar para pneu 26 polegadas',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.1,
            'cost' => 5.00,
            'lead_time_days' => 7,
            'preferred_vendor' => 'Borrachas Industriais Ltda',
            'vendor_item_number' => 'CAM-26',
            'tags' => ['camara', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 4 - Componentes do Suporte Traseiro
        $this->items['chapa_suporte'] = Item::factory()->create([
            'item_number' => 'CHP-001',
            'name' => 'Chapa de Suporte',
            'description' => 'Chapa de alumínio cortada',
            'category' => 'Matéria Prima',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.2,
            'cost' => 8.00,
            'lead_time_days' => 7,
            'preferred_vendor' => 'Metais e Ligas SA',
            'vendor_item_number' => 'AL-CHP-2MM',
            'tags' => ['chapa', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['parafusos_suporte'] = Item::factory()->create([
            'item_number' => 'PAR-001',
            'name' => 'Kit Parafusos M8',
            'description' => 'Kit com 4 parafusos M8x20mm',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'KIT',
            'weight' => 0.05,
            'cost' => 2.00,
            'lead_time_days' => 3,
            'preferred_vendor' => 'Parafusos e Fixadores Ltda',
            'vendor_item_number' => 'KIT-M8-20',
            'tags' => ['parafusos', 'fixacao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Componentes adicionais de transmissão
        $this->items['cambio_traseiro'] = Item::factory()->create([
            'item_number' => 'CMB-001',
            'name' => 'Câmbio Traseiro',
            'description' => 'Câmbio traseiro 7 velocidades',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 45.00,
            'lead_time_days' => 21,
            'preferred_vendor' => 'Componentes de Transmissão SA',
            'vendor_item_number' => 'CMB-7V',
            'tags' => ['cambio', 'transmissao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['corrente'] = Item::factory()->create([
            'item_number' => 'COR-001',
            'name' => 'Corrente',
            'description' => 'Corrente de transmissão 116 elos',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 15.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Correntes Industriais Ltda',
            'vendor_item_number' => 'COR-116',
            'tags' => ['corrente', 'transmissao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Componentes adicionais
        $this->items['selim'] = Item::factory()->create([
            'item_number' => 'SEL-001',
            'name' => 'Selim Confort',
            'description' => 'Selim ergonômico com molas',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.4,
            'cost' => 25.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Selins e Acessórios Ltda',
            'vendor_item_number' => 'SEL-CONF',
            'tags' => ['selim', 'acessorio', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['guidao'] = Item::factory()->create([
            'item_number' => 'GUI-001',
            'name' => 'Guidão Urbano',
            'description' => 'Guidão tipo urbano em alumínio',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 20.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Componentes de Direção SA',
            'vendor_item_number' => 'GUI-URB',
            'tags' => ['guidao', 'direcao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['pedais'] = Item::factory()->create([
            'item_number' => 'PED-001',
            'name' => 'Par de Pedais',
            'description' => 'Pedais com refletores',
            'category' => 'Componente',
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'PAR',
            'weight' => 0.4,
            'cost' => 15.00,
            'lead_time_days' => 14,
            'preferred_vendor' => 'Pedais e Acessórios Ltda',
            'vendor_item_number' => 'PED-REF',
            'tags' => ['pedais', 'acessorio', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->command->info('Criados ' . count($this->items) . ' itens');
    }
    
    private function createBicycleBOM($creator): void
    {
        $this->command->info('Criando estrutura de BOM...');
        
        // Create BOM for the bicycle
        $bom = BillOfMaterial::create([
            'bom_number' => 'BOM-BIKE-001',
            'name' => 'Lista de Materiais - Bicicleta Urbana',
            'description' => 'BOM completa para bicicleta urbana 21 marchas',
            'is_active' => true,
            'created_by' => $creator->id,
        ]);
        
        // Create version
        $version = BomVersion::create([
            'bill_of_material_id' => $bom->id,
            'version_number' => 1,
            'revision_notes' => 'Versão inicial - Produção de bicicletas',
            'published_at' => now(),
            'published_by' => $creator->id,
            'is_current' => true,
        ]);
        
        // Update the bicycle item with the BOM
        $this->items['bicicleta']->update(['current_bom_id' => $bom->id]);
        
        // Create BOM structure
        // Level 0 - Final Product (no BOM item for the root)
        
        // Level 1 - Main Subassemblies
        $bomQuadro = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['quadro_completo']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 10,
            'bom_notes' => ['posicao' => 'centro', 'critico' => true],
        ]);
        
        $bomRodas = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['conjunto_rodas']->id,
            'quantity' => 1,
            'unit_of_measure' => 'PAR',
            'level' => 1,
            'sequence_number' => 20,
            'bom_notes' => ['observacao' => 'Montar após pintura do quadro'],
        ]);
        
        $bomTransmissao = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['grupo_transmissao']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 30,
        ]);
        
        $bomFreios = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['sistema_freios']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 40,
        ]);
        
        // Additional Level 1 items
        $bomSelim = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['selim']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 50,
        ]);
        
        $bomGuidao = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['guidao']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 60,
        ]);
        
        $bomPedais = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['pedais']->id,
            'quantity' => 1,
            'unit_of_measure' => 'PAR',
            'level' => 1,
            'sequence_number' => 70,
        ]);
        
        // Level 2 - Components of Quadro
        $bomEstrutura = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomQuadro->id,
            'item_id' => $this->items['estrutura_quadro']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 10,
            'assembly_instructions' => [
                'passo1' => 'Posicionar estrutura na bancada',
                'passo2' => 'Verificar alinhamento'
            ],
        ]);
        
        $bomGarfo = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomQuadro->id,
            'item_id' => $this->items['garfo']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 20,
        ]);
        
        $bomMesa = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomQuadro->id,
            'item_id' => $this->items['mesa_direcao']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 30,
        ]);
        
        // Level 2 - Components of Rodas
        $bomRodaMontada = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomRodas->id,
            'item_id' => $this->items['roda_montada']->id,
            'quantity' => 2,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 10,
        ]);
        
        $bomConjuntoPneu = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomRodas->id,
            'item_id' => $this->items['conjunto_pneu']->id,
            'quantity' => 2,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 20,
        ]);
        
        // Level 2 - Components of Transmissão
        $bomCambio = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomTransmissao->id,
            'item_id' => $this->items['cambio_traseiro']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 10,
        ]);
        
        $bomCorrente = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomTransmissao->id,
            'item_id' => $this->items['corrente']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 2,
            'sequence_number' => 20,
        ]);
        
        // Level 3 - Components of Estrutura
        $bomTuboSuperior = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomEstrutura->id,
            'item_id' => $this->items['tubo_superior']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 10,
        ]);
        
        $bomTuboInferior = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomEstrutura->id,
            'item_id' => $this->items['tubo_inferior']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 20,
        ]);
        
        $bomTuboSelim = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomEstrutura->id,
            'item_id' => $this->items['tubo_selim']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 30,
        ]);
        
        $bomSuporteTraseiro = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomEstrutura->id,
            'item_id' => $this->items['suporte_traseiro']->id,
            'quantity' => 2,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 40,
        ]);
        
        // Level 3 - Components of Roda Montada
        $bomAro = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomRodaMontada->id,
            'item_id' => $this->items['aro']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 10,
        ]);
        
        $bomCubo = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomRodaMontada->id,
            'item_id' => $this->items['cubo']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 20,
        ]);
        
        $bomRaios = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomRodaMontada->id,
            'item_id' => $this->items['raios']->id,
            'quantity' => 1,
            'unit_of_measure' => 'KIT',
            'level' => 3,
            'sequence_number' => 30,
        ]);
        
        // Level 3 - Components of Conjunto Pneu
        $bomPneu = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomConjuntoPneu->id,
            'item_id' => $this->items['pneu']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 10,
        ]);
        
        $bomCamara = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomConjuntoPneu->id,
            'item_id' => $this->items['camara']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 3,
            'sequence_number' => 20,
        ]);
        
        // Level 4 - Components of Suporte Traseiro
        $bomChapa = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomSuporteTraseiro->id,
            'item_id' => $this->items['chapa_suporte']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 4,
            'sequence_number' => 10,
        ]);
        
        $bomParafusos = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $bomSuporteTraseiro->id,
            'item_id' => $this->items['parafusos_suporte']->id,
            'quantity' => 1,
            'unit_of_measure' => 'KIT',
            'level' => 4,
            'sequence_number' => 20,
        ]);
        
        // Create Item BOM History
        ItemBomHistory::create([
            'item_id' => $this->items['bicicleta']->id,
            'bill_of_material_id' => $bom->id,
            'changed_by' => $creator->id,
            'change_reason' => 'BOM inicial criada',
        ]);
        
        $this->command->info('Estrutura de BOM criada com 4 níveis');
    }
    
    private function createProductionRoutings($creator): void
    {
        $this->command->info('Criando roteiros de produção...');
        
        // Get BOM items that need routing
        $bomVersion = BomVersion::where('is_current', true)->first();
        
        // Routing for Estrutura do Quadro
        $estruturaBomItem = BomItem::where('bom_version_id', $bomVersion->id)
            ->where('item_id', $this->items['estrutura_quadro']->id)
            ->first();
            
        if ($estruturaBomItem) {
            $routingEstrutura = ProductionRouting::create([
                'bom_item_id' => $estruturaBomItem->id,
                'routing_number' => 'ROT-EST-001',
                'name' => 'Roteiro - Estrutura do Quadro',
                'description' => 'Processo de soldagem da estrutura do quadro',
                'routing_type' => 'defined',
                'is_active' => true,
                'created_by' => $creator->id,
            ]);
            
            // Routing steps
            RoutingStep::create([
                'production_routing_id' => $routingEstrutura->id,
                'step_number' => 10,
                'operation_code' => 'CORTE',
                'operation_description' => 'Cortar tubos no comprimento especificado',
                'work_cell_id' => $this->workCells['usinagem']->id,
                'setup_time_minutes' => 15,
                'cycle_time_minutes' => 10,
                'labor_time_minutes' => 10,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingEstrutura->id,
                'step_number' => 20,
                'operation_code' => 'SOLDA',
                'operation_description' => 'Soldar tubos conforme gabarito',
                'work_cell_id' => $this->workCells['soldagem']->id,
                'setup_time_minutes' => 30,
                'cycle_time_minutes' => 45,
                'labor_time_minutes' => 45,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingEstrutura->id,
                'step_number' => 30,
                'operation_code' => 'ACABAMENTO',
                'operation_description' => 'Lixar e preparar para pintura',
                'work_cell_id' => $this->workCells['usinagem']->id,
                'setup_time_minutes' => 10,
                'cycle_time_minutes' => 20,
                'labor_time_minutes' => 20,
                'created_by' => $creator->id,
            ]);
        }
        
        // Routing for Quadro Completo
        $quadroBomItem = BomItem::where('bom_version_id', $bomVersion->id)
            ->where('item_id', $this->items['quadro_completo']->id)
            ->first();
            
        if ($quadroBomItem) {
            $routingQuadro = ProductionRouting::create([
                'bom_item_id' => $quadroBomItem->id,
                'routing_number' => 'ROT-QDR-001',
                'name' => 'Roteiro - Quadro Completo',
                'description' => 'Montagem e pintura do quadro completo',
                'routing_type' => 'defined',
                'is_active' => true,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingQuadro->id,
                'step_number' => 10,
                'operation_code' => 'MONTAGEM',
                'operation_description' => 'Montar estrutura com garfo e mesa',
                'work_cell_id' => $this->workCells['montagem_final']->id,
                'setup_time_minutes' => 10,
                'cycle_time_minutes' => 15,
                'labor_time_minutes' => 15,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingQuadro->id,
                'step_number' => 20,
                'operation_code' => 'PINTURA',
                'operation_description' => 'Pintura eletrostática do quadro',
                'work_cell_id' => $this->workCells['pintura']->id,
                'setup_time_minutes' => 30,
                'cycle_time_minutes' => 60,
                'labor_time_minutes' => 20,
                'created_by' => $creator->id,
            ]);
        }
        
        // Routing for Roda Montada
        $rodaBomItem = BomItem::where('bom_version_id', $bomVersion->id)
            ->where('item_id', $this->items['roda_montada']->id)
            ->first();
            
        if ($rodaBomItem) {
            $routingRoda = ProductionRouting::create([
                'bom_item_id' => $rodaBomItem->id,
                'routing_number' => 'ROT-RDA-001',
                'name' => 'Roteiro - Montagem de Roda',
                'description' => 'Montagem e balanceamento de rodas',
                'routing_type' => 'defined',
                'is_active' => true,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingRoda->id,
                'step_number' => 10,
                'operation_code' => 'RAIACAO',
                'operation_description' => 'Montar raios no aro e cubo',
                'work_cell_id' => $this->workCells['montagem_rodas']->id,
                'setup_time_minutes' => 10,
                'cycle_time_minutes' => 25,
                'labor_time_minutes' => 25,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingRoda->id,
                'step_number' => 20,
                'operation_code' => 'CENTRAGEM',
                'operation_description' => 'Centrar e balancear roda',
                'work_cell_id' => $this->workCells['montagem_rodas']->id,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 15,
                'labor_time_minutes' => 15,
                'created_by' => $creator->id,
            ]);
        }
        
        // Routing for Final Assembly (Bicycle)
        $bicicleta = $this->items['bicicleta'];
        $bomBicicleta = BillOfMaterial::find($bicicleta->current_bom_id);
        
        if ($bomBicicleta) {
            // Create a phantom BOM item for the bicycle to attach routing
            $bicicletaBomItem = BomItem::create([
                'bom_version_id' => $bomVersion->id,
                'parent_item_id' => null,
                'item_id' => $bicicleta->id,
                'quantity' => 1,
                'unit_of_measure' => 'UN',
                'level' => 0,
                'sequence_number' => 1,
            ]);
            
            $routingFinal = ProductionRouting::create([
                'bom_item_id' => $bicicletaBomItem->id,
                'routing_number' => 'ROT-BIKE-001',
                'name' => 'Roteiro - Montagem Final',
                'description' => 'Montagem final da bicicleta',
                'routing_type' => 'defined',
                'is_active' => true,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingFinal->id,
                'step_number' => 10,
                'operation_code' => 'MONT-INICIAL',
                'operation_description' => 'Montar rodas no quadro',
                'work_cell_id' => $this->workCells['montagem_final']->id,
                'setup_time_minutes' => 10,
                'cycle_time_minutes' => 20,
                'labor_time_minutes' => 20,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingFinal->id,
                'step_number' => 20,
                'operation_code' => 'MONT-TRANS',
                'operation_description' => 'Instalar sistema de transmissão',
                'work_cell_id' => $this->workCells['montagem_final']->id,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 30,
                'labor_time_minutes' => 30,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingFinal->id,
                'step_number' => 30,
                'operation_code' => 'MONT-FREIOS',
                'operation_description' => 'Instalar e ajustar sistema de freios',
                'work_cell_id' => $this->workCells['montagem_final']->id,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 20,
                'labor_time_minutes' => 20,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingFinal->id,
                'step_number' => 40,
                'operation_code' => 'MONT-ACESS',
                'operation_description' => 'Instalar selim, guidão e pedais',
                'work_cell_id' => $this->workCells['montagem_final']->id,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 15,
                'labor_time_minutes' => 15,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingFinal->id,
                'step_number' => 50,
                'operation_code' => 'INSPECAO',
                'operation_description' => 'Inspeção final e testes',
                'work_cell_id' => $this->workCells['inspecao']->id,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 15,
                'labor_time_minutes' => 15,
                'created_by' => $creator->id,
            ]);
            
            RoutingStep::create([
                'production_routing_id' => $routingFinal->id,
                'step_number' => 60,
                'operation_code' => 'EMBALAGEM',
                'operation_description' => 'Embalar bicicleta para envio',
                'work_cell_id' => $this->workCells['embalagem']->id,
                'setup_time_minutes' => 5,
                'cycle_time_minutes' => 10,
                'labor_time_minutes' => 10,
                'created_by' => $creator->id,
            ]);
        }
        
        $this->command->info('Roteiros de produção criados');
    }
    
    private function createProductionOrders($creator): void
    {
        $this->command->info('Criando ordens de produção...');
        
        // Create production orders for bicycles
        for ($i = 1; $i <= 5; $i++) {
            $order = ProductionOrder::create([
                'order_number' => sprintf('OP-%s-%04d', date('Y'), $i),
                'item_id' => $this->items['bicicleta']->id,
                'bill_of_material_id' => $this->items['bicicleta']->current_bom_id,
                'quantity' => rand(5, 20),
                'unit_of_measure' => 'UN',
                'status' => $i <= 2 ? 'in_progress' : 'scheduled',
                'priority' => $i == 1 ? 'high' : 'normal',
                'requested_date' => now()->addDays(rand(7, 30)),
                'planned_start_date' => now()->addDays(rand(1, 5)),
                'planned_end_date' => now()->addDays(rand(6, 10)),
                'source_type' => 'sales_order',
                'source_reference' => 'PED-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'created_by' => $creator->id,
            ]);
            
            // Create some production schedules for the first order
            if ($i == 1) {
                $routingSteps = RoutingStep::whereHas('productionRouting', function($q) {
                    $q->whereHas('bomItem', function($q2) {
                        $q2->where('item_id', $this->items['bicicleta']->id);
                    });
                })->get();
                
                foreach ($routingSteps as $step) {
                    ProductionSchedule::create([
                        'production_order_id' => $order->id,
                        'routing_step_id' => $step->id,
                        'work_cell_id' => $step->work_cell_id,
                        'scheduled_start' => now()->addHours(rand(1, 24)),
                        'scheduled_end' => now()->addHours(rand(25, 48)),
                        'buffer_time_minutes' => 30,
                        'status' => 'scheduled',
                    ]);
                }
            }
        }
        
        $this->command->info('Ordens de produção criadas');
    }
} 