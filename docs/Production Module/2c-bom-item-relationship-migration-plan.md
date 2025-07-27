# BOM-Item 1-to-1 Relationship Migration Plan

## Executive Summary

This document outlines the migration plan to establish a strict 1-to-1 relationship between Bills of Materials (BOMs) and Items, treating each BOM as the unique "DNA" of its corresponding item. While maintaining the `bill_of_materials` table for future extensibility (phantom BOMs, engineering BOMs), the current implementation makes BOMs transparent to Items, creating a seamless experience where each manufactured item automatically has its own distinct BOM.

## Core Concept: BOM as Item DNA with Future Flexibility

### Philosophy
- **Each manufactured item has exactly one BOM** - The BOM is created automatically when a manufactured item is created
- **BOMs are never shared between items** - In the current implementation, each item maintains its own BOM
- **Transparent Integration** - Users interact with items, and BOMs are managed transparently behind the scenes
- **Copy at Creation** - New items can be created by duplicating an existing item, which automatically creates a new BOM
- **Future Extensibility** - The separate BOM table allows for future phantom/engineering BOMs without restructuring

### Benefits
1. **Clarity** - No confusion about BOM ownership in current implementation
2. **Future Flexibility** - Can add phantom BOMs later without database changes
3. **Independence** - Changes to one item's BOM never affect other items
4. **Traceability** - Clear lineage when items are created from other items
5. **Seamless UX** - Users work with items, BOMs are handled automatically

## Database Schema Changes

### 1. Update Existing Tables for 1-to-1 Relationship

#### 1.1 Update `items` table migration

**File: `2025_01_10_000001_create_items_table.php`**
```php
Schema::create('items', function (Blueprint $table) {
    $table->id();
    $table->string('item_number', 100)->unique();
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->string('category', 100)->nullable();
    
    // Item classification
    $table->enum('item_type', ['manufactured', 'purchased', 'phantom', 'service'])->default('manufactured');
    $table->boolean('can_be_sold')->default(true);
    $table->boolean('can_be_purchased')->default(false);
    $table->boolean('can_be_manufactured')->default(true);
    $table->boolean('is_active')->default(true);
    
    // Status for sellable items
    $table->enum('status', ['prototype', 'active', 'phasing_out', 'discontinued'])->default('active');
    
    // Direct BOM reference (1-to-1 relationship)
    $table->foreignId('bill_of_material_id')->nullable()->constrained('bill_of_materials')->nullOnDelete();
    
    // Lineage tracking
    $table->foreignId('copied_from_item_id')->nullable()->constrained('items')->nullOnDelete();
    $table->timestamp('copied_at')->nullable();
    
    // Physical attributes
    $table->string('unit_of_measure', 20)->default('EA');
    $table->decimal('weight', 10, 4)->nullable();
    $table->json('dimensions')->nullable();
    
    // Business attributes
    $table->decimal('list_price', 10, 2)->nullable();
    $table->decimal('cost', 10, 2)->nullable();
    $table->integer('lead_time_days')->default(0);
    
    // Inventory tracking
    $table->boolean('track_inventory')->default(true);
    $table->decimal('min_stock_level', 10, 2)->nullable();
    $table->decimal('max_stock_level', 10, 2)->nullable();
    $table->decimal('reorder_point', 10, 2)->nullable();
    
    // For purchased items
    $table->string('preferred_vendor', 255)->nullable();
    $table->string('vendor_item_number', 100)->nullable();
    
    // Metadata
    $table->json('tags')->nullable();
    $table->json('custom_attributes')->nullable();
    
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->timestamps();
    
    // Indexes
    $table->index('item_number');
    $table->index('status');
    $table->index('category');
    $table->index('bill_of_material_id');
    $table->unique('bill_of_material_id'); // Enforce 1-to-1 relationship
    $table->index('copied_from_item_id');
});
```

#### 1.2 Update `bill_of_materials` table migration

