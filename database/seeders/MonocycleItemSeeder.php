<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;

class MonocycleItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Criando itens do Monociclo...');
        
        // Obter o primeiro usuário como criador
        $creator = User::first();
        if (!$creator) {
            $this->command->error('Nenhum usuário encontrado. Por favor, crie um usuário primeiro.');
            return;
        }
        
        // Criar ou obter categorias
        $finalProductCategory = ItemCategory::firstOrCreate(
            ['name' => 'Produto Final'],
            [
                'description' => 'Produtos acabados prontos para venda',
                'is_active' => true,
                'created_by' => $creator->id,
            ]
        );
        
        $assemblyCategory = ItemCategory::firstOrCreate(
            ['name' => 'Montagem'],
            [
                'description' => 'Submontagens e componentes',
                'is_active' => true,
                'created_by' => $creator->id,
            ]
        );
        
        $componentCategory = ItemCategory::firstOrCreate(
            ['name' => 'Componente'],
            [
                'description' => 'Componentes e peças individuais',
                'is_active' => true,
                'created_by' => $creator->id,
            ]
        );
        
        $rawMaterialCategory = ItemCategory::firstOrCreate(
            ['name' => 'Matéria Prima'],
            [
                'description' => 'Matérias-primas e componentes básicos',
                'is_active' => true,
                'created_by' => $creator->id,
            ]
        );
        
        // Criar itens do Monociclo
        $items = [
            // Nível 0 - Produto Final
            [
                'item_number' => 'MONO-001',
                'name' => 'Monociclo Completo',
                'description' => 'Monociclo completo pronto para uso',
                'item_category_id' => $finalProductCategory->id,
                'can_be_sold' => true,
                'can_be_purchased' => false,
                'can_be_manufactured' => true,
                'unit_of_measure' => 'EA',
                'weight' => 12.5,
                'dimensions' => ['length' => 50, 'width' => 50, 'height' => 100, 'unit' => 'cm'],
                'list_price' => 599.99,
                'manufacturing_cost' => 350.00,
                'manufacturing_lead_time_days' => 5,
                'track_inventory' => true,
                'min_stock_level' => 5,
                'max_stock_level' => 50,
                'reorder_point' => 10,
            ],
            
            // Nível 1 - Montagens
            [
                'item_number' => 'FORK-ASM-001',
                'name' => 'Conjunto do Garfo',
                'description' => 'Conjunto completo do garfo com rolamentos',
                'item_category_id' => $assemblyCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => false,
                'can_be_manufactured' => true,
                'unit_of_measure' => 'EA',
                'weight' => 2.5,
                'dimensions' => ['length' => 30, 'width' => 10, 'height' => 50, 'unit' => 'cm'],
                'manufacturing_cost' => 80.00,
                'manufacturing_lead_time_days' => 2,
                'track_inventory' => true,
            ],
            
            [
                'item_number' => 'SEAT-ASM-001',
                'name' => 'Conjunto do Banco',
                'description' => 'Banco ajustável com canote e grampo',
                'item_category_id' => $assemblyCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => false,
                'can_be_manufactured' => true,
                'unit_of_measure' => 'EA',
                'weight' => 1.8,
                'dimensions' => ['length' => 30, 'width' => 25, 'height' => 40, 'unit' => 'cm'],
                'manufacturing_cost' => 45.00,
                'manufacturing_lead_time_days' => 1,
                'track_inventory' => true,
            ],
            
            // Nível 2 - Componentes
            [
                'item_number' => 'WHEEL-001',
                'name' => 'Roda 20 polegadas',
                'description' => 'Roda de 20 polegadas com aro e raios',
                'item_category_id' => $componentCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => false,
                'can_be_manufactured' => true,
                'unit_of_measure' => 'EA',
                'weight' => 3.2,
                'dimensions' => ['diameter' => 50, 'width' => 5, 'unit' => 'cm'],
                'manufacturing_cost' => 60.00,
                'manufacturing_lead_time_days' => 2,
                'track_inventory' => true,
            ],
            
            [
                'item_number' => 'PEDAL-SET-001',
                'name' => 'Conjunto de Pedais',
                'description' => 'Par de pedais com pedivelas',
                'item_category_id' => $componentCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => true,
                'can_be_manufactured' => false,
                'unit_of_measure' => 'SET',
                'weight' => 1.5,
                'dimensions' => ['length' => 20, 'width' => 15, 'height' => 10, 'unit' => 'cm'],
                'purchase_price' => 35.00,
                'purchase_lead_time_days' => 7,
                'track_inventory' => true,
                'preferred_vendor' => 'CycleParts Ltda.',
                'vendor_item_number' => 'CP-PEDAL-M20',
            ],
            
            [
                'item_number' => 'FRAME-001',
                'name' => 'Quadro do Monociclo',
                'description' => 'Quadro de aço para monociclo',
                'item_category_id' => $componentCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => false,
                'can_be_manufactured' => true,
                'unit_of_measure' => 'EA',
                'weight' => 3.0,
                'dimensions' => ['length' => 40, 'width' => 30, 'height' => 60, 'unit' => 'cm'],
                'manufacturing_cost' => 85.00,
                'manufacturing_lead_time_days' => 3,
                'track_inventory' => true,
            ],
            
            // Nível 3 - Matérias-primas/Componentes Básicos
            [
                'item_number' => 'TIRE-001',
                'name' => 'Pneu 20x2.5',
                'description' => 'Pneu de 20 polegadas, largura 2.5 polegadas',
                'item_category_id' => $rawMaterialCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => true,
                'can_be_manufactured' => false,
                'unit_of_measure' => 'EA',
                'weight' => 0.8,
                'dimensions' => ['diameter' => 50, 'width' => 6.35, 'unit' => 'cm'],
                'purchase_price' => 25.00,
                'purchase_lead_time_days' => 5,
                'track_inventory' => true,
                'min_stock_level' => 20,
                'max_stock_level' => 200,
                'reorder_point' => 40,
                'preferred_vendor' => 'TireWorld Fornecedores',
                'vendor_item_number' => 'TW-20X25-MONO',
            ],
            
            [
                'item_number' => 'TUBE-001',
                'name' => 'Câmara de Ar 20 polegadas',
                'description' => 'Câmara de ar para roda de 20 polegadas',
                'item_category_id' => $rawMaterialCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => true,
                'can_be_manufactured' => false,
                'unit_of_measure' => 'EA',
                'weight' => 0.2,
                'purchase_price' => 8.00,
                'purchase_lead_time_days' => 5,
                'track_inventory' => true,
                'min_stock_level' => 30,
                'max_stock_level' => 300,
                'reorder_point' => 60,
                'preferred_vendor' => 'TireWorld Fornecedores',
                'vendor_item_number' => 'TW-TUBE-20',
            ],
            
            [
                'item_number' => 'BEARING-001',
                'name' => 'Conjunto de Rolamentos',
                'description' => 'Rolamentos de esferas de precisão para cubo da roda',
                'item_category_id' => $rawMaterialCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => true,
                'can_be_manufactured' => false,
                'unit_of_measure' => 'SET',
                'weight' => 0.3,
                'purchase_price' => 15.00,
                'purchase_lead_time_days' => 10,
                'track_inventory' => true,
                'min_stock_level' => 50,
                'max_stock_level' => 500,
                'reorder_point' => 100,
                'preferred_vendor' => 'Precision Bearings Cia.',
                'vendor_item_number' => 'PB-6205-2RS',
            ],
            
            [
                'item_number' => 'STEEL-TUBE-001',
                'name' => 'Tubulação de Aço',
                'description' => 'Tubulação de aço cromo-molibdênio para quadro',
                'item_category_id' => $rawMaterialCategory->id,
                'can_be_sold' => false,
                'can_be_purchased' => true,
                'can_be_manufactured' => false,
                'unit_of_measure' => 'M',
                'weight' => 2.5, // per meter
                'purchase_price' => 12.00, // per meter
                'purchase_lead_time_days' => 14,
                'track_inventory' => true,
                'min_stock_level' => 100,
                'max_stock_level' => 1000,
                'reorder_point' => 200,
                'preferred_vendor' => 'Metal Supply Corp.',
                'vendor_item_number' => 'MS-CRMO-25X2',
            ],
        ];
        
        // Criar todos os itens
        foreach ($items as $itemData) {
            $itemData['is_active'] = true;
            $itemData['status'] = 'active';
            $itemData['created_by'] = $creator->id;
            
            Item::create($itemData);
            $this->command->info("Item criado: {$itemData['item_number']} - {$itemData['name']}");
        }
        
        $this->command->info('Itens do monociclo criados com sucesso!');
        $this->command->info('');
        $this->command->info('Estrutura BOM (a ser criada posteriormente):');
        $this->command->info('Nível 0: Monociclo Completo');
        $this->command->info('  Nível 1: Conjunto do Garfo');
        $this->command->info('    Nível 2: Roda');
        $this->command->info('      Nível 3: Pneu, Câmara de Ar');
        $this->command->info('    Nível 2: Quadro');
        $this->command->info('      Nível 3: Tubulação de Aço');
        $this->command->info('    Nível 2: Rolamentos');
        $this->command->info('  Nível 1: Conjunto do Banco');
        $this->command->info('  Nível 1: Conjunto de Pedais');
    }
} 