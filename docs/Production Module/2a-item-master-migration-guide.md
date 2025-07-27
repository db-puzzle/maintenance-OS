# Item Master Migration Guide - From Separate Product/BOM to Unified Design

## Overview

This document outlines the steps required to migrate from the current design (separate `products` and `bom_items` tables) to a unified item master approach where everything is a potential product. This change will make the system more flexible and align with standard ERP practices.

## Migration Strategy

Since the system hasn't been released yet, we'll modify the original migration files rather than creating new ones. This keeps the database history clean.

## Step 1: Update Database Migrations

### 1.1 Create Items Table Migration

Update/rename the existing products table migration to create an items table instead:

**File: `database/migrations/2025_01_10_000004_create_items_table.php`** (rename from create_products_table.php)

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
            
            // Current BOM reference (for manufactured items)
            $table->unsignedBigInteger('current_bom_id')->nullable();
            $table->foreign('current_bom_id')->references('id')->on('bill_of_materials')->nullOnDelete();
            
            // Physical attributes
            $table->string('unit_of_measure', 20)->default('EA');
            $table->decimal('weight', 10, 4)->nullable();
            $table->json('dimensions')->nullable(); // {length, width, height, unit}
            
            // Business attributes (when sold)
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
            $table->index('current_bom_id');
            $table->index(['can_be_sold', 'is_active']);
            $table->index(['can_be_manufactured', 'is_active']);
            $table->index(['can_be_purchased', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
```

### 1.2 Update Item BOM History Table

**File: `database/migrations/2025_01_10_000005_create_item_bom_history_table.php`** (rename from create_product_bom_history_table.php)

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_bom_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bill_of_material_id')->constrained('bill_of_materials');
            
            // Effectivity dates
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            
            // Change tracking
            $table->text('change_reason')->nullable();
            $table->string('change_order_number', 100)->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['item_id', 'effective_from']);
            $table->index('bill_of_material_id');
        });
        
        // Add exclusion constraint for PostgreSQL to prevent overlapping date ranges
        DB::statement('ALTER TABLE item_bom_history ADD CONSTRAINT no_overlapping_dates EXCLUDE USING gist (item_id WITH =, daterange(effective_from, effective_to, \'[)\') WITH &&)');
    }

    public function down(): void
    {
        Schema::dropIfExists('item_bom_history');
    }
};
```

### 1.3 Update BOM Items Table

**File: `database/migrations/2025_01_10_000008_create_bom_items_table.php`**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bom_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bom_version_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('parent_item_id')->nullable();
            $table->foreign('parent_item_id')->references('id')->on('bom_items')->cascadeOnDelete();
            
            // Reference to item master
            $table->foreignId('item_id')->constrained();
            
            // BOM-specific attributes
            $table->decimal('quantity', 10, 4)->default(1);
            $table->string('unit_of_measure', 20)->default('EA');
            $table->integer('level')->default(0); // Hierarchy level
            $table->integer('sequence_number')->nullable(); // Order within parent
            
            // Reference designators (for electronics)
            $table->text('reference_designators')->nullable();
            
            // 3D rendering support
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('model_file_path', 500)->nullable();
            
            // BOM-specific metadata
            $table->json('bom_notes')->nullable();
            $table->json('assembly_instructions')->nullable();
            
            // QR code tracking
            $table->string('qr_code', 100)->unique()->nullable();
            $table->timestamp('qr_generated_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['bom_version_id', 'parent_item_id']);
            $table->index('item_id');
            $table->index('qr_code');
            $table->index(['level', 'sequence_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_items');
    }
};
```

### 1.4 Update Production Orders Table

**File: `database/migrations/2025_01_10_000014_create_production_orders_table.php`**

```php
// Update the manufacturing_orders migration to reference items instead of products
Schema::create('manufacturing_orders', function (Blueprint $table) {
    // ... other columns ...
    
    // Change from product_id to item_id
    $table->foreignId('item_id')->constrained();
    
    // ... rest of the columns remain the same ...
});
```

## Step 2: Update Models

### 2.1 Create Item Model

**File: `app/Models/Production/Item.php`**

```php
<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

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
        'current_bom_id',
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
    ];

    // Relationships
    public function currentBom(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class, 'current_bom_id');
    }

    public function bomHistory(): HasMany
    {
        return $this->hasMany(ItemBomHistory::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function bomItems(): HasMany
    {
        return $this->hasMany(BomItem::class);
    }

    public function manufacturingOrders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class);
    }

    // Scopes
    public function scopeSellable($query)
    {
        return $query->where('can_be_sold', true)->where('is_active', true);
    }

    public function scopeManufacturable($query)
    {
        return $query->where('can_be_manufactured', true)->where('is_active', true);
    }

    public function scopePurchasable($query)
    {
        return $query->where('can_be_purchased', true)->where('is_active', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('status', 'active');
    }

    // Helper methods
    public function isSellable(): bool
    {
        return $this->can_be_sold && $this->is_active;
    }

    public function isManufacturable(): bool
    {
        return $this->can_be_manufactured && $this->current_bom_id !== null;
    }

    public function isPurchasable(): bool
    {
        return $this->can_be_purchased;
    }

    public function hasActiveBom(): bool
    {
        return $this->current_bom_id !== null && $this->currentBom?->is_active;
    }

    public function getEffectiveBom(\Carbon\Carbon $date = null): ?BillOfMaterial
    {
        $date = $date ?? now();
        
        $history = $this->bomHistory()
            ->where('effective_from', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to')
                    ->orWhere('effective_to', '>', $date);
            })
            ->with('billOfMaterial')
            ->first();

        return $history?->billOfMaterial;
    }

    // Business logic
    public function canBeDeleted(): bool
    {
        // Check if item is used in any active BOMs
        $usedInBoms = BomItem::where('item_id', $this->id)
            ->whereHas('bomVersion', function ($query) {
                $query->where('is_current', true);
            })
            ->exists();

        // Check if item has open production orders
        $hasOpenOrders = $this->manufacturingOrders()
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        return !$usedInBoms && !$hasOpenOrders;
    }

    public function updateBom(BillOfMaterial $bom, array $changeData = []): ItemBomHistory
    {
        // End current BOM history
        $currentHistory = $this->bomHistory()
            ->whereNull('effective_to')
            ->first();

        if ($currentHistory) {
            $currentHistory->update(['effective_to' => now()]);
        }

        // Create new history record
        $history = $this->bomHistory()->create([
            'bill_of_material_id' => $bom->id,
            'effective_from' => now(),
            'change_reason' => $changeData['reason'] ?? null,
            'change_order_number' => $changeData['change_order'] ?? null,
            'approved_by' => auth()->id(),
        ]);

        // Update current BOM reference
        $this->update(['current_bom_id' => $bom->id]);

        return $history;
    }
}
```

### 2.2 Update BomItem Model

**File: `app/Models/Production/BomItem.php`**

```php
<?php