**File: `2025_01_10_000002_create_bill_of_materials_table.php`**
```php
Schema::create('bill_of_materials', function (Blueprint $table) {
    $table->id();
    $table->string('bom_number', 100)->unique();
    $table->string('name', 255);
    $table->text('description')->nullable();
    $table->string('external_reference', 100)->nullable(); // CAD drawing reference
    $table->boolean('is_active')->default(true);
    
    // For future phantom BOMs (not used in current implementation)
    $table->enum('bom_type', ['standard', 'phantom', 'engineering'])->default('standard');
    $table->boolean('is_phantom')->default(false);
    
    // Lineage tracking (when copied)
    $table->foreignId('copied_from_bom_id')->nullable()->constrained('bill_of_materials')->nullOnDelete();
    
    $table->foreignId('created_by')->nullable()->constrained('users');
    $table->timestamps();
    
    $table->index('bom_number');
    $table->index('external_reference');
    $table->index('is_active');
    $table->index('bom_type');
});
```

#### 1.3 Remove the separate foreign key migration
Since we're adding the foreign key directly in the items table creation, delete:
- `2025_01_10_000017_add_foreign_key_to_items_table.php`

#### 1.4 Remove `item_bom_history` table
Since each item has its own BOM, we don't need a history of BOM assignments. Version history is tracked through `bom_versions`.

Delete the file: `2025_01_10_000005_create_item_bom_history_table.php`

## Model Updates

### 1. Update Item Model

