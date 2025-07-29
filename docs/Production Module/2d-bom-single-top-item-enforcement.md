# BOM Single Top Item Enforcement Plan

## Overview

This document outlines the plan to enforce that each Bill of Materials (BOM) must have exactly one top-level item, representing the single SKU that the BOM produces. This change will make the system more aligned with standard manufacturing practices where a BOM explicitly declares what it builds.

## Current State Analysis

### Problems with Current Implementation
1. **Multiple top-level items allowed**: BOMs can have multiple items with `parent_item_id = null`
2. **Ambiguous output**: It's unclear what SKU a BOM produces
3. **Implicit product**: The BOM itself is treated as the product, not an explicit Item
4. **Manufacturing Order complexity**: MOs must determine what they're building at runtime

### Current Structure
```
BOM (e.g., "Bicycle BOM")
├── Frame Assembly (level 1, parent_id: null)
├── Wheel Set (level 1, parent_id: null)
├── Brake System (level 1, parent_id: null)
└── ... more top-level components
```

## Proposed New Structure

### Conceptual Model
```
BOM (e.g., "Bicycle BOM") → produces → Item (SKU: "BIKE-001")
└── BOM Version
    └── Single Root BOM Item (the output product)
        ├── Frame Assembly (component)
        ├── Wheel Set (component)
        ├── Brake System (component)
        └── ... more components
```

### Key Changes
1. **BOM has `output_item_id`**: Explicitly declares what the BOM produces
2. **Single root BOM item**: Each BOM version has exactly one item with `parent_item_id = null`
3. **Root item matches output**: The root BOM item must reference the same Item as the BOM's `output_item_id`
4. **Components are children**: All components become children of the root item

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Modify `bill_of_materials` table migration
```php
// File: database/migrations/2025_01_10_000002_create_bill_of_materials_table.php

Schema::create('bill_of_materials', function (Blueprint $table) {
    $table->id();
    $table->string('bom_number', 100)->unique();
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->string('external_reference', 100)->nullable();
    
    // NEW: Reference to the item this BOM produces
    $table->foreignId('output_item_id')->constrained('items');
    
    $table->boolean('is_active')->default(true);
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->timestamps();
    
    $table->index('bom_number');
    $table->index('external_reference');
    $table->index('is_active');
    $table->index('output_item_id'); // NEW index
});
```

#### 1.2 Update foreign key constraint in items table
```php
// File: database/migrations/2025_01_10_000017_add_foreign_key_to_items_table.php

// Remove the current_bom_id foreign key since relationship is now reversed
// Items no longer point to BOMs; BOMs point to their output item
```

#### 1.3 Create pivot table for item-bom relationship (optional)
```php
// File: database/migrations/2025_01_10_000018_create_item_bom_table.php

// This allows tracking which BOMs can produce an item
Schema::create('item_bom', function (Blueprint $table) {
    $table->id();
    $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
    $table->foreignId('bill_of_material_id')->constrained('bill_of_materials')->cascadeOnDelete();
    $table->boolean('is_primary')->default(false); // Primary BOM for the item
    $table->timestamps();
    
    $table->unique(['item_id', 'bill_of_material_id']);
    $table->index('item_id');
    $table->index('bill_of_material_id');
});
```

### Phase 2: Model Updates

#### 2.1 Update BillOfMaterial Model
```php
// app/Models/Production/BillOfMaterial.php

class BillOfMaterial extends Model
{
    protected $fillable = [
        'bom_number',
        'name',
        'description',
        'external_reference',
        'output_item_id', // NEW
        'is_active',
        'created_by',
    ];

    /**
     * Get the item this BOM produces.
     */
    public function outputItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'output_item_id');
    }

    /**
     * Ensure single root item in versions.
     */
    public function ensureSingleRootItem(BomVersion $version): void
    {
        $rootItems = $version->items()
            ->whereNull('parent_item_id')
            ->count();

        if ($rootItems > 1) {
            throw new \Exception('BOM version cannot have multiple root items');
        }

        if ($rootItems === 1) {
            $rootItem = $version->items()
                ->whereNull('parent_item_id')
                ->first();

            if ($rootItem->item_id !== $this->output_item_id) {
                throw new \Exception('Root item must match BOM output item');
            }
        }
    }
}
```

#### 2.2 Update Item Model
```php
// app/Models/Production/Item.php

class Item extends Model
{
    // Remove current_bom_id from fillable
    protected $fillable = [
        'item_number',
        'name',
        'description',
        // ... other fields
        // 'current_bom_id', // REMOVED
    ];

    /**
     * Get BOMs that produce this item.
     */
    public function billOfMaterials(): HasMany
    {
        return $this->hasMany(BillOfMaterial::class, 'output_item_id');
    }

    /**
     * Get the primary BOM for this item.
     */
    public function primaryBom(): HasOne
    {
        return $this->hasOne(BillOfMaterial::class, 'output_item_id')
            ->where('is_active', true)
            ->latest();
    }
}
```