namespace App\Models\Production;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BomItem extends Model
{
    protected $fillable = [
        'bom_version_id',
        'parent_item_id',
        'item_id', // Now references items table
        'quantity',
        'unit_of_measure',
        'level',
        'sequence_number',
        'reference_designators',
        'thumbnail_path',
        'model_file_path',
        'bom_notes',
        'assembly_instructions',
        'qr_code',
        'qr_generated_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'bom_notes' => 'array',
        'assembly_instructions' => 'array',
        'qr_generated_at' => 'datetime',
    ];

    // Relationships
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function bomVersion(): BelongsTo
    {
        return $this->belongsTo(BomVersion::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_item_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_item_id');
    }

    public function routing(): HasOne
    {
        return $this->hasOne(ManufacturingRoute::class);
    }

    // Helper methods
    public function getItemNumber(): string
    {
        return $this->item->item_number;
    }

    public function getItemName(): string
    {
        return $this->item->name;
    }

    public function isSellable(): bool
    {
        return $this->item->can_be_sold;
    }

    public function getEffectiveRouting(): ?ManufacturingRoute
    {
        // Direct routing
        if ($this->routing && $this->routing->is_active) {
            return $this->routing;
        }
        
        // Inherited routing from parent
        if ($this->parent) {
            return $this->parent->getEffectiveRouting();
        }
        
        return null;
    }

    public function getTotalCost(): float
    {
        $itemCost = $this->item->cost ?? 0;
        $totalCost = $itemCost * $this->quantity;

        // Add costs of all children
        foreach ($this->children as $child) {
            $totalCost += $child->getTotalCost();
        }

        return $totalCost;
    }

    public function canStartProduction(): bool
    {
        // Check all children have completed routing
        foreach ($this->children as $child) {
            if ($child->hasRouting() && !$child->isProductionComplete()) {
                return false;
            }
        }
        
        return true;
    }

    private function hasRouting(): bool
    {
        return $this->getEffectiveRouting() !== null;
    }

    private function isProductionComplete(): bool
    {
        // Implementation depends on production tracking system
        return false;
    }
}
```

### 2.3 Update ManufacturingOrder Model

**File: `app/Models/Production/ManufacturingOrder.php`**

```php
// Update the relationship from product() to item()
public function item(): BelongsTo
{
    return $this->belongsTo(Item::class);
}

// Remove the product() relationship method
```

### 2.4 Create ItemBomHistory Model

**File: `app/Models/Production/ItemBomHistory.php`**

```php
<?php

namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemBomHistory extends Model
{
    protected $table = 'item_bom_history';

    protected $fillable = [
        'item_id',
        'bill_of_material_id',
        'effective_from',
        'effective_to',
        'change_reason',
        'change_order_number',
        'approved_by',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    // Relationships
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Scopes
    public function scopeEffectiveOn($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>', $date);
            });
    }

