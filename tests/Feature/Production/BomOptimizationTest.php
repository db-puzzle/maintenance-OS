<?php

namespace Tests\Feature\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomItem;
use App\Models\Production\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BomOptimizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Administrator');
    }

    #[Test]
    public function it_loads_bom_show_page_efficiently_without_n_plus_one_queries(): void
    {
        // Create a BOM with nested items
        $outputItem = Item::factory()->create(['can_be_manufactured' => true]);
        $bom = BillOfMaterial::factory()->create(['output_item_id' => $outputItem->id]);

        // Get the current version (should be created automatically)
        $version = $bom->currentVersion;

        // If no version exists, create one
        if (! $version) {
            $version = $bom->createVersion('Initial version');
        }

        // Create root item
        $rootItem = BomItem::factory()->create([
            'bom_version_id' => $version->id,
            'item_id' => $outputItem->id,
            'parent_item_id' => null,
            'level' => 0,
        ]);

        // Create child items (3 levels deep with multiple items per level)
        $level1Items = [];
        for ($i = 0; $i < 3; $i++) {
            $level1Items[] = BomItem::factory()->create([
                'bom_version_id' => $version->id,
                'parent_item_id' => $rootItem->id,
                'level' => 1,
            ]);
        }

        // Create level 2 items
        foreach ($level1Items as $level1Item) {
            for ($i = 0; $i < 2; $i++) {
                $level2Item = BomItem::factory()->create([
                    'bom_version_id' => $version->id,
                    'parent_item_id' => $level1Item->id,
                    'level' => 2,
                ]);

                // Create level 3 items
                for ($j = 0; $j < 2; $j++) {
                    BomItem::factory()->create([
                        'bom_version_id' => $version->id,
                        'parent_item_id' => $level2Item->id,
                        'level' => 3,
                    ]);
                }
            }
        }

        // Create additional available items
        Item::factory()->count(20)->create(['is_active' => true]);

        // Enable query logging
        DB::enableQueryLog();

        // Make the request
        $response = $this->actingAs($this->admin)
            ->get(route('production.bom.show', $bom));

        $response->assertStatus(200);

        // Get executed queries
        $queries = DB::getQueryLog();

        // Count queries by type
        $queryTypes = [
            'bom_items' => 0,
            'items' => 0,
            'media' => 0,
        ];

        $itemQueries = [];

        foreach ($queries as $query) {
            $sql = $query['query'];
            if (str_contains($sql, 'from "bom_items"')) {
                $queryTypes['bom_items']++;
            } elseif (str_contains($sql, 'from "items"')) {
                $queryTypes['items']++;
                $itemQueries[] = $sql;
            } elseif (str_contains($sql, 'from "media"')) {
                $queryTypes['media']++;
            }
        }

        // Debug item queries if test fails
        if ($queryTypes['items'] > 2) {
            dump('Item queries:', $itemQueries);
        }

        // Assert that we don't have N+1 queries
        // Should have at most 1 query for bom_items (all items in one query)
        $this->assertLessThanOrEqual(
            1,
            $queryTypes['bom_items'],
            "Too many bom_items queries: {$queryTypes['bom_items']}. This indicates an N+1 problem."
        );

        // Should have at most 3 queries for items:
        // 1. Output item relationship
        // 2. BOM items with their items
        // 3. Available items for the dropdown
        $this->assertLessThanOrEqual(
            3,
            $queryTypes['items'],
            "Too many items queries: {$queryTypes['items']}. This indicates an N+1 problem."
        );

        // Should have at most 1 query for media (all media loaded in a single query)
        $this->assertLessThanOrEqual(
            1,
            $queryTypes['media'],
            "Too many media queries: {$queryTypes['media']}. This indicates an N+1 problem."
        );

        // Total queries should be reasonable (less than 20 for the entire page load)
        $this->assertLessThan(
            20,
            count($queries),
            'Total query count is too high: ' . count($queries)
        );
    }

    #[Test]
    public function it_loads_bom_index_page_efficiently_without_n_plus_one_queries(): void
    {
        // Create multiple BOMs with items
        for ($i = 0; $i < 5; $i++) {
            $outputItem = Item::factory()->create(['can_be_manufactured' => true]);
            $bom = BillOfMaterial::factory()->create(['output_item_id' => $outputItem->id]);

            // Get or create current version
            $version = $bom->currentVersion;
            if (! $version) {
                $version = $bom->createVersion('Initial version');
            }

            // Create multiple items per BOM
            BomItem::factory()->count(10)->create([
                'bom_version_id' => $version->id,
            ]);
        }

        // Enable query logging
        DB::enableQueryLog();

        // Make the request
        $response = $this->actingAs($this->admin)
            ->get(route('production.bom.index'));

        $response->assertStatus(200);

        // Get executed queries
        $queries = DB::getQueryLog();

        // Count queries by type
        $bomItemQueries = 0;
        foreach ($queries as $query) {
            if (str_contains($query['query'], 'from "bom_items"')) {
                $bomItemQueries++;
            }
        }

        // Should have at most 1 query for counting BOM items
        $this->assertLessThanOrEqual(
            1,
            $bomItemQueries,
            "Too many bom_items queries on index page: {$bomItemQueries}"
        );

        // Total queries should be reasonable
        $this->assertLessThan(
            15,
            count($queries),
            'Total query count on index page is too high: ' . count($queries)
        );
    }
}
