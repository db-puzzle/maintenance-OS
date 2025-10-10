<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ItemImportValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user with Item import permissions
        $this->user = User::factory()->create();
        $this->user->givePermissionTo('production.items.import');
        $this->actingAs($this->user);
    }

    public function test_rejects_bom_json_file_in_item_import()
    {
        // Create a BOM JSON structure (hierarchical with children)
        $bomData = [
            'items' => [
                [
                    'item_number' => 'PARENT-001',
                    'name' => 'Parent Assembly',
                    'quantity' => 1,
                    'children' => [
                        [
                            'item_number' => 'CHILD-001',
                            'name' => 'Child Component',
                            'quantity' => 2,
                            'level' => 1,
                        ],
                    ],
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent(
            'bom_structure.json',
            json_encode($bomData)
        );

        // Try to import the BOM file
        $response = $this->postJson(route('production.items.import'), [
            'file' => $file,
            'update_existing' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'Arquivo inválido',
            'details' => 'Este parece ser um arquivo de importação de BOM, não de Itens. Arquivos de importação de Itens devem conter uma lista plana de itens.',
        ]);
    }

    public function test_rejects_inventor_bom_format_in_item_import()
    {
        // Create an Inventor BOM format (array with children at root)
        $inventorBomData = [
            [
                'item_number' => 'ASSEMBLY-001',
                'name' => 'Main Assembly',
                'children' => [
                    [
                        'item_number' => 'PART-001',
                        'name' => 'Sub Part',
                        'level' => 1,
                    ],
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent(
            'inventor_bom.json',
            json_encode($inventorBomData)
        );

        $response = $this->postJson(route('production.items.import'), [
            'file' => $file,
            'update_existing' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'Arquivo inválido',
            'details' => 'Este parece ser um arquivo de importação de BOM, não de Itens. Arquivos de importação de Itens devem conter uma lista plana de itens.',
        ]);
    }

    public function test_accepts_valid_item_json_file()
    {
        // Create a valid Item JSON structure (flat array)
        $itemData = [
            'exported_at' => '2024-01-01T00:00:00.000000Z',
            'exported_by' => 'Test User',
            'total_items' => 2,
            'items' => [
                [
                    'item_number' => 'ITEM-001',
                    'name' => 'Test Item 1',
                    'description' => 'Test description',
                    'can_be_sold' => true,
                    'can_be_purchased' => true,
                    'purchase_price' => 100.00,
                    'purchase_lead_time_days' => 7,
                    'manufacturing_lead_time_days' => 0,
                    'track_inventory' => true,
                    'min_stock_level' => 10,
                    'is_active' => true,
                ],
                [
                    'item_number' => 'ITEM-002',
                    'name' => 'Test Item 2',
                    'description' => 'Another test item',
                    'can_be_sold' => false,
                    'can_be_purchased' => true,
                    'purchase_price' => 50.00,
                    'purchase_lead_time_days' => 14,
                    'manufacturing_lead_time_days' => 0,
                    'track_inventory' => true,
                    'is_active' => true,
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent(
            'items.json',
            json_encode($itemData)
        );

        $response = $this->postJson(route('production.items.import'), [
            'file' => $file,
            'update_existing' => true,
        ]);

        $response->assertRedirect(route('production.items.index'));
        $response->assertSessionHas('success');

        // Should create 2 items
        $this->assertDatabaseHas('items', ['item_number' => 'ITEM-001']);
        $this->assertDatabaseHas('items', ['item_number' => 'ITEM-002']);
    }

    public function test_rejects_csv_with_bom_mapping()
    {
        // Create a CSV that looks like a BOM import
        $csvContent = "Item Number,Parent Item,Level,Quantity,Position\n";
        $csvContent .= "CHILD-001,PARENT-001,1,2,A1\n";
        $csvContent .= "CHILD-002,PARENT-001,1,3,A2\n";

        $file = UploadedFile::fake()->createWithContent('bom_structure.csv', $csvContent);

        // Try to import with BOM-specific field mapping
        $response = $this->postJson(route('production.items.import'), [
            'file' => $file,
            'mapping' => [
                'Item Number' => 'item_number',
                'Parent Item' => 'parent_item_number',
                'Level' => 'level',
                'Quantity' => 'quantity',
                'Position' => 'position',
            ],
            'update_existing' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'Mapeamento inválido',
            'details' => 'Os campos mapeados parecem ser de uma importação de BOM, não de Itens. Arquivos de BOM contêm informações de estrutura/hierarquia que não são suportadas na importação de Itens.',
        ]);
    }

    public function test_accepts_valid_item_csv_file()
    {
        // Create a valid Item CSV
        $csvContent = "Item Number,Name,Description,Can Be Sold,Purchase Price,Purchase Lead Time,Manufacturing Lead Time\n";
        $csvContent .= "ITEM-001,Test Item 1,Description 1,true,100.00,7,0\n";
        $csvContent .= "ITEM-002,Test Item 2,Description 2,false,50.00,14,0\n";

        $file = UploadedFile::fake()->createWithContent('items.csv', $csvContent);

        $response = $this->postJson(route('production.items.import'), [
            'file' => $file,
            'mapping' => [
                'Item Number' => 'item_number',
                'Name' => 'name',
                'Description' => 'description',
                'Can Be Sold' => 'can_be_sold',
                'Purchase Price' => 'purchase_price',
                'Purchase Lead Time' => 'purchase_lead_time_days',
                'Manufacturing Lead Time' => 'manufacturing_lead_time_days',
            ],
            'update_existing' => true,
        ]);

        $response->assertRedirect(route('production.items.index'));
        $response->assertSessionHas('success');

        // Should create 2 items
        $this->assertDatabaseHas('items', ['item_number' => 'ITEM-001']);
        $this->assertDatabaseHas('items', ['item_number' => 'ITEM-002']);
    }
}