    public function scopeCurrent($query)
    {
        return $query->whereNull('effective_to');
    }

    // Helper methods
    public function isEffective(): bool
    {
        $now = now();
        return $this->effective_from <= $now && 
               ($this->effective_to === null || $this->effective_to > $now);
    }
}
```

## Step 3: Update Controllers

### 3.1 Rename ProductController to ItemController

**File: `app/Http/Controllers/Production/ItemController.php`**

```php
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\BillOfMaterial;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Item::class);

        $items = Item::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('item_number', 'like', "%{$search}%");
            })
            ->when($request->input('type'), function ($query, $type) {
                switch ($type) {
                    case 'sellable':
                        $query->sellable();
                        break;
                    case 'manufacturable':
                        $query->manufacturable();
                        break;
                    case 'purchasable':
                        $query->purchasable();
                        break;
                }
            })
            ->with(['currentBom', 'createdBy'])
            ->paginate($request->input('per_page', 10));

        return Inertia::render('production/items/index', [
            'items' => $items,
            'filters' => $request->only(['search', 'type', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', Item::class),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Item::class);

        return Inertia::render('production/items/create', [
            'itemTypes' => ['manufactured', 'purchased', 'phantom', 'service'],
            'categories' => Item::distinct()->pluck('category')->filter(),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Item::class);

        $validated = $request->validate([
            'item_number' => 'required|string|max:100|unique:items',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'item_type' => 'required|in:manufactured,purchased,phantom,service',
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'unit_of_measure' => 'required|string|max:20',
            'list_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'lead_time_days' => 'nullable|integer|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
        ]);

        $validated['created_by'] = auth()->id();
        $item = Item::create($validated);

        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item created successfully.');
    }

    public function show(Item $item): Response
    {
        $this->authorize('view', $item);

        $item->load([
            'currentBom.currentVersion',
            'bomHistory.billOfMaterial',
            'createdBy',
        ]);

        // Get where this item is used
        $whereUsed = BomItem::where('item_id', $item->id)
            ->with(['bomVersion.billOfMaterial', 'bomVersion' => function ($query) {
                $query->where('is_current', true);
            }])
            ->get()
            ->filter(fn($bomItem) => $bomItem->bomVersion !== null);

        return Inertia::render('production/items/show', [
            'item' => $item,
            'whereUsed' => $whereUsed,
            'can' => [
                'update' => auth()->user()->can('update', $item),
                'delete' => auth()->user()->can('delete', $item),
                'manageBom' => auth()->user()->can('manageBom', $item),
            ],
        ]);
    }

    public function edit(Item $item): Response
    {
        $this->authorize('update', $item);

        return Inertia::render('production/items/edit', [
            'item' => $item,
            'itemTypes' => ['manufactured', 'purchased', 'phantom', 'service'],
            'categories' => Item::distinct()->pluck('category')->filter(),
        ]);
    }

    public function update(Request $request, Item $item)
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'item_type' => 'required|in:manufactured,purchased,phantom,service',
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'is_active' => 'boolean',
            'status' => 'in:prototype,active,phasing_out,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'list_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'lead_time_days' => 'nullable|integer|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
        ]);

        $item->update($validated);

        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item updated successfully.');
    }

    public function destroy(Item $item)
    {
        $this->authorize('delete', $item);

        if (!$item->canBeDeleted()) {
            return back()->with('error', 'Item cannot be deleted because it is used in active BOMs or has open production orders.');
        }

        $item->delete();

        return redirect()->route('production.items.index')
            ->with('success', 'Item deleted successfully.');
    }

    public function assignBom(Request $request, Item $item)
    {
        $this->authorize('manageBom', $item);

        $validated = $request->validate([
            'bill_of_material_id' => 'required|exists:bill_of_materials,id',
            'change_reason' => 'nullable|string',
            'change_order_number' => 'nullable|string|max:100',
        ]);

        $bom = BillOfMaterial::findOrFail($validated['bill_of_material_id']);
        
        $item->updateBom($bom, [
            'reason' => $validated['change_reason'],
            'change_order' => $validated['change_order_number'],
        ]);

        return back()->with('success', 'BOM assigned successfully.');
    }

    public function bomHistory(Item $item)
    {
        $this->authorize('view', $item);

        $history = $item->bomHistory()
            ->with(['billOfMaterial', 'approvedBy'])
            ->orderBy('effective_from', 'desc')
            ->get();

        return response()->json(['history' => $history]);
    }
}
```

### 3.2 Update BomController

Update references from products to items in the BomController.

### 3.3 Update ProductionOrderController

Update to use items instead of products.

## Step 4: Update Policies

### 4.1 Create ItemPolicy

**File: `app/Policies/Production/ItemPolicy.php`**

```php
<?php