**File: `app/Models/Production/Item.php`**
```php
<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_number',
        'name',
        'description',
        'category',
        'item_type',
        'can_be_sold',
        'can_be_purchased',
        'can_be_manufactured',
        'is_active',
        'status',
        'bill_of_material_id',
        'copied_from_item_id',
        'copied_at',
        'unit_of_measure',
        'weight',
        'dimensions',
        'list_price',
        'cost',
        'lead_time_days',
        'track_inventory',
        'min_stock_level',
        'max_stock_level',
        'reorder_point',
        'preferred_vendor',
        'vendor_item_number',
        'tags',
        'custom_attributes',
        'created_by',
    ];

    protected $casts = [
        'dimensions' => 'array',
        'tags' => 'array',
        'custom_attributes' => 'array',
        'can_be_sold' => 'boolean',
        'can_be_purchased' => 'boolean',
        'can_be_manufactured' => 'boolean',
        'is_active' => 'boolean',
        'track_inventory' => 'boolean',
        'weight' => 'decimal:4',
        'list_price' => 'decimal:2',
        'cost' => 'decimal:2',
        'min_stock_level' => 'decimal:2',
        'max_stock_level' => 'decimal:2',
        'reorder_point' => 'decimal:2',
        'copied_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::created(function ($item) {
            // Automatically create BOM for manufactured items
            if ($item->can_be_manufactured && !$item->bill_of_material_id) {
                $item->createBom();
            }
        });

        static::deleting(function ($item) {
            // When deleting an item, also delete its BOM (cascade)
            if ($item->billOfMaterial) {
                $item->billOfMaterial->delete();
            }
        });
    }

    // Relationships
    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    // Proxy relationship to make BOM transparent
    public function bom(): BelongsTo
    {
        return $this->billOfMaterial();
    }

    // Proxy to BOM versions through the BOM
    public function bomVersions()
    {
        return $this->hasMany(BomVersion::class, 'bill_of_material_id', 'bill_of_material_id');
    }

    // Proxy to current BOM version
    public function currentBomVersion()
    {
        return $this->hasOne(BomVersion::class, 'bill_of_material_id', 'bill_of_material_id')
            ->where('is_current', true);
    }

    public function copiedFrom(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'copied_from_item_id');
    }

    public function copiedItems(): HasMany
    {
        return $this->hasMany(Item::class, 'copied_from_item_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function manufacturingOrders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class);
    }

    // BOM Management Methods (Transparent to users)
    protected function createBom(): BillOfMaterial
    {
        $bom = BillOfMaterial::create([
            'bom_number' => 'BOM-' . $this->item_number,
            'name' => $this->name . ' BOM',
            'description' => 'Bill of Materials for ' . $this->name,
            'is_active' => true,
            'created_by' => $this->created_by ?? auth()->id(),
        ]);

        // Update item with BOM reference
        $this->update(['bill_of_material_id' => $bom->id]);

        // Create initial version
        $bom->versions()->create([
            'version_number' => 1,
            'revision_notes' => 'Initial version',
            'published_at' => now(),
            'published_by' => $this->created_by ?? auth()->id(),
            'is_current' => true,
        ]);

        return $bom;
    }

    public function createNewBomVersion(string $revisionNotes, ?int $userId = null): BomVersion
    {
        if (!$this->billOfMaterial) {
            throw new \Exception('Item does not have a BOM');
        }

        return $this->billOfMaterial->createNewVersion($revisionNotes, $userId);
    }

    public function duplicateWithBom(array $newItemData): Item
    {
        return DB::transaction(function () use ($newItemData) {
            // Create new item
            $newItem = self::create(array_merge($newItemData, [
                'copied_from_item_id' => $this->id,
                'copied_at' => now(),
            ]));

            // If original has BOM, duplicate it
            if ($this->billOfMaterial && $this->can_be_manufactured) {
                $newBom = $this->billOfMaterial->duplicate([
                    'bom_number' => 'BOM-' . $newItem->item_number,
                    'name' => $newItem->name . ' BOM',
                    'description' => 'Bill of Materials for ' . $newItem->name,
                    'created_by' => auth()->id(),
                ]);

                $newItem->update(['bill_of_material_id' => $newBom->id]);
            }

            return $newItem;
        });
    }

    // Helper methods
    public function hasBomStructure(): bool
    {
        return $this->billOfMaterial && 
               $this->currentBomVersion && 
               $this->currentBomVersion->items()->exists();
    }

    public function getBomItemsCount(): int
    {
        return $this->currentBomVersion ? $this->currentBomVersion->items()->count() : 0;
    }

    public function canBeDeleted(): bool
    {
        // Check if item is used in any BOMs
        $usedInBoms = BomItem::where('item_id', $this->id)->exists();

        // Check if item has open production orders
        $hasOpenOrders = $this->manufacturingOrders()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        // Check if other items were copied from this one
        $hasCopiedItems = $this->copiedItems()->exists();

        return !$usedInBoms && !$hasOpenOrders && !$hasCopiedItems;
    }

    // Proxy methods to BOM (making it transparent)
    public function addBomItem(array $data): BomItem
    {
        if (!$this->currentBomVersion) {
            throw new \Exception('No current BOM version found');
        }

        return $this->currentBomVersion->addItem($data);
    }

    public function updateBomItem(BomItem $bomItem, array $data): BomItem
    {
        if (!$this->currentBomVersion) {
            throw new \Exception('No current BOM version found');
        }

        return $this->currentBomVersion->updateItem($bomItem, $data);
    }

    public function removeBomItem(BomItem $bomItem): bool
    {
        if (!$this->currentBomVersion) {
            throw new \Exception('No current BOM version found');
        }

        return $this->currentBomVersion->removeItem($bomItem);
    }

    // Scopes
    public function scopeWithBom($query)
    {
        return $query->whereNotNull('bill_of_material_id');
    }

    public function scopeManufacturable($query)
    {
        return $query->where('can_be_manufactured', true)
                    ->whereNotNull('bill_of_material_id')
                    ->where('is_active', true);
    }
}
```

### 2. Update BillOfMaterial Model