#### 2.3 Update BomItem Model
```php
// app/Models/Production/BomItem.php

class BomItem extends Model
{
    /**
     * Validation rules for BOM structure.
     */
    public static function validateStructure(BomVersion $version): array
    {
        $errors = [];
        
        // Check for single root item
        $rootItems = $version->items()
            ->whereNull('parent_item_id')
            ->get();
        
        if ($rootItems->count() === 0) {
            $errors[] = 'BOM must have exactly one root item';
        } elseif ($rootItems->count() > 1) {
            $errors[] = 'BOM cannot have multiple root items';
        } else {
            $rootItem = $rootItems->first();
            $bom = $version->billOfMaterial;
            
            if ($rootItem->item_id !== $bom->output_item_id) {
                $errors[] = 'Root item must match BOM output item';
            }
            
            if ($rootItem->quantity !== 1) {
                $errors[] = 'Root item quantity must be 1';
            }
        }
        
        return $errors;
    }
}
```

### Phase 3: Controller Updates

#### 3.1 Update BillOfMaterialController
```php
// app/Http/Controllers/Production/BillOfMaterialController.php

public function store(Request $request)
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'description' => 'nullable|string',
        'external_reference' => 'nullable|string|max:100',
        'output_item_id' => 'required|exists:items,id', // NEW validation
        'is_active' => 'nullable|boolean',
    ]);

    // Verify the item can be manufactured
    $item = Item::findOrFail($validated['output_item_id']);
    if (!$item->can_be_manufactured) {
        return back()->withErrors(['output_item_id' => 'Selected item cannot be manufactured']);
    }

    $validated['created_by'] = auth()->id();
    $validated['is_active'] = $validated['is_active'] ?? true;
    $validated['bom_number'] = $this->generateBomNumber();
    
    DB::transaction(function () use ($validated, &$bom) {
        $bom = BillOfMaterial::create($validated);
        
        // Create initial version
        $version = $bom->createVersion('Initial version', auth()->id());
        
        // Create root BOM item for the output
        $version->items()->create([
            'item_id' => $bom->output_item_id,
            'parent_item_id' => null,
            'quantity' => 1,
            'unit_of_measure' => $bom->outputItem->unit_of_measure,
            'level' => 0,
            'sequence_number' => 0,
        ]);
    });

    return redirect()->route('production.bom.show', $bom)
        ->with('success', 'BOM created successfully.');
}

public function addItem(Request $request, BillOfMaterial $bom)
{
    $validated = $request->validate([
        'item_id' => 'required|exists:items,id',
        'parent_item_id' => 'required|exists:bom_items,id', // NOW REQUIRED
        'quantity' => 'required|numeric|min:0.0001',
        // ... other fields
    ]);

    $currentVersion = $bom->currentVersion;
    
    // Prevent adding items at root level
    if (!$validated['parent_item_id']) {
        return back()->withErrors(['parent_item_id' => 'Items must be added under the root product']);
    }
    
    // Verify parent belongs to this BOM
    $parent = BomItem::findOrFail($validated['parent_item_id']);
    if ($parent->bomVersion->bill_of_material_id !== $bom->id) {
        return back()->withErrors(['parent_item_id' => 'Parent item does not belong to this BOM']);
    }
    
    // Rest of the implementation...
}
```

### Phase 4: Service Updates

#### 4.1 Update BomImportService
```php
// app/Services/Production/BomImportService.php

private function createBomStructure(BillOfMaterial $bom, BomVersion $version, array $items): void
{
    // First, create the root item
    $rootBomItem = $version->items()->create([
        'item_id' => $bom->output_item_id,
        'parent_item_id' => null,
        'quantity' => 1,
        'unit_of_measure' => $bom->outputItem->unit_of_measure,
        'level' => 0,
        'sequence_number' => 0,
    ]);
    
    // Then create all imported items as children of the root
    $itemMap = [];
    
    foreach ($items as $itemData) {
        // Adjust levels (increment by 1 since we added a root)
        $itemData['level'] = ($itemData['level'] ?? 0) + 1;
        
        // If this was a top-level item, make it a child of root
        if (empty($itemData['parent'])) {
            $itemData['parent_item_id'] = $rootBomItem->id;
        }
        
        // Create the BOM item
        $bomItem = $this->createBomItem($version, $itemData, $itemMap);
        $itemMap[$itemData['reference']] = $bomItem;
    }
}
```

### Phase 5: UI Updates