namespace App\Policies\Production;

use App\Models\Production\Item;
use App\Models\User;

class ItemPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.items.view');
    }

    public function view(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('production.items.create');
    }

    public function update(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.update');
    }

    public function delete(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.delete') && $item->canBeDeleted();
    }

    public function manageBom(User $user, Item $item): bool
    {
        return $user->hasPermissionTo('production.items.manage_bom') && $item->can_be_manufactured;
    }
}
```

### 4.2 Update AuthServiceProvider

**File: `app/Providers/AuthServiceProvider.php`**

```php
// Remove Product policy and add Item policy
protected $policies = [
    // ... other policies ...
    \App\Models\Production\Item::class => \App\Policies\Production\ItemPolicy::class,
    // Remove: \App\Models\Production\Product::class => \App\Policies\Production\ProductPolicy::class,
];
```

## Step 5: Update Permissions

### 5.1 Update ProductionPermissionSeeder

**File: `database/seeders/ProductionPermissionSeeder.php`**

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class ProductionPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Item Management (replaces product permissions)
            'production.items.view',
            'production.items.create',
            'production.items.update',
            'production.items.delete',
            'production.items.manage_bom',
            
            // BOM Management
            'production.bom.view',
            'production.bom.create',
            'production.bom.update',
            'production.bom.delete',
            'production.bom.import',
            
            // Routing Management
            'production.routing.view',
            'production.routing.create',
            'production.routing.update',
            'production.routing.delete',
            
            // Production Planning
            'production.planning.view',
            'production.planning.create',
            'production.planning.schedule',
            'production.planning.release',
            
            // Production Tracking
            'production.tracking.scan',
            'production.tracking.update',
            
            // Shipments
            'production.shipments.view',
            'production.shipments.create',
            'production.shipments.update',
            'production.shipments.manifest',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
    }
}
```

## Step 6: Update Factories

### 6.1 Create ItemFactory

**File: `database/factories/Production/ItemFactory.php`**

