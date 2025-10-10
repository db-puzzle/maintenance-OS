<?php

namespace Tests\Feature\Production;

use App\Models\Production\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BomImportValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user with BOM import permissions
        $this->user = User::factory()->create();
        $this->user->givePermissionTo('production.bom.import');
        $this->actingAs($this->user);
    }

    public function test_rejects_item_import_json_file_in_bom_import()
    {
        // Initialize session
        $response = $this->postJson(route('production.bom.import.init-session'));
        $sessionId = $response->json('sessionId');

        // Create an Item import JSON structure (flat array)
        $itemImportData = [
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
                    'track_inventory' => true,
                    'is_active' => true,
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent(
            'items.json',
            json_encode($itemImportData)
        );

        // Upload the file
        $response = $this->postJson(route('production.bom.import.upload-file'), [
            'sessionId' => $sessionId,
            'file' => $file,
            'bom_info' => json_encode([
                'name' => 'Test BOM',
                'description' => 'Test Description',
                'external_reference' => '',
            ]),
        ]);

        $response->assertSuccessful();

        // Validate the data - should fail because it's an Item import file
        $response = $this->postJson(route('production.bom.import.validate-data'), [
            'sessionId' => $sessionId,
        ]);

        $response->assertSuccessful();
        $validation = $response->json();

        // Assert that validation detected this is an Item import file
        $this->assertNotEmpty($validation['errors']);
        $this->assertStringContainsString(
            'Este parece ser um arquivo de importação de Itens, não de BOM',
            $validation['errors'][0]
        );
    }

    public function test_accepts_valid_bom_json_file()
    {
        // Create test items
        $parentItem = Item::factory()->create([
            'item_number' => 'PARENT-001',
            'can_be_manufactured' => true,
        ]);
        $childItem = Item::factory()->create(['item_number' => 'CHILD-001']);

        // Initialize session
        $response = $this->postJson(route('production.bom.import.init-session'));
        $sessionId = $response->json('sessionId');

        // Create a valid BOM JSON structure (hierarchical)
        $bomData = [
            'items' => [
                [
                    'item_number' => 'PARENT-001',
                    'name' => 'Parent Item',
                    'quantity' => 1,
                    'children' => [
                        [
                            'item_number' => 'CHILD-001',
                            'name' => 'Child Item',
                            'quantity' => 2,
                            'unit_of_measure' => 'UN',
                        ],
                    ],
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent(
            'bom.json',
            json_encode($bomData)
        );

        // Upload the file
        $response = $this->postJson(route('production.bom.import.upload-file'), [
            'sessionId' => $sessionId,
            'file' => $file,
            'bom_info' => json_encode([
                'name' => 'Test BOM',
                'description' => 'Test Description',
                'external_reference' => '',
            ]),
        ]);

        $response->assertSuccessful();

        // Validate the data - should succeed because it's a valid BOM structure
        $response = $this->postJson(route('production.bom.import.validate-data'), [
            'sessionId' => $sessionId,
        ]);

        $response->assertSuccessful();
        $validation = $response->json();

        // Assert that validation passed
        $this->assertEmpty($validation['errors']);
        $this->assertEquals(2, $validation['total_items']);
        $this->assertEquals(2, $validation['valid_items']);
    }

    public function test_rejects_csv_with_item_import_mapping()
    {
        // Initialize session
        $response = $this->postJson(route('production.bom.import.init-session'));
        $sessionId = $response->json('sessionId');

        // Create a CSV that looks like an Item import
        $csvContent = "Item Number,Name,Can Be Sold,Purchase Price,Track Inventory\n";
        $csvContent .= "ITEM-001,Test Item 1,true,100.00,true\n";
        $csvContent .= "ITEM-002,Test Item 2,false,50.00,true\n";

        $file = UploadedFile::fake()->createWithContent('items.csv', $csvContent);

        // Upload the file
        $response = $this->postJson(route('production.bom.import.upload-file'), [
            'sessionId' => $sessionId,
            'file' => $file,
            'bom_info' => json_encode([
                'name' => 'Test BOM',
                'description' => 'Test Description',
                'external_reference' => '',
            ]),
        ]);

        $response->assertSuccessful();

        // Validate with Item-specific field mapping
        $response = $this->postJson(route('production.bom.import.validate-data'), [
            'sessionId' => $sessionId,
            'mapping' => [
                'Item Number' => 'item_number',
                'Name' => 'name',
                'Can Be Sold' => 'can_be_sold',
                'Purchase Price' => 'purchase_price',
                'Track Inventory' => 'track_inventory',
            ],
        ]);

        $response->assertSuccessful();
        $validation = $response->json();

        // Assert that validation detected invalid mapping
        $this->assertNotEmpty($validation['errors']);
        $this->assertStringContainsString(
            'Os campos mapeados parecem ser de uma importação de Itens',
            $validation['errors'][0]
        );
    }
}