#### 5.1 Update BOM Creation Form
```tsx
// resources/js/pages/production/bom/show.tsx

// Add item selection for BOM output
<div className="space-y-2">
    <Label htmlFor="output_item_id">Produto Final *</Label>
    <ItemSelect
        value={data.output_item_id}
        onValueChange={(value) => setData('output_item_id', value)}
        items={items.filter(item => item.can_be_manufactured)}
        placeholder="Selecione o produto que esta BOM produz"
        required
    />
    {errors.output_item_id && (
        <p className="text-sm text-destructive">{errors.output_item_id}</p>
    )}
    <p className="text-xs text-muted-foreground">
        Este é o SKU que será produzido ao executar esta BOM
    </p>
</div>
```

#### 5.2 Update BOM Configuration Component
```tsx
// resources/js/components/production/HierarchicalConfiguration.tsx

// Modify to show root item as non-editable
// Ensure all new items are added as children of existing items
// Remove ability to add items without a parent
```

### Phase 6: Testing Updates

#### 6.1 Update BOM Tests
```php
// tests/Feature/Production/BillOfMaterialTest.php

public function test_bom_must_have_output_item()
{
    $response = $this->post(route('production.bom.store'), [
        'name' => 'Test BOM',
        'description' => 'Test',
        // Missing output_item_id
    ]);
    
    $response->assertSessionHasErrors('output_item_id');
}

public function test_bom_cannot_have_multiple_root_items()
{
    $bom = BillOfMaterial::factory()->create();
    $version = $bom->currentVersion;
    
    // Try to create second root item
    $response = $this->post(route('production.bom.add-item', $bom), [
        'item_id' => Item::factory()->create()->id,
        'parent_item_id' => null, // Trying to add at root
        'quantity' => 1,
    ]);
    
    $response->assertSessionHasErrors('parent_item_id');
}
```

### Phase 7: Manufacturing Order Updates

#### 7.1 Simplify MO Creation

```php
// app/Http/Controllers/Production/ManufacturingOrderController.php

public function store(Request $request)
{
    $validated = $request->validate([
        'bill_of_material_id' => 'required|exists:bill_of_materials,id',
        'quantity' => 'required|numeric|min:1',
        // ... other fields
    ]);
    
    $bom = BillOfMaterial::findOrFail($validated['bill_of_material_id']);
    
    // No need to specify output item - it's defined by the BOM
    $validated['item_id'] = $bom->output_item_id;
    
    // Create MO...
}
```

## Phase 9: Manufacturing Order Hierarchy Simplification

### Current Problem

Currently, when creating a Manufacturing Order from a BOM, the system:
1. Creates a "parent" MO that represents the overall order
2. Then creates child MOs for each top-level BOM item
3. Results in an extra MO that doesn't correspond to any actual BOM item

Example of current structure:
```
MO-00001 (Parent MO for "Bicycle" - extra/redundant)
├── MO-00001-001 (Frame Assembly)
├── MO-00001-002 (Wheel Set)
├── MO-00001-003 (Brake System)
└── ... more child MOs
```

### New Simplified Structure

With single top BOM item enforcement, we can eliminate the redundant parent MO:
```
MO-00001 (Bicycle - the actual root BOM item)
├── MO-00001-001 (Frame Assembly)
├── MO-00001-002 (Wheel Set)
├── MO-00001-003 (Brake System)
└── ... more child MOs
```

### Implementation Changes

#### 9.1 Update ManufacturingOrder Model
```php
// app/Models/Production/ManufacturingOrder.php

/**
 * Create child orders based on BOM items.
 */
public function createChildOrders(): void
{
    if (!$this->bill_of_material_id) {
        return;
    }
    
    $this->load(['billOfMaterial.currentVersion.items']);
    
    DB::transaction(function () {
        // Get the root BOM item
        $rootBomItem = $this->billOfMaterial->currentVersion->items()
            ->whereNull('parent_item_id')
            ->first();
        
        if (!$rootBomItem) {
            throw new \Exception('BOM has no root item');
        }
        
        // Verify this MO is for the root item
        if ($this->item_id !== $rootBomItem->item_id) {
            throw new \Exception('Manufacturing order item does not match BOM root item');
        }
        
        // Create orders for the root item's children only
        $this->createChildOrdersFromBomItems(
            $this->billOfMaterial->currentVersion->id,
            $rootBomItem->id, // Use root BOM item as parent, not null
            $this->id, // This order represents the root item
            1 // Initial quantity multiplier
        );
        
        $this->updateChildOrderCounts();
    });
}

/**
 * No longer need to handle null parent_item_id in recursion
 */
private function createChildOrdersFromBomItems($bomVersionId, $parentItemId, $parentOrderId, $parentQuantity = 1): void
{
    // Get BOM items that are children of the specified parent
    $bomItems = \App\Models\Production\BomItem::where('bom_version_id', $bomVersionId)
        ->where('parent_item_id', $parentItemId) // Always has a parent now
        ->with('item')
        ->get();
    
    // Rest of the implementation remains the same...
}
```

#### 9.2 Update ManufacturingOrderService
```php
// app/Services/Production/ManufacturingOrderService.php

public function createOrderFromBom(array $data): ManufacturingOrder
{
    return DB::transaction(function () use ($data) {
        $bom = BillOfMaterial::findOrFail($data['bill_of_material_id']);
        
        // The MO is for the BOM's output item
        $data['item_id'] = $bom->output_item_id;
        
        // Ensure we have the root BOM item's unit of measure
        $rootBomItem = $bom->currentVersion->items()
            ->whereNull('parent_item_id')
            ->first();
            
        $data['unit_of_measure'] = $data['unit_of_measure'] ?? $rootBomItem->unit_of_measure;
        
        // Generate order number if not provided
        if (!isset($data['order_number'])) {
            $data['order_number'] = $this->generateOrderNumber();
        }

        $order = ManufacturingOrder::create($data);
        
        // Create child orders for components
        $order->createChildOrders();
        
        return $order->fresh(['item', 'billOfMaterial', 'children']);
    });
}
```

#### 9.3 Simplify Order Creation UI
```tsx
// resources/js/pages/production/manufacturing-orders/create.tsx

// When BOM is selected, automatically populate the item field
// and make it read-only since it's determined by the BOM
const handleBomChange = (bomId: string) => {
    const selectedBom = billsOfMaterial.find(b => b.id === parseInt(bomId));
    if (selectedBom) {
        setData({
            ...data,
            bill_of_material_id: bomId,
            item_id: selectedBom.output_item_id,
            quantity: data.quantity || 1,
            unit_of_measure: selectedBom.output_item.unit_of_measure
        });
    }
};
```

### Benefits of MO Simplification

1. **Eliminates Redundancy**: No more "phantom" parent MO that doesn't produce anything
2. **Clear Hierarchy**: Each MO directly corresponds to a BOM item
3. **Accurate Costing**: The root MO represents actual production of the output SKU
4. **Simplified Logic**: No special handling for "top-level" MOs without items
5. **Better Progress Tracking**: Can track completion of the actual product, not a phantom order

### Testing for MO Changes

```php
// tests/Feature/Production/ManufacturingOrderTest.php

public function test_mo_from_bom_creates_correct_hierarchy()
{
    $bom = BillOfMaterial::factory()
        ->hasCurrentVersion()
        ->create();
    
    $rootItem = $bom->currentVersion->items()
        ->whereNull('parent_item_id')
        ->first();
    
    $response = $this->post(route('production.orders.store'), [
        'order_type' => 'bom',
        'bill_of_material_id' => $bom->id,
        'quantity' => 10,
        'priority' => 50,
    ]);
    
    $mo = ManufacturingOrder::latest()->first();
    
    // The MO should be for the root BOM item
    $this->assertEquals($rootItem->item_id, $mo->item_id);
    
    // Children should be the root item's components
    $this->assertEquals(
        $rootItem->children->count(),
        $mo->children->count()
    );
}

public function test_no_phantom_parent_mo_created()
{
    $bom = BillOfMaterial::factory()->create();
    
    $initialCount = ManufacturingOrder::count();
    
    $response = $this->post(route('production.orders.store'), [
        'order_type' => 'bom',
        'bill_of_material_id' => $bom->id,
        'quantity' => 5,
    ]);
    
    // Count should increase by exactly the number of BOM items
    $bomItemCount = $bom->currentVersion->items()->count();
    $this->assertEquals(
        $initialCount + $bomItemCount,
        ManufacturingOrder::count()
    );
}
```

## Benefits of This Approach

1. **Clear Intent**: Every BOM explicitly declares what it produces
2. **Simplified MO Creation**: No ambiguity about what's being manufactured
3. **Better Validation**: Can validate that components make sense for the output
4. **Accurate Costing**: Direct relationship between BOM and output SKU
5. **Industry Standard**: Aligns with standard MRP/ERP practices
6. **Improved Queries**: Easy to find "all BOMs that produce item X"

## Rollback Plan

If needed, the changes can be rolled back by:
1. Removing the `output_item_id` column from BOMs
2. Restoring the `current_bom_id` column to items
3. Flattening the BOM structure to remove the root item
4. Updating all related code to the previous logic

## Timeline

- **Phase 1-2**: Database and Model changes - 1 day
- **Phase 3-4**: Controller and Service updates - 1 day
- **Phase 5**: UI updates - 1 day
- **Phase 6-7**: Testing and initial MO updates - 1 day
- **Phase 8-9**: MO hierarchy simplification - 1 day

Total estimated time: 5 days

## Next Steps

1. Review and approve this plan
2. Create feature branch for implementation
3. Implement changes in phases
4. Test thoroughly with sample data
5. Document the new structure for users
6. Deploy with fresh migration (`php artisan migrate:fresh --seed`) 