```php
<?php

namespace Database\Factories\Production;

use App\Models\Production\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        $itemType = $this->faker->randomElement(['manufactured', 'purchased', 'phantom', 'service']);
        
        return [
            'item_number' => strtoupper($this->faker->unique()->bothify('??-###-??')),
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'category' => $this->faker->randomElement(['Electronics', 'Mechanical', 'Assembly', 'Raw Material']),
            'item_type' => $itemType,
            'can_be_sold' => $itemType !== 'phantom',
            'can_be_purchased' => in_array($itemType, ['purchased', 'service']),
            'can_be_manufactured' => in_array($itemType, ['manufactured', 'phantom']),
            'is_active' => true,
            'status' => 'active',
            'unit_of_measure' => $this->faker->randomElement(['EA', 'KG', 'M', 'L', 'BOX']),
            'weight' => $this->faker->randomFloat(4, 0.1, 100),
            'list_price' => $this->faker->randomFloat(2, 10, 1000),
            'cost' => $this->faker->randomFloat(2, 5, 500),
            'lead_time_days' => $this->faker->numberBetween(0, 30),
            'track_inventory' => true,
            'created_by' => 1, // Will be overridden in seeder
        ];
    }

    public function sellable(): static
    {
        return $this->state(fn (array $attributes) => [
            'can_be_sold' => true,
            'list_price' => $this->faker->randomFloat(2, 10, 1000),
        ]);
    }

    public function manufacturable(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'manufactured',
            'can_be_manufactured' => true,
            'can_be_purchased' => false,
        ]);
    }

    public function purchasable(): static
    {
        return $this->state(fn (array $attributes) => [
            'item_type' => 'purchased',
            'can_be_purchased' => true,
            'can_be_manufactured' => false,
            'preferred_vendor' => $this->faker->company(),
            'vendor_item_number' => strtoupper($this->faker->bothify('VND-###-??')),
        ]);
    }
}
```

### 6.2 Update BomItemFactory

**File: `database/factories/Production/BomItemFactory.php`**

```php
// Update to reference item_id instead of creating inline item data
public function definition(): array
{
    return [
        'bom_version_id' => BomVersion::factory(),
        'item_id' => Item::factory(), // Reference to items table
        'quantity' => $this->faker->randomFloat(4, 1, 10),
        'unit_of_measure' => 'EA',
        'level' => 0,
        'sequence_number' => $this->faker->numberBetween(1, 100),
    ];
}
```

## Step 7: Update Seeders

### 7.1 Update ProductionTestDataSeeder

**File: `database/seeders/ProductionTestDataSeeder.php`**

```php
<?php

namespace Database\Seeders;

use App\Models\Production\Item;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProductionTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        // Create base components (purchased items)
        $screw = Item::factory()->purchasable()->create([
            'item_number' => 'SCREW-M5-20',
            'name' => 'M5x20 Machine Screw',
            'category' => 'Fasteners',
            'unit_of_measure' => 'EA',
            'cost' => 0.05,
            'list_price' => 0.10,
            'created_by' => $admin->id,
        ]);

        $bracket = Item::factory()->purchasable()->create([
            'item_number' => 'BRACKET-STEEL-L',
            'name' => 'L-Shaped Steel Bracket',
            'category' => 'Hardware',
            'unit_of_measure' => 'EA',
            'cost' => 2.50,
            'list_price' => 5.00,
            'created_by' => $admin->id,
        ]);

        // Create sub-assembly (manufacturable, can be sold as spare)
        $motorAssembly = Item::factory()->manufacturable()->sellable()->create([
            'item_number' => 'MOTOR-ASSY-001',
            'name' => 'Motor Assembly Unit',
            'category' => 'Assemblies',
            'unit_of_measure' => 'EA',
            'cost' => 45.00,
            'list_price' => 89.99,
            'created_by' => $admin->id,
        ]);

        // Create BOM for motor assembly
        $motorBom = BillOfMaterial::create([
            'bom_number' => 'BOM-MOTOR-001',
            'name' => 'Motor Assembly BOM',
            'description' => 'Bill of materials for motor assembly',
            'created_by' => $admin->id,
        ]);

        $motorBomVersion = BomVersion::create([
            'bill_of_material_id' => $motorBom->id,
            'version_number' => 1,
            'revision_notes' => 'Initial version',
            'published_at' => now(),
            'published_by' => $admin->id,
            'is_current' => true,
        ]);

        // Assign BOM to motor assembly
        $motorAssembly->updateBom($motorBom, ['reason' => 'Initial BOM assignment']);

        // Add items to motor BOM
        BomItem::create([
            'bom_version_id' => $motorBomVersion->id,
            'item_id' => $bracket->id,
            'quantity' => 2,
            'level' => 1,
            'sequence_number' => 10,
        ]);

        BomItem::create([
            'bom_version_id' => $motorBomVersion->id,
            'item_id' => $screw->id,
            'quantity' => 8,
            'level' => 1,
            'sequence_number' => 20,
        ]);

        // Create finished product (manufacturable, sellable)
        $machine = Item::factory()->manufacturable()->sellable()->create([
            'item_number' => 'MACHINE-PRO-2024',
            'name' => 'Professional Machine 2024',
            'category' => 'Finished Products',
            'unit_of_measure' => 'EA',
            'cost' => 250.00,
            'list_price' => 599.99,
            'created_by' => $admin->id,
        ]);

        // Create BOM for finished product
        $machineBom = BillOfMaterial::create([
            'bom_number' => 'BOM-MACHINE-2024',
            'name' => 'Professional Machine 2024 BOM',
            'description' => 'Complete bill of materials for Professional Machine',
            'created_by' => $admin->id,
        ]);

        $machineBomVersion = BomVersion::create([
            'bill_of_material_id' => $machineBom->id,
            'version_number' => 1,
            'revision_notes' => 'Initial release',
            'published_at' => now(),
            'published_by' => $admin->id,
            'is_current' => true,
        ]);

        // Assign BOM to machine
        $machine->updateBom($machineBom, ['reason' => 'Initial BOM assignment']);

        // Add motor assembly to machine BOM
        BomItem::create([
            'bom_version_id' => $machineBomVersion->id,
            'item_id' => $motorAssembly->id,
            'quantity' => 1,
            'level' => 1,
            'sequence_number' => 10,
        ]);

        // Add direct components to machine
        BomItem::create([
            'bom_version_id' => $machineBomVersion->id,
            'item_id' => $bracket->id,
            'quantity' => 4,
            'level' => 1,
            'sequence_number' => 20,
        ]);

        // Create a service item (not manufacturable, but sellable)
        $warranty = Item::factory()->create([
            'item_number' => 'WARRANTY-EXT-1YR',
            'name' => '1 Year Extended Warranty',
            'category' => 'Services',
            'item_type' => 'service',
            'can_be_sold' => true,
            'can_be_purchased' => false,
            'can_be_manufactured' => false,
            'unit_of_measure' => 'EA',
            'list_price' => 99.99,
            'created_by' => $admin->id,
        ]);

        $this->command->info('Production test data seeded successfully!');
        $this->command->info("Created items: {$screw->item_number}, {$bracket->item_number}, {$motorAssembly->item_number}, {$machine->item_number}, {$warranty->item_number}");
    }
}
```

## Step 8: Update Routes

### 8.1 Update Production Routes

**File: `routes/production.php`**

```php
// Update from products to items
Route::prefix('production/items')->group(function () {
    Route::get('/', [ItemController::class, 'index'])->name('production.items.index');
    Route::get('/create', [ItemController::class, 'create'])->name('production.items.create');
    Route::post('/', [ItemController::class, 'store'])->name('production.items.store');
    Route::get('/{item}', [ItemController::class, 'show'])->name('production.items.show');
    Route::get('/{item}/edit', [ItemController::class, 'edit'])->name('production.items.edit');
    Route::put('/{item}', [ItemController::class, 'update'])->name('production.items.update');
    Route::delete('/{item}', [ItemController::class, 'destroy'])->name('production.items.destroy');
    
    // BOM management
    Route::post('/{item}/bom', [ItemController::class, 'assignBom'])->name('production.items.bom.assign');
    Route::get('/{item}/bom-history', [ItemController::class, 'bomHistory'])->name('production.items.bom.history');
});

// Rest of the routes remain the same...
```

## Step 9: Database Migration Commands

After making all the changes above, run the following commands:

```bash
# Drop all tables and re-migrate (since system hasn't been released)
php artisan migrate:fresh

# Seed the database with permissions
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=ProductionPermissionSeeder

# Seed test data
php artisan db:seed --class=ProductionTestDataSeeder
```

## Step 10: Update API Documentation

Update any API documentation to reflect the change from products to items:

1. All endpoints that previously referenced `/products` should now reference `/items`
2. All response fields that had `product_id` should now have `item_id`
3. Update any example requests/responses

## Summary

This migration guide transforms the production module from having separate Product and BOM Item entities to a unified Item master approach. Key benefits:

1. **Flexibility**: Any item can be sold, purchased, or manufactured
2. **Simplicity**: Single source of truth for all items
3. **Scalability**: Easy to add new item types or change item purposes
4. **Realistic**: Matches real-world business needs

The migration maintains all existing functionality while adding the flexibility to sell components, buy finished goods, or change item purposes as business needs evolve. 