**File: `app/Models/Production/BillOfMaterial.php`**
```php
<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class BillOfMaterial extends Model
{
    use HasFactory;

    protected $table = 'bill_of_materials';

    protected $fillable = [
        'bom_number',
        'name',
        'description',
        'external_reference',
        'is_active',
        'bom_type',
        'is_phantom',
        'copied_from_bom_id',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_phantom' => 'boolean',
    ];

    // Relationships
    public function versions(): HasMany
    {
        return $this->hasMany(BomVersion::class, 'bill_of_material_id');
    }

    public function currentVersion(): HasOne
    {
        return $this->hasOne(BomVersion::class, 'bill_of_material_id')
            ->where('is_current', true);
    }

    // In current implementation, each BOM belongs to exactly one item
    public function item(): HasOne
    {
        return $this->hasOne(Item::class);
    }

    public function copiedFrom(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'copied_from_bom_id');
    }

    public function copiedBoms(): HasMany
    {
        return $this->hasMany(BillOfMaterial::class, 'copied_from_bom_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function manufacturingOrders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class);
    }

    // Get all items in the current version
    public function items()
    {
        return $this->hasManyThrough(
            BomItem::class,
            BomVersion::class,
            'bill_of_material_id',
            'bom_version_id',
            'id',
            'id'
        )->where('bom_versions.is_current', true);
    }

    // Methods
    public function createNewVersion(string $revisionNotes, ?int $userId = null): BomVersion
    {
        return DB::transaction(function () use ($revisionNotes, $userId) {
            // Get current version
            $currentVersion = $this->currentVersion;
            
            if (!$currentVersion) {
                throw new \Exception('No current BOM version found');
            }

            // Mark current version as not current
            $currentVersion->update(['is_current' => false]);

            // Create new version
            $newVersionNumber = $this->versions()->max('version_number') + 1;
            
            $newVersion = $this->versions()->create([
                'version_number' => $newVersionNumber,
                'revision_notes' => $revisionNotes,
                'published_at' => now(),
                'published_by' => $userId ?? auth()->id(),
                'is_current' => true,
                'copied_from_version_id' => $currentVersion->id,
            ]);

            // Copy BOM items from current version
            $currentVersion->copyItemsToVersion($newVersion);

            return $newVersion;
        });
    }

    public function duplicate(array $overrides = []): BillOfMaterial
    {
        return DB::transaction(function () use ($overrides) {
            // Create new BOM
            $newBom = self::create(array_merge([
                'bom_number' => $this->bom_number . '-COPY',
                'name' => $this->name . ' (Copy)',
                'description' => $this->description,
                'external_reference' => $this->external_reference,
                'is_active' => true,
                'bom_type' => $this->bom_type,
                'copied_from_bom_id' => $this->id,
                'created_by' => auth()->id(),
            ], $overrides));

            // Copy current version structure
            if ($this->currentVersion) {
                $newVersion = $newBom->versions()->create([
                    'version_number' => 1,
                    'revision_notes' => "Copied from {$this->bom_number}",
                    'published_at' => now(),
                    'published_by' => auth()->id(),
                    'is_current' => true,
                    'copied_from_version_id' => $this->currentVersion->id,
                ]);

                // Deep copy BOM items
                $this->currentVersion->copyItemsToVersion($newVersion);
            }

            return $newBom;
        });
    }

    // Scopes
    public function scopeStandard($query)
    {
        return $query->where('bom_type', 'standard');
    }

    public function scopePhantom($query)
    {
        return $query->where('bom_type', 'phantom');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
```

### 3. Remove ItemBomHistory Model
Delete the file: `app/Models/Production/ItemBomHistory.php`

## Controller Updates

### 1. Update ItemController

**File: `app/Http/Controllers/Production/ItemController.php`**
```php
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\BomVersion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function show(Item $item): Response
    {
        $this->authorize('view', $item);

        $item->load([
            'billOfMaterial.currentVersion.items.item',
            'bomVersions' => function ($query) {
                $query->orderBy('version_number', 'desc');
            },
            'copiedFrom',
            'copiedItems',
            'createdBy',
        ]);

        // Get where this item is used
        $whereUsed = BomItem::where('item_id', $item->id)
            ->with(['bomVersion.billOfMaterial.item'])
            ->get()
            ->filter(fn($bomItem) => $bomItem->bomVersion?->is_current)
            ->groupBy('bomVersion.billOfMaterial.item.id');

        return Inertia::render('production/items/show', [
            'item' => $item,
            'whereUsed' => $whereUsed,
            'can' => [
                'update' => auth()->user()->can('update', $item),
                'delete' => auth()->user()->can('delete', $item),
                'manageBom' => auth()->user()->can('manageBom', $item),
                'duplicate' => auth()->user()->can('create', Item::class),
            ],
        ]);
    }

    public function duplicate(Request $request, Item $item)
    {
        $this->authorize('create', Item::class);

        $validated = $request->validate([
            'item_number' => 'required|string|max:100|unique:items',
            'name' => 'required|string|max:255',
            'copy_bom' => 'boolean',
        ]);

        $newItem = $item->duplicateWithBom([
            'item_number' => $validated['item_number'],
            'name' => $validated['name'],
            'description' => $item->description,
            'category' => $item->category,
            'item_type' => $item->item_type,
            'can_be_sold' => $item->can_be_sold,
            'can_be_purchased' => $item->can_be_purchased,
            'can_be_manufactured' => $item->can_be_manufactured,
            'unit_of_measure' => $item->unit_of_measure,
            'created_by' => auth()->id(),
        ]);

        return redirect()->route('production.items.show', $newItem)
            ->with('success', 'Item duplicated successfully.');
    }

    public function createBomVersion(Request $request, Item $item)
    {
        $this->authorize('manageBom', $item);

        if (!$item->can_be_manufactured) {
            return back()->with('error', 'Only manufactured items can have BOMs');
        }

        $validated = $request->validate([
            'revision_notes' => 'required|string|max:500',
        ]);

        try {
            $newVersion = $item->createNewBomVersion($validated['revision_notes']);
            
            return back()->with('success', 'New BOM version created successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function setBomVersion(Request $request, Item $item, BomVersion $version)
    {
        $this->authorize('manageBom', $item);

        // Verify version belongs to item's BOM
        if ($version->bill_of_material_id !== $item->bill_of_material_id) {
            abort(403, 'Version does not belong to this item');
        }

        $version->makeCurrent();

        return back()->with('success', 'BOM version updated successfully.');
    }
}
```

### 2. Create BomController (focused on BOM management, transparent through items)

**File: `app/Http/Controllers/Production/BomController.php`**
```php
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BomController extends Controller
{
    public function addItem(Request $request, Item $item)
    {
        $this->authorize('manageBom', $item);

        if (!$item->currentBomVersion) {
            return back()->with('error', 'Item does not have a current BOM version');
        }

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'parent_item_id' => 'nullable|exists:bom_items,id',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_of_measure' => 'required|string|max:20',
            'reference_designators' => 'nullable|string',
            'bom_notes' => 'nullable|array',
            'assembly_instructions' => 'nullable|array',
            'sequence_number' => 'nullable|integer',
        ]);

        // Prevent circular references
        if ($validated['item_id'] == $item->id) {
            return back()->with('error', 'Cannot add item to its own BOM');
        }

        // Check if adding this item would create a circular reference
        if ($this->wouldCreateCircularReference($item->id, $validated['item_id'])) {
            return back()->with('error', 'Adding this item would create a circular reference');
        }

        try {
            $bomItem = $item->addBomItem($validated);
            return back()->with('success', 'Item added to BOM successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function updateItem(Request $request, Item $item, BomItem $bomItem)
    {
        $this->authorize('manageBom', $item);

        // Verify BOM item belongs to item's current version
        if ($bomItem->bomVersion->bill_of_material_id !== $item->bill_of_material_id || 
            !$bomItem->bomVersion->is_current) {
            abort(403, 'Invalid BOM item');
        }

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.0001',
            'unit_of_measure' => 'required|string|max:20',
            'reference_designators' => 'nullable|string',
            'bom_notes' => 'nullable|array',
            'assembly_instructions' => 'nullable|array',
        ]);

        try {
            $item->updateBomItem($bomItem, $validated);
            return back()->with('success', 'BOM item updated successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function removeItem(Item $item, BomItem $bomItem)
    {
        $this->authorize('manageBom', $item);

        // Verify BOM item belongs to item's current version
        if ($bomItem->bomVersion->bill_of_material_id !== $item->bill_of_material_id || 
            !$bomItem->bomVersion->is_current) {
            abort(403, 'Invalid BOM item');
        }

        // Check if item has children
        if ($bomItem->children()->exists()) {
            return back()->with('error', 'Cannot remove item with child components. Remove children first.');
        }

        try {
            $item->removeBomItem($bomItem);
            return back()->with('success', 'Item removed from BOM successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function compareVersions(Item $item, BomVersion $version1, BomVersion $version2)
    {
        $this->authorize('view', $item);

        // Verify both versions belong to item's BOM
        if ($version1->bill_of_material_id !== $item->bill_of_material_id || 
            $version2->bill_of_material_id !== $item->bill_of_material_id) {
            abort(403, 'Invalid versions for comparison');
        }

        $comparison = $version1->compareWithVersion($version2);

        return response()->json([
            'comparison' => $comparison,
            'version1' => $version1,
            'version2' => $version2,
        ]);
    }

    public function export(Item $item, BomVersion $version = null)
    {
        $this->authorize('view', $item);

        if (!$item->billOfMaterial) {
            return back()->with('error', 'Item does not have a BOM');
        }

        // Use current version if not specified
        if (!$version) {
            $version = $item->currentBomVersion;
        }

        // Verify version belongs to item's BOM
        if ($version && $version->bill_of_material_id !== $item->bill_of_material_id) {
            abort(403, 'Invalid BOM version');
        }

        if (!$version) {
            return back()->with('error', 'No BOM version found for this item');
        }

        // Generate export (CSV, Excel, PDF based on request)
        $format = request('format', 'csv');
        
        // ... export logic ...
    }

    private function wouldCreateCircularReference($parentItemId, $childItemId): bool
    {
        // Check if childItem's BOM contains parentItem anywhere in its structure
        $childItem = Item::find($childItemId);
        
        if (!$childItem->billOfMaterial) {
            return false;
        }

        $bomItems = $childItem->currentBomVersion?->allItems ?? collect();
        
        return $bomItems->pluck('item_id')->contains($parentItemId);
    }
}
```

## Route Updates

**File: `routes/production.php`**
```php
// Item Management (BOM management is transparent through items)
Route::prefix('production/items')->group(function () {
    Route::get('/', [ItemController::class, 'index'])->name('production.items.index');
    Route::get('/create', [ItemController::class, 'create'])->name('production.items.create');
    Route::post('/', [ItemController::class, 'store'])->name('production.items.store');
    Route::get('/{item}', [ItemController::class, 'show'])->name('production.items.show');
    Route::get('/{item}/edit', [ItemController::class, 'edit'])->name('production.items.edit');
    Route::put('/{item}', [ItemController::class, 'update'])->name('production.items.update');
    Route::delete('/{item}', [ItemController::class, 'destroy'])->name('production.items.destroy');
    
    // Item duplication
    Route::post('/{item}/duplicate', [ItemController::class, 'duplicate'])->name('production.items.duplicate');
    
    // BOM version management (transparent - users work with items)
    Route::post('/{item}/bom/versions', [ItemController::class, 'createBomVersion'])->name('production.items.bom.versions.create');
    Route::post('/{item}/bom/versions/{version}/set-current', [ItemController::class, 'setBomVersion'])->name('production.items.bom.versions.set-current');
    
    // BOM structure management (transparent - users work with items)
    Route::post('/{item}/bom/items', [BomController::class, 'addItem'])->name('production.items.bom.items.add');
    Route::put('/{item}/bom/items/{bomItem}', [BomController::class, 'updateItem'])->name('production.items.bom.items.update');
    Route::delete('/{item}/bom/items/{bomItem}', [BomController::class, 'removeItem'])->name('production.items.bom.items.remove');
    
    // BOM utilities
    Route::get('/{item}/bom/compare/{version1}/{version2}', [BomController::class, 'compareVersions'])->name('production.items.bom.compare');
    Route::get('/{item}/bom/export/{version?}', [BomController::class, 'export'])->name('production.items.bom.export');
});

// No separate BOM routes - everything is managed through items
```

## Frontend Updates

### 1. Update Item Show Page

The Item show page should present BOM management as an integral part of the item:

```tsx
// resources/js/pages/production/items/show.tsx
// The UI remains focused on items, with BOM management integrated seamlessly

const tabs = [
    {
        id: 'general',
        label: 'General Information',
        content: <ItemGeneralInfo item={item} />
    },
    ...(item.can_be_manufactured ? [
        {
            id: 'configuration',
            label: `Configuration (${item.current_bom_version ? item.bom_items_count : 0} items)`,
            icon: <Package className="h-4 w-4" />,
            content: <ItemBomConfiguration item={item} version={item.current_bom_version} />
        },
        {
            id: 'versions',
            label: `Versions (${item.bom_versions_count})`,
            icon: <History className="h-4 w-4" />,
            content: <ItemBomVersions item={item} versions={item.bom_versions} />
        }
    ] : []),
    {
        id: 'where-used',
        label: `Where Used (${item.where_used_count})`,
        content: <WhereUsedTab item={item} whereUsed={whereUsed} />
    },
    ...(item.copied_from ? [
        {
            id: 'lineage',
            label: 'Lineage',
            icon: <GitBranch className="h-4 w-4" />,
            content: <ItemLineageTab item={item} />
        }
    ] : [])
];
```

### 2. Remove Separate BOM Pages

Since BOMs are transparent to users, remove:
- `resources/js/pages/production/bom/index.tsx` (if exists)
- `resources/js/pages/production/bom/show.tsx` (if exists)
- `resources/js/pages/production/bom/create.tsx` (if exists)

## System Impact Analysis

### 1. Manufacturing Orders
- Manufacturing orders reference items and can optionally specify a BOM version
- When creating an MO, the current BOM version is captured automatically
- Historical MOs maintain reference to the exact BOM version used

### 2. Data Integrity
- 1-to-1 relationship enforced at database level with unique constraint
- BOMs are automatically created for manufactured items
- Deletion cascades properly (deleting item deletes its BOM)

### 3. Future Extensibility
- The BOM table structure supports future phantom/engineering BOMs
- The `bom_type` field allows differentiation when needed
- Current implementation focuses on standard BOMs only

### 4. API Consistency
- All BOM operations go through item endpoints
- No separate BOM API needed in current implementation
- Clean, intuitive API focused on items

### 5. Permissions
- BOM permissions are tied to item permissions
- Single permission check for item operations
- Simpler permission model

## Migration Steps

1. **Update Migration Files**
   - Update items table to include `bill_of_material_id` with unique constraint
   - Update bill_of_materials table to include future fields
   - Remove item_bom_history migration

2. **Update Models**
   - Update Item model to transparently manage BOMs
   - Update BillOfMaterial model to support 1-to-1 relationship
   - Add automatic BOM creation on item creation

3. **Update Controllers**
   - All BOM operations through ItemController
   - BomController handles structure management transparently
   - No separate BOM CRUD operations

4. **Update Frontend**
   - Integrate BOM UI into item pages
   - Remove any separate BOM navigation
   - Present unified item interface

5. **Testing**
   - Test automatic BOM creation
   - Test item duplication with BOM
   - Test circular reference prevention
   - Test version management

## Benefits of This Approach

1. **Transparent Integration** - Users work with items, BOMs are handled automatically
2. **Future Flexibility** - Can add phantom BOMs later without restructuring
3. **Data Integrity** - 1-to-1 relationship enforced at database level
4. **Clean Architecture** - Separation of concerns while maintaining simplicity
5. **Intuitive UX** - No confusion about BOM management
6. **Migration Path** - Easy to extend to phantom BOMs when needed

## Future Considerations

When phantom/engineering BOMs are needed:
1. Create separate controllers for phantom BOM management
2. Add UI for creating standalone BOMs
3. Use the `bom_type` field to differentiate
4. Phantom BOMs won't have associated items
5. Can reference phantom BOMs in regular item BOMs

## Conclusion

This migration establishes a clean 1-to-1 relationship between Items and BOMs while maintaining the flexibility for future phantom BOMs. The implementation makes BOMs transparent to users - they work with items and BOMs are managed automatically behind the scenes. This provides the simplicity of integrated management with the architectural flexibility for future extensions. 