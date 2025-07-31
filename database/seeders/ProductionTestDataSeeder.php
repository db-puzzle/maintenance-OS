<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use App\Models\Production\WorkCell;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingOrder;
use App\Models\Production\ManufacturingStepExecution;
use App\Models\Production\QrTracking;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use App\Models\Production\ShipmentPhoto;
use App\Models\Production\ItemBomHistory;

class ProductionTestDataSeeder extends Seeder
{
    private $items = [];
    private $workCells = [];
    private $categories = [];
    
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Criando dados de produção de bicicletas...');
        
        // Clean up existing data in reverse dependency order
        $this->cleanDatabase();
        
        // Get existing user as creator - do not create users to preserve admin privileges
        $creator = User::first();
        if (!$creator) {
            $this->command->error('No users found in database. Please create a user through the interface first to establish admin privileges.');
            $this->command->info('After creating your first user, you can run this seeder with: php artisan db:seed --class=ProductionTestDataSeeder');
            return;
        }
        
        // Load categories
        $this->loadCategories();
        
        // Create work cells
        $this->createWorkCells();
        
        // Create items for bicycle production
        $this->createBicycleItems($creator);
        
        // Create BOM structure
        $this->createBicycleBOM($creator);
        
        // Create production orders and routes
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
        ManufacturingStepExecution::query()->delete();
        ManufacturingStep::query()->delete();
        ManufacturingRoute::query()->delete();
        ManufacturingOrder::query()->delete();
        BomItem::query()->delete();
        BomVersion::query()->delete();
        ItemBomHistory::query()->delete();
        BillOfMaterial::query()->delete();
        Item::query()->delete();
        WorkCell::query()->delete();
        
        DB::statement('SET CONSTRAINTS ALL IMMEDIATE');
    }
    
    private function loadCategories(): void
    {
        $this->command->info('Carregando categorias...');
        
        // Map old category names to new category names
        $categoryMap = [
            'Produto Final' => 'Eletrônicos',
            'Subconjunto' => 'Mecânica',
            'Componente' => 'Mecânica',
            'Matéria Prima' => 'Matéria Prima',
        ];
        
        foreach ($categoryMap as $oldName => $newName) {
            $category = ItemCategory::firstOrCreate(
                ['name' => $newName],
                [
                    'description' => "Categoria: $newName",
                    'is_active' => true,
                ]
            );
            $this->categories[$oldName] = $category->id;
        }
    }
    
    private function createWorkCells(): void
    {
        $this->command->info('Criando células de trabalho...');
        
        $this->workCells = [
            'usinagem' => WorkCell::create([
                'name' => 'Centro de Usinagem',
                'description' => 'Centro de usinagem para componentes metálicos',
                'cell_type' => 'internal',
                'available_hours_per_day' => 16,
                'efficiency_percentage' => 85,
                'is_active' => true,
            ]),
            'soldagem' => WorkCell::create([
                'name' => 'Estação de Soldagem',
                'description' => 'Soldagem de quadros e componentes',
                'cell_type' => 'internal',
                'available_hours_per_day' => 16,
                'efficiency_percentage' => 80,
                'is_active' => true,
            ]),
            'pintura' => WorkCell::create([
                'name' => 'Cabine de Pintura',
                'description' => 'Pintura eletrostática e acabamento',
                'cell_type' => 'internal',
                'available_hours_per_day' => 12,
                'efficiency_percentage' => 75,
                'is_active' => true,
            ]),
            'montagem_rodas' => WorkCell::create([
                'name' => 'Montagem de Rodas',
                'description' => 'Montagem e alinhamento de rodas',
                'cell_type' => 'internal',
                'available_hours_per_day' => 16,
                'efficiency_percentage' => 90,
                'is_active' => true,
            ]),
            'montagem_final' => WorkCell::create([
                'name' => 'Linha de Montagem Final',
                'description' => 'Montagem final de bicicletas',
                'cell_type' => 'internal',
                'available_hours_per_day' => 16,
                'efficiency_percentage' => 85,
                'is_active' => true,
            ]),
            'inspecao' => WorkCell::create([
                'name' => 'Inspeção de Qualidade',
                'description' => 'Inspeção final e testes',
                'cell_type' => 'internal',
                'available_hours_per_day' => 16,
                'efficiency_percentage' => 95,
                'is_active' => true,
            ]),
            'embalagem' => WorkCell::create([
                'name' => 'Estação de Embalagem',
                'description' => 'Embalagem e preparação para envio',
                'cell_type' => 'internal',
                'available_hours_per_day' => 16,
                'efficiency_percentage' => 90,
                'is_active' => true,
            ]),
        ];
    }
    
    private function createBicycleItems($creator): void
    {
        $this->command->info('Criando itens de bicicleta...');
        
        // Nível 0 - Produto Final
        $this->items['bicicleta'] = Item::create([
            'item_number' => 'BIKE-001',
            'name' => 'Bicicleta Urbana Completa',
            'description' => 'Bicicleta urbana de 21 marchas com acessórios completos',
            'item_category_id' => $this->categories['Produto Final'],
            'item_type' => 'manufactured',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 15.5,
            'dimensions' => ['length' => 180, 'width' => 60, 'height' => 110, 'unit' => 'cm'],
            'list_price' => 1500.00,
                            'manufacturing_cost' => 750.00,
            'manufacturing_lead_time_days' => 5,
            'track_inventory' => true,
            'tags' => ['bicicleta', 'produto-final', 'urbana'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 1 - Subconjuntos Principais
        $this->items['quadro_completo'] = Item::create([
            'item_number' => 'QDR-001',
            'name' => 'Quadro Completo',
            'description' => 'Quadro de alumínio com garfo e componentes',
            'item_category_id' => $this->categories['Subconjunto'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 3.5,
            'cost' => 250.00,
            'manufacturing_lead_time_days' => 3,
            'track_inventory' => true,
            'tags' => ['quadro', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['conjunto_rodas'] = Item::create([
            'item_number' => 'CRD-001',
            'name' => 'Conjunto de Rodas',
            'description' => 'Par de rodas completas com pneus',
            'item_category_id' => $this->categories['Subconjunto'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'PAR',
            'weight' => 4.0,
            'cost' => 150.00,
            'manufacturing_lead_time_days' => 2,
            'track_inventory' => true,
            'tags' => ['rodas', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['grupo_transmissao'] = Item::create([
            'item_number' => 'GTR-001',
            'name' => 'Grupo de Transmissão',
            'description' => 'Sistema completo de transmissão 21 marchas',
            'item_category_id' => $this->categories['Subconjunto'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 2.5,
            'cost' => 180.00,
            'manufacturing_lead_time_days' => 2,
            'track_inventory' => true,
            'tags' => ['transmissao', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['sistema_freios'] = Item::create([
            'item_number' => 'FRE-001',
            'name' => 'Sistema de Freios',
            'description' => 'Sistema completo de freios V-brake',
            'item_category_id' => $this->categories['Subconjunto'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.8,
            'cost' => 60.00,
            'manufacturing_lead_time_days' => 1,
            'track_inventory' => true,
            'tags' => ['freios', 'subconjunto'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 2 - Componentes do Quadro
        $this->items['estrutura_quadro'] = Item::create([
            'item_number' => 'EST-001',
            'name' => 'Estrutura do Quadro',
            'description' => 'Estrutura principal do quadro em alumínio',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 2.0,
            'cost' => 120.00,
            'manufacturing_lead_time_days' => 2,
            'track_inventory' => true,
            'tags' => ['estrutura', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['garfo'] = Item::create([
            'item_number' => 'GAR-001',
            'name' => 'Garfo Dianteiro',
            'description' => 'Garfo dianteiro em alumínio',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.8,
            'cost' => 45.00,
            'manufacturing_lead_time_days' => 7,
            'track_inventory' => true,
            'preferred_vendor' => 'Fornecedor de Garfos Ltda',
            'vendor_item_number' => 'FOR-GAR-2024',
            'tags' => ['garfo', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['mesa_direcao'] = Item::create([
            'item_number' => 'MES-001',
            'name' => 'Mesa e Direção',
            'description' => 'Conjunto de mesa e direção',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.5,
            'cost' => 35.00,
            'manufacturing_lead_time_days' => 1,
            'track_inventory' => true,
            'tags' => ['mesa', 'direcao', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 2 - Componentes das Rodas
        $this->items['roda_montada'] = Item::create([
            'item_number' => 'RDA-001',
            'name' => 'Roda Montada',
            'description' => 'Roda individual montada sem pneu',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 1.5,
            'cost' => 50.00,
            'manufacturing_lead_time_days' => 1,
            'track_inventory' => true,
            'tags' => ['roda', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['conjunto_pneu'] = Item::create([
            'item_number' => 'PNE-001',
            'name' => 'Conjunto Pneu e Câmara',
            'description' => 'Pneu com câmara de ar instalada',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.5,
            'cost' => 25.00,
            'manufacturing_lead_time_days' => 1,
            'track_inventory' => true,
            'tags' => ['pneu', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 3 - Componentes da Estrutura
        $this->items['tubo_superior'] = Item::create([
            'item_number' => 'TUB-001',
            'name' => 'Tubo Superior',
            'description' => 'Tubo superior do quadro',
            'item_category_id' => $this->categories['Matéria Prima'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.5,
            'cost' => 20.00,
            'manufacturing_lead_time_days' => 10,
            'track_inventory' => true,
            'preferred_vendor' => 'Tubos de Alumínio SA',
            'vendor_item_number' => 'AL-TUB-50',
            'tags' => ['tubo', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['tubo_inferior'] = Item::create([
            'item_number' => 'TUB-002',
            'name' => 'Tubo Inferior',
            'description' => 'Tubo inferior do quadro',
            'item_category_id' => $this->categories['Matéria Prima'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.6,
            'cost' => 22.00,
            'manufacturing_lead_time_days' => 10,
            'track_inventory' => true,
            'preferred_vendor' => 'Tubos de Alumínio SA',
            'vendor_item_number' => 'AL-TUB-60',
            'tags' => ['tubo', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['tubo_selim'] = Item::create([
            'item_number' => 'TUB-003',
            'name' => 'Tubo do Selim',
            'description' => 'Tubo vertical para o selim',
            'item_category_id' => $this->categories['Matéria Prima'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.4,
            'cost' => 18.00,
            'manufacturing_lead_time_days' => 10,
            'track_inventory' => true,
            'preferred_vendor' => 'Tubos de Alumínio SA',
            'vendor_item_number' => 'AL-TUB-40',
            'tags' => ['tubo', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['suporte_traseiro'] = Item::create([
            'item_number' => 'SUP-001',
            'name' => 'Suporte Traseiro',
            'description' => 'Suporte traseiro do quadro',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'manufactured',
            'can_be_sold' => false,
            'can_be_purchased' => false,
            'can_be_manufactured' => true,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 15.00,
            'manufacturing_lead_time_days' => 1,
            'track_inventory' => true,
            'tags' => ['suporte', 'componente'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 3 - Componentes das Rodas
        $this->items['aro'] = Item::create([
            'item_number' => 'ARO-001',
            'name' => 'Aro 26"',
            'description' => 'Aro de alumínio 26 polegadas',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.6,
            'cost' => 25.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
            'preferred_vendor' => 'Aros e Componentes Ltda',
            'vendor_item_number' => 'ARO-26-AL',
            'tags' => ['aro', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['cubo'] = Item::create([
            'item_number' => 'CUB-001',
            'name' => 'Cubo de Roda',
            'description' => 'Cubo com rolamentos',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 15.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
            'preferred_vendor' => 'Cubos Industriais SA',
            'vendor_item_number' => 'CUB-STD',
            'tags' => ['cubo', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['raios'] = Item::create([
            'item_number' => 'RAI-001',
            'name' => 'Conjunto de Raios',
            'description' => 'Kit com 36 raios e niples',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'KIT',
            'weight' => 0.2,
            'cost' => 8.00,
            'manufacturing_lead_time_days' => 7,
            'track_inventory' => true,
            'preferred_vendor' => 'Raios e Acessórios Ltda',
            'vendor_item_number' => 'RAI-36',
            'tags' => ['raios', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 3 - Componentes de Pneu
        $this->items['pneu'] = Item::create([
            'item_number' => 'PNE-002',
            'name' => 'Pneu 26x1.95',
            'description' => 'Pneu urbano 26 polegadas',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.7,
            'cost' => 20.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
            'preferred_vendor' => 'Pneus Nacionais SA',
            'vendor_item_number' => 'PNE-26195',
            'tags' => ['pneu', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['camara'] = Item::create([
            'item_number' => 'CAM-001',
            'name' => 'Câmara de Ar 26"',
            'description' => 'Câmara de ar para pneu 26 polegadas',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.1,
            'cost' => 5.00,
            'manufacturing_lead_time_days' => 7,
            'track_inventory' => true,
            'preferred_vendor' => 'Borrachas Industriais Ltda',
            'vendor_item_number' => 'CAM-26',
            'tags' => ['camara', 'componente', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Nível 4 - Componentes do Suporte Traseiro
        $this->items['chapa_suporte'] = Item::create([
            'item_number' => 'CHP-001',
            'name' => 'Chapa de Suporte',
            'description' => 'Chapa de alumínio cortada',
            'item_category_id' => $this->categories['Matéria Prima'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.2,
            'cost' => 8.00,
            'manufacturing_lead_time_days' => 7,
            'track_inventory' => true,
            'preferred_vendor' => 'Metais e Ligas SA',
            'vendor_item_number' => 'AL-CHP-2MM',
            'tags' => ['chapa', 'aluminio', 'materia-prima'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['parafusos_suporte'] = Item::create([
            'item_number' => 'PAR-001',
            'name' => 'Kit Parafusos M8',
            'description' => 'Kit com 4 parafusos M8x20mm',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'KIT',
            'weight' => 0.05,
            'cost' => 2.00,
            'manufacturing_lead_time_days' => 3,
            'track_inventory' => true,
            'preferred_vendor' => 'Parafusos e Fixadores Ltda',
            'vendor_item_number' => 'KIT-M8-20',
            'tags' => ['parafusos', 'fixacao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Componentes adicionais de transmissão
        $this->items['cambio_traseiro'] = Item::create([
            'item_number' => 'CMB-001',
            'name' => 'Câmbio Traseiro',
            'description' => 'Câmbio traseiro 7 velocidades',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 45.00,
            'manufacturing_lead_time_days' => 21,
            'track_inventory' => true,
            'preferred_vendor' => 'Componentes de Transmissão SA',
            'vendor_item_number' => 'CMB-7V',
            'tags' => ['cambio', 'transmissao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['corrente'] = Item::create([
            'item_number' => 'COR-001',
            'name' => 'Corrente',
            'description' => 'Corrente de transmissão 116 elos',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 15.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
            'preferred_vendor' => 'Correntes Industriais Ltda',
            'vendor_item_number' => 'COR-116',
            'tags' => ['corrente', 'transmissao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        // Componentes adicionais
        $this->items['selim'] = Item::create([
            'item_number' => 'SEL-001',
            'name' => 'Selim Confort',
            'description' => 'Selim ergonômico com molas',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.4,
            'cost' => 25.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
            'preferred_vendor' => 'Selins e Acessórios Ltda',
            'vendor_item_number' => 'SEL-CONF',
            'tags' => ['selim', 'acessorio', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['guidao'] = Item::create([
            'item_number' => 'GUI-001',
            'name' => 'Guidão Urbano',
            'description' => 'Guidão tipo urbano em alumínio',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'UN',
            'weight' => 0.3,
            'cost' => 20.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
            'preferred_vendor' => 'Componentes de Direção SA',
            'vendor_item_number' => 'GUI-URB',
            'tags' => ['guidao', 'direcao', 'comprado'],
            'created_by' => $creator->id,
        ]);
        
        $this->items['pedais'] = Item::create([
            'item_number' => 'PED-001',
            'name' => 'Par de Pedais',
            'description' => 'Pedais com refletores',
            'item_category_id' => $this->categories['Componente'],
            'item_type' => 'purchased',
            'can_be_sold' => false,
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => 'PAR',
            'weight' => 0.4,
            'cost' => 15.00,
            'manufacturing_lead_time_days' => 14,
            'track_inventory' => true,
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
            'output_item_id' => $this->items['bicicleta']->id, // NEW: BOM produces this item
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
        
        // Create root BOM item for the bicycle itself
        $rootBomItem = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => null,
            'item_id' => $this->items['bicicleta']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 0,
            'sequence_number' => 0,
        ]);
        
        // Level 1 - Main Subassemblies (now children of root)
        $bomQuadro = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
            'item_id' => $this->items['quadro_completo']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 10,
            'bom_notes' => ['posicao' => 'centro', 'critico' => true],
        ]);
        
        $bomRodas = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
            'item_id' => $this->items['conjunto_rodas']->id,
            'quantity' => 1,
            'unit_of_measure' => 'PAR',
            'level' => 1,
            'sequence_number' => 20,
            'bom_notes' => ['observacao' => 'Montar após pintura do quadro'],
        ]);
        
        $bomTransmissao = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
            'item_id' => $this->items['grupo_transmissao']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 30,
        ]);
        
        $bomFreios = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
            'item_id' => $this->items['sistema_freios']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 40,
        ]);
        
        // Additional Level 1 items
        $bomSelim = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
            'item_id' => $this->items['selim']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 50,
        ]);
        
        $bomGuidao = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
            'item_id' => $this->items['guidao']->id,
            'quantity' => 1,
            'unit_of_measure' => 'UN',
            'level' => 1,
            'sequence_number' => 60,
        ]);
        
        $bomPedais = BomItem::create([
            'bom_version_id' => $version->id,
            'parent_item_id' => $rootBomItem->id, // Now child of root
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
            'approved_by' => $creator->id,
            'change_reason' => 'BOM inicial criada',
            'effective_from' => now(),
        ]);
        
        $this->command->info('Estrutura de BOM criada com 4 níveis');
    }
    
    private function createProductionOrders($creator): void
    {
        $this->command->info('Criando ordens de produção...');
        
        // Create main production order for bicycles
        $mainOrder = ManufacturingOrder::create([
            'order_number' => sprintf('OP-%s-%04d', date('Y'), 1),
            'parent_id' => null,
            'item_id' => $this->items['bicicleta']->id,
            'bill_of_material_id' => $this->items['bicicleta']->current_bom_id,
            'quantity' => 10,
            'quantity_completed' => 0,
            'quantity_scrapped' => 0,
            'unit_of_measure' => 'UN',
            'status' => 'released',
            'priority' => 80,
            'requested_date' => now()->addDays(30),
            'planned_start_date' => now()->addDays(5),
            'planned_end_date' => now()->addDays(15),
            'source_type' => 'sales_order',
            'source_reference' => 'PED-0001',
            'created_by' => $creator->id,
        ]);
        
        // Create manufacturing route for the main order
        $this->createManufacturingRoute($mainOrder, $creator);
        
        // Create child orders for sub-assemblies (based on BOM)
        $this->createChildOrders($mainOrder, $creator);
        
        // Create additional orders with different statuses
        for ($i = 2; $i <= 5; $i++) {
            $order = ManufacturingOrder::create([
                'order_number' => sprintf('OP-%s-%04d', date('Y'), $i),
                'parent_id' => null,
                'item_id' => $this->items['bicicleta']->id,
                'bill_of_material_id' => $this->items['bicicleta']->current_bom_id,
                'quantity' => rand(5, 20),
                'quantity_completed' => 0,
                'quantity_scrapped' => 0,
                'unit_of_measure' => 'UN',
                'status' => $i <= 2 ? 'in_progress' : 'planned',
                'priority' => $i == 2 ? 70 : 50,
                'requested_date' => now()->addDays(rand(7, 45)),
                'planned_start_date' => now()->addDays(rand(10, 20)),
                'planned_end_date' => now()->addDays(rand(21, 35)),
                'source_type' => 'sales_order',
                'source_reference' => 'PED-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'created_by' => $creator->id,
            ]);
            
            // Create route for each order
            if ($i <= 3) {
                $this->createManufacturingRoute($order, $creator);
            }
        }
        
        $this->command->info('Ordens de produção criadas com rotas de manufatura');
    }
    
    private function createManufacturingRoute($order, $creator): void
    {
        $route = ManufacturingRoute::create([
            'manufacturing_order_id' => $order->id,
            'item_id' => $order->item_id,
            'name' => 'Roteiro - ' . $order->item->name,
            'description' => 'Roteiro de produção para ' . $order->item->name,
            'is_active' => true,
            'created_by' => $creator->id,
        ]);
        
        // Create steps based on item type
        if ($order->item_id === $this->items['bicicleta']->id) {
            $this->createBicycleManufacturingSteps($route);
        } elseif ($order->item_id === $this->items['quadro_completo']->id) {
            $this->createFrameManufacturingSteps($route);
        } elseif ($order->item_id === $this->items['estrutura_quadro']->id) {
            $this->createFrameStructureManufacturingSteps($route);
        } elseif ($order->item_id === $this->items['roda_montada']->id) {
            $this->createWheelManufacturingSteps($route);
        }
    }
    
    private function createBicycleManufacturingSteps($route): void
    {
        // Step 1: Initial Assembly
        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 1,
            'step_type' => 'standard',
            'name' => 'Montagem Inicial',
            'description' => 'Montar rodas no quadro',
            'work_cell_id' => $this->workCells['montagem_final']->id,
            'status' => 'pending',
            'setup_time_minutes' => 10,
            'cycle_time_minutes' => 20,
        ]);
        
        // Step 2: Transmission Assembly
        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 2,
            'step_type' => 'standard',
            'name' => 'Montagem da Transmissão',
            'description' => 'Instalar sistema de transmissão completo',
            'work_cell_id' => $this->workCells['montagem_final']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 30,
            'depends_on_step_id' => $step1->id,
        ]);
        
        // Step 3: Brake System Assembly
        $step3 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 3,
            'step_type' => 'standard',
            'name' => 'Montagem dos Freios',
            'description' => 'Instalar e ajustar sistema de freios',
            'work_cell_id' => $this->workCells['montagem_final']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 20,
            'depends_on_step_id' => $step2->id,
        ]);
        
        // Step 4: Accessories Assembly
        $step4 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 4,
            'step_type' => 'standard',
            'name' => 'Montagem de Acessórios',
            'description' => 'Instalar selim, guidão e pedais',
            'work_cell_id' => $this->workCells['montagem_final']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 15,
            'depends_on_step_id' => $step3->id,
        ]);
        
        // Step 5: Quality Inspection
        $step5 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 5,
            'step_type' => 'quality_check',
            'name' => 'Inspeção de Qualidade',
            'description' => 'Inspeção completa e testes funcionais',
            'work_cell_id' => $this->workCells['inspecao']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 15,
            'quality_check_mode' => 'every_part',
            'depends_on_step_id' => $step4->id,
        ]);
        
        // Step 6: Final Packaging
        $step6 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 6,
            'step_type' => 'standard',
            'name' => 'Embalagem Final',
            'description' => 'Embalar bicicleta para envio',
            'work_cell_id' => $this->workCells['embalagem']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 10,
            'depends_on_step_id' => $step5->id,
        ]);
        
        // Create some step executions for in-progress order
        if ($route->manufacturingOrder->status === 'in_progress') {
            $firstStep = $route->steps()->where('step_number', 1)->first();
            if ($firstStep) {
                ManufacturingStepExecution::create([
                    'manufacturing_step_id' => $firstStep->id,
                    'manufacturing_order_id' => $route->manufacturing_order_id,
                    'part_number' => 1,
                    'total_parts' => (int) $route->manufacturingOrder->quantity,
                    'status' => 'completed',
                    'started_at' => now()->subHours(2),
                    'completed_at' => now()->subHour(),
                    'work_cell_id' => $firstStep->work_cell_id,
                ]);
                
                $firstStep->update(['status' => 'completed']);
            }
        }
    }
    
    private function createFrameManufacturingSteps($route): void
    {
        // Step 1: Frame Assembly
        $step1 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 1,
            'step_type' => 'standard',
            'name' => 'Montagem do Quadro',
            'description' => 'Montar estrutura com garfo e mesa de direção',
            'work_cell_id' => $this->workCells['montagem_final']->id,
            'status' => 'pending',
            'setup_time_minutes' => 10,
            'cycle_time_minutes' => 15,
        ]);
        
        // Step 2: Frame Painting
        $step2 = ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 2,
            'step_type' => 'standard',
            'name' => 'Pintura do Quadro',
            'description' => 'Pintura eletrostática do quadro',
            'work_cell_id' => $this->workCells['pintura']->id,
            'status' => 'pending',
            'setup_time_minutes' => 30,
            'cycle_time_minutes' => 60,
            'depends_on_step_id' => $step1->id,
        ]);
        
        // Step 3: Paint Quality Check
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 3,
            'step_type' => 'quality_check',
            'name' => 'Inspeção de Pintura',
            'description' => 'Verificar qualidade da pintura',
            'work_cell_id' => $this->workCells['inspecao']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 10,
            'depends_on_step_id' => $step2->id,
            'quality_check_mode' => 'entire_lot',
        ]);
    }
    
    private function createFrameStructureManufacturingSteps($route): void
    {
        // Step 1: Tube Cutting
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 10,
            'step_type' => 'standard',
            'name' => 'Corte de Tubos',
            'description' => 'Cortar tubos no comprimento especificado',
            'work_cell_id' => $this->workCells['usinagem']->id,
            'status' => 'pending',
            'setup_time_minutes' => 15,
            'cycle_time_minutes' => 10,
        ]);
        
        // Step 2: Welding
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 20,
            'step_type' => 'standard',
            'name' => 'Soldagem',
            'description' => 'Soldar tubos conforme gabarito',
            'work_cell_id' => $this->workCells['soldagem']->id,
            'status' => 'pending',
            'setup_time_minutes' => 30,
            'cycle_time_minutes' => 45,
        ]);
        
        // Step 3: Weld Quality Check
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 25,
            'step_type' => 'quality_check',
            'name' => 'Inspeção de Solda',
            'description' => 'Verificar qualidade das soldas',
            'work_cell_id' => $this->workCells['inspecao']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 15,
            'quality_check_mode' => 'sampling',
            'sampling_size' => 3,
        ]);
        
        // Step 4: Finishing
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 30,
            'step_type' => 'standard',
            'name' => 'Acabamento',
            'description' => 'Lixar e preparar para pintura',
            'work_cell_id' => $this->workCells['usinagem']->id,
            'status' => 'pending',
            'setup_time_minutes' => 10,
            'cycle_time_minutes' => 20,
        ]);
    }
    
    private function createWheelManufacturingSteps($route): void
    {
        // Step 1: Spoke Assembly
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 10,
            'step_type' => 'standard',
            'name' => 'Raiação da Roda',
            'description' => 'Montar raios no aro e cubo',
            'work_cell_id' => $this->workCells['montagem_rodas']->id,
            'status' => 'pending',
            'setup_time_minutes' => 10,
            'cycle_time_minutes' => 25,
        ]);
        
        // Step 2: Wheel Truing
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 20,
            'step_type' => 'standard',
            'name' => 'Centragem da Roda',
            'description' => 'Centrar e balancear roda',
            'work_cell_id' => $this->workCells['montagem_rodas']->id,
            'status' => 'pending',
            'setup_time_minutes' => 5,
            'cycle_time_minutes' => 15,
        ]);
        
        // Step 3: Wheel Quality Check
        ManufacturingStep::create([
            'manufacturing_route_id' => $route->id,
            'step_number' => 30,
            'step_type' => 'quality_check',
            'name' => 'Inspeção de Roda',
            'description' => 'Verificar centragem e tensão dos raios',
            'work_cell_id' => $this->workCells['inspecao']->id,
            'status' => 'pending',
            'setup_time_minutes' => 3,
            'cycle_time_minutes' => 5,
            'quality_check_mode' => 'every_part',
        ]);
    }
    
    private function createChildOrders($parentOrder, $creator): void
    {
        if (!$parentOrder->bill_of_material_id) {
            return;
        }
        
        $bomVersion = $parentOrder->billOfMaterial->currentVersion;
        if (!$bomVersion) {
            return;
        }
        
        // Get level 1 BOM items with eager loaded item relationship
        $level1Items = $bomVersion->items()->with('item')->where('level', 1)->get();
        
        foreach ($level1Items as $bomItem) {
            // Only create child orders for manufactured items
            if ($bomItem->item->item_type !== 'manufactured') {
                continue;
            }
            
            $childOrder = ManufacturingOrder::create([
                'order_number' => sprintf('OP-%s-%04d-C%d', date('Y'), $parentOrder->id, $bomItem->id),
                'parent_id' => $parentOrder->id,
                'item_id' => $bomItem->item_id,
                'bill_of_material_id' => $bomItem->item->current_bom_id,
                'quantity' => $bomItem->quantity * $parentOrder->quantity,
                'quantity_completed' => 0,
                'quantity_scrapped' => 0,
                'unit_of_measure' => $bomItem->unit_of_measure,
                'status' => 'planned',
                'priority' => $parentOrder->priority - 10,
                'requested_date' => $parentOrder->planned_start_date,
                'planned_start_date' => $parentOrder->planned_start_date->subDays(5),
                'planned_end_date' => $parentOrder->planned_start_date->subDay(),
                'source_type' => 'parent_order',
                'source_reference' => $parentOrder->order_number,
                'created_by' => $creator->id,
            ]);
            
            // Create route for child order
            $this->createManufacturingRoute($childOrder, $creator);
            
            // Update parent's child order count
            $parentOrder->increment('child_orders_count');
        }
    }
} 