# Production Planning Index - N+1 Query Analysis

## Overview
This document analyzes the database queries executed when loading the Production Planning index page (`/production/planning/index`) with a Parent MO that originated from a BOM. The analysis focuses on identifying N+1 query problems and optimization opportunities.

## Current Query Flow

### 1. Initial Page Load in PlanningController@index

#### Main Query with Eager Loading
```php
ManufacturingOrder::with([
    'item',
    'item.category',
    'parent',
    'parent.item',
    'manufacturingRoute',
    'manufacturingRoute.item',
    'manufacturingRoute.item.category',
    'manufacturingRoute.steps',
    'manufacturingRoute.steps.workCell',
])
```

This initial query attempts to eager load many relationships, but there are several issues.

### 2. Descendant ID Fetching (N+1 Problem #1)

```php
private function getAllDescendantIds($parentId)
{
    $descendantIds = [];
    
    // Get direct children
    $directChildren = ManufacturingOrder::where('parent_id', $parentId)->pluck('id')->toArray();
    
    foreach ($directChildren as $childId) {
        $descendantIds[] = $childId;
        // Recursively get descendants of this child
        $descendantIds = array_merge($descendantIds, $this->getAllDescendantIds($childId));
    }
    
    return $descendantIds;
}
```

**Problem**: This method executes one query per level of hierarchy. For a BOM with 5 levels and 20 items, this could result in 20+ queries.

### 3. Recursive Children Loading (N+1 Problem #2)

```php
private function loadAllChildren($order)
{
    $order->load([
        'children.item',
        'children.item.category',
        'children.parent',
        'children.parent.item',
        'children.manufacturingRoute',
        'children.manufacturingRoute.item',
        'children.manufacturingRoute.item.category',
        'children.manufacturingRoute.steps',
        'children.manufacturingRoute.steps.workCell',
    ]);
    
    if ($order->children->isNotEmpty()) {
        $order->children->each(function ($child) {
            $this->loadAllChildren($child);
        });
    }
}
```

**Problem**: This recursive loading creates exponential queries:
- Level 1: 1 query for children + related data
- Level 2: N queries (one per child)
- Level 3: N*M queries (for each grandchild)
- And so on...

### 4. Route Templates Query
```php
ManufacturingRoute::with(['steps', 'createdBy', 'itemCategory'])
    ->where('is_template', true)
    ->orderBy('created_at', 'desc')
    ->get()
```

This is relatively efficient, loading templates with their relationships in one query.

### 5. Work Cells Query
```php
WorkCell::active()
    ->select('id', 'name', 'description', 'cell_type', 'default_production_rate_per_hour', 'is_active')
    ->orderBy('name')
    ->get()
```

This is efficient - single query with no relationships.

### 6. Media/Image Loading (N+1 Problem #3)

In the Item model, there are several computed attributes that may trigger additional queries:

```php
protected $appends = ['primary_image_url', 'primary_image_data'];

public function getPrimaryImageUrlAttribute(): ?string
{
    if ($this->hasMedia('images')) {
        $media = $this->getFirstMedia('images');
        // ...
    }
}
```

**Problem**: Each item access to `primary_image_url` or `primary_image_data` triggers a media query if not eager loaded.

### 7. BOM Relationship Loading (N+1 Problem #4)

```php
public function primaryBom(): HasOne
{
    return $this->hasOne(BillOfMaterial::class, 'output_item_id')
        ->where('is_active', true)
        ->latest();
}
```

This relationship is not eager loaded in the initial query, so accessing it later will trigger additional queries.

## Identified N+1 Issues

### Issue 1: Recursive Descendant Fetching
- **Impact**: High - O(n) queries where n is the total number of descendants
- **Example**: A 5-level BOM with 50 items = ~50 queries

### Issue 2: Recursive Children Loading
- **Impact**: Very High - Exponential query growth
- **Example**: 3-level hierarchy with 10 items per level = 111 queries

### Issue 3: Media Loading
- **Impact**: Medium - 2 queries per item with images
- **Example**: 50 items with images = 100 additional queries

### Issue 4: Missing BOM Eager Loading
- **Impact**: Medium - 1 query per item that needs BOM data
- **Example**: 20 parent items = 20 additional queries

### Issue 5: Permission Checks
- **Impact**: Low-Medium - Multiple permission checks per user
- **Example**: 8 permission checks, potentially hitting the database each time

## Performance Impact Calculation

For a typical Parent MO from a BOM with:
- 3 levels of hierarchy
- 15 total items
- 10 items with images
- 5 items with BOMs

**Current query count**:
- Initial query with eager loading: 1
- getAllDescendantIds: ~15 queries
- loadAllChildren: ~30 queries (conservative estimate)
- Route templates: 1
- Work cells: 1
- Media queries: ~20 queries
- BOM queries: ~5 queries
- Permission checks: ~8 queries

**Total: ~81 queries for a single page load**

## Optimization Recommendations

### Recommended Eloquent-First Approach

For maintaining consistency with Laravel best practices and your preference for Eloquent over raw SQL, here's the recommended approach:

1. **Use Eloquent's eager loading capabilities to their fullest**
2. **Minimize the number of queries by loading data in batches**
3. **Process hierarchical relationships in memory when the dataset size allows**
4. **Consider using Laravel packages designed for hierarchical data when needed**

The following optimizations prioritize Eloquent methods while still achieving significant performance improvements.

### 1. Replace Recursive Descendant Fetching with Efficient Eloquent Query

```php
private function getAllDescendantIds($parentId)
{
    // Get the parent order to use its order_number pattern
    $parentOrder = ManufacturingOrder::findOrFail($parentId);
    
    // Leverage the order number hierarchy pattern (e.g., MO-001, MO-001.1, MO-001.1.1)
    // This gets all descendants in a single efficient query
    $descendants = ManufacturingOrder::query()
        ->select('id', 'parent_id', 'order_number')
        ->where('order_number', 'like', $parentOrder->order_number . '.%')
        ->pluck('id')
        ->toArray();
    
    return $descendants;
}
```

This approach leverages your existing order numbering scheme to fetch all descendants in a single query, eliminating the N+1 problem entirely.

### 2. Implement Model Relationships with Chaperone

First, update the ManufacturingOrder model to use Laravel 12's `chaperone()` method:

```php
// In app/Models/Production/ManufacturingOrder.php

public function children(): HasMany
{
    return $this->hasMany(ManufacturingOrder::class, 'parent_id')->chaperone();
}

public function parent(): BelongsTo
{
    return $this->belongsTo(ManufacturingOrder::class, 'parent_id');
}
```

The `chaperone()` method automatically hydrates parent models onto their children when iterating through collections, preventing N+1 queries. Note that `chaperone()` is only available on `HasMany` and `MorphMany` relationships, not on `BelongsTo` relationships.

### 3. Flatten Hierarchy Loading with Optimized Eager Loading

```php
public function index(Request $request)
{
    $this->authorize('viewAny', ManufacturingOrder::class);

    if ($request->has('selectedMO')) {
        $selectedMO = $request->input('selectedMO');
        
        // Step 1: Get all descendant IDs efficiently
        $descendantIds = $this->getAllDescendantIds($selectedMO);
        $allOrderIds = array_merge([$selectedMO], $descendantIds);
        
        // Step 2: Load all orders with optimized eager loading
        $orders = ManufacturingOrder::whereIn('id', $allOrderIds)
            ->with([
                'item' => function ($query) {
                    $query->with(['category', 'media', 'primaryBom']);
                },
                'parent.item',
                'manufacturingRoute' => function ($query) {
                    $query->with([
                        'item.category',
                        'steps.workCell'
                    ]);
                },
                'children' // Will use chaperone() from the relationship definition
            ])
            ->get();
        
        // Step 3: Build hierarchy in memory
        $hierarchicalOrders = $this->buildHierarchyFromCollection($orders, $selectedMO);
    } else {
        // Default behavior for top-level orders
        $orders = ManufacturingOrder::with([
            'item.category',
            'item.media',
            'item.primaryBom',
            'manufacturingRoute.item.category',
            'manufacturingRoute.steps.workCell',
            'children' // Will use chaperone()
        ])
        ->whereNull('parent_id')
        ->whereIn('status', ['draft', 'planned'])
        ->get();
        
        $hierarchicalOrders = $orders->toArray();
    }

    // Continue with route templates and other data...
}

private function buildHierarchyFromCollection($orders, $parentId = null)
{
    $orderMap = $orders->keyBy('id');
    $result = [];
    
    foreach ($orders as $order) {
        if ($order->parent_id == $parentId) {
            $orderArray = $order->toArray();
            
            // Recursively build children from the already-loaded collection
            $orderArray['children'] = $this->buildHierarchyFromCollection($orders, $order->id);
            
            $result[] = $orderArray;
        }
    }
    
    return $result;
}
```

### 4. Cache Permission Checks

```php
// In AppServiceProvider or dedicated middleware
public function boot()
{
    // Cache user permissions to avoid repeated database hits
    if (auth()->check()) {
        $user = auth()->user();
        $this->app->singleton('user.permissions', function () use ($user) {
            return Cache::remember(
                "user.{$user->id}.permissions",
                300, // 5 minutes
                fn() => $user->getAllPermissions()->pluck('name')->toArray()
            );
        });
    }
}

// In controller
$permissions = app('user.permissions');
```

### 5. Chaperone() Method Usage

After analyzing the codebase, several models with parent-child relationships would benefit from the `chaperone()` method to prevent N+1 queries:

#### 5.1. ManufacturingOrder (Already Identified)
```php
// In app/Models/Production/ManufacturingOrder.php
public function children(): HasMany
{
    return $this->hasMany(ManufacturingOrder::class, 'parent_id')->chaperone();
}

// Note: parent() relationship remains unchanged - chaperone() not applicable to BelongsTo
public function parent(): BelongsTo
{
    return $this->belongsTo(ManufacturingOrder::class, 'parent_id');
}
```

#### 5.2. BomItem - Hierarchical BOM Structure
```php
// In app/Models/Production/BomItem.php
public function parent(): BelongsTo
{
    return $this->belongsTo(BomItem::class, 'parent_item_id');
}

public function children(): HasMany
{
    return $this->hasMany(BomItem::class, 'parent_item_id')
        ->orderBy('sequence_number')
        ->chaperone();
}
```

#### 5.3. ManufacturingStep - Step Dependencies
```php
// In app/Models/Production/ManufacturingStep.php
public function dependency(): BelongsTo
{
    return $this->belongsTo(ManufacturingStep::class, 'depends_on_step_id');
}

public function dependentSteps(): HasMany
{
    return $this->hasMany(ManufacturingStep::class, 'depends_on_step_id')->chaperone();
}
```

#### 5.4. Role - Role Hierarchy
```php
// In app/Models/Role.php
public function parentRole()
{
    return $this->belongsTo(Role::class, 'parent_role_id');
}

public function childRoles()
{
    return $this->hasMany(Role::class, 'parent_role_id')->chaperone();
}
```

#### 5.5. WorkOrder - Related Work Orders
```php
// In app/Models/WorkOrders/WorkOrder.php
public function relatedWorkOrders(): HasMany
{
    return $this->hasMany(WorkOrder::class, 'related_work_order_id')->chaperone();
}

public function relatedTo(): BelongsTo
{
    return $this->belongsTo(WorkOrder::class, 'related_work_order_id');
}
```

#### 5.6. Asset Hierarchy Relationships
While the asset hierarchy has parent-child relationships, the `chaperone()` method is not applicable here because:
1. The relationships from child to parent are `BelongsTo` relationships
2. `chaperone()` only works on `HasMany` and `MorphMany` relationships

However, if we were to add inverse relationships, those could benefit from chaperone:

```php
// In app/Models/AssetHierarchy/Plant.php
public function areas(): HasMany
{
    return $this->hasMany(Area::class)->chaperone();
}

// In app/Models/AssetHierarchy/Area.php
public function sectors(): HasMany
{
    return $this->hasMany(Sector::class)->chaperone();
}

// In app/Models/AssetHierarchy/Sector.php
public function assets(): HasMany
{
    return $this->hasMany(Asset::class)->chaperone();
}
```

#### 5.7. Media Duplicates
```php
// In app/Models/Media.php
public function originalMedia(): BelongsTo
{
    return $this->belongsTo(Media::class, 'duplicate_of');
}

// Add the missing duplicates relationship with chaperone
public function duplicates(): HasMany
{
    return $this->hasMany(Media::class, 'duplicate_of')->chaperone();
}
```


### 6. Additional Performance Optimizations (FUTURE)

**For Very Large Datasets (1000+ items):**

If your BOMs grow beyond typical sizes, consider these additional optimizations:

```php
// Use chunk loading for memory efficiency
ManufacturingOrder::whereIn('id', $allOrderIds)
    ->with($eagerLoadRelations)
    ->chunkById(100, function ($orders) use (&$collection) {
        $collection = $collection->merge($orders);
    });

// Or implement pagination at the hierarchy level
$perPage = 50;
$topLevelOrders = ManufacturingOrder::whereNull('parent_id')
    ->whereIn('status', ['draft', 'planned'])
    ->paginate($perPage);
```

## Complete Optimized Implementation Summary

The recommended solution combines all optimizations into a clean, efficient implementation:

1. **Model Updates** - Add `chaperone()` to relationships
2. **Efficient Descendant Query** - Use order number pattern matching  
3. **Single Batch Load** - Load all data with proper eager loading
4. **In-Memory Hierarchy Building** - Process relationships in PHP
5. **Permission Caching** - Reduce repeated permission checks

## Monitoring Recommendations (FUTURE)

1. Add query logging in development using Eloquent events:
```php
// In AppServiceProvider boot method
if (config('app.debug')) {
    \Illuminate\Database\Eloquent\Model::getEventDispatcher()->listen('eloquent.*', function ($event, $models) {
        foreach ($models as $model) {
            \Log::debug("Eloquent Event: {$event}", [
                'model' => get_class($model),
                'attributes' => $model->getAttributes()
            ]);
        }
    });
}

// Or use Laravel's built-in query logging
\DB::listen(function ($query) {
    \Log::info('Query executed', [
        'sql' => $query->sql,
        'bindings' => $query->bindings,
        'time' => $query->time
    ]);
});
```

2. Use Laravel Debugbar or Telescope to monitor query counts in staging

3. Set up alerts for pages executing more than 50 queries

4. Track page load times before and after optimization

### Impact on Production Planning Page

For the production planning optimization specifically, the most impactful chaperone() implementations are:

1. **ManufacturingOrder** children - Eliminates N+1 when traversing down the MO hierarchy
2. **BomItem** children - Prevents extra queries when displaying nested BOM structures
3. **ManufacturingStep** dependentSteps - Avoids N+1 when checking which steps depend on a given step

Note that `chaperone()` only helps when iterating through collections of children (HasMany/MorphMany relationships). When accessing parent relationships (BelongsTo), the parent is already loaded directly without N+1 issues.

These changes alone could reduce queries by an additional 10-20% when navigating complex hierarchies.

## System-Wide Impact of Chaperone Implementation

Beyond the production planning page, implementing `chaperone()` across all identified models will benefit:

1. **BOM Management Pages**: Significant improvement when iterating through child BOM items
2. **Work Order Management**: Better performance when displaying lists of related work orders
3. **Asset Hierarchy Views**: Faster loading when displaying all areas in a plant, all sectors in an area, etc.
4. **Role Management**: Improved performance when checking child roles
5. **Manufacturing Execution**: Faster loading when showing dependent steps

The chaperone method is particularly valuable because it:
- Prevents N+1 queries automatically when iterating through HasMany/MorphMany collections
- Works transparently with existing eager loading
- Has zero performance overhead when relationships are already loaded
- Future-proofs the application against N+1 issues in collection iterations
- Only applies to HasMany and MorphMany relationships, not BelongsTo

## Conclusion

The current implementation suffers from severe N+1 query problems, particularly in the recursive hierarchy loading. A page load that should execute 5-10 queries is instead executing 80+ queries. The recommended optimizations can reduce query count by over 90% while maintaining the same functionality.

**The most critical optimization is replacing the recursive `loadAllChildren` method with the flattened eager loading approach.** This single change could reduce query count by 50-70% on its own and is validated as the best practice by Laravel standards.

**Secondary but important: Implement `chaperone()` on all HasMany and MorphMany relationships** to prevent N+1 queries when iterating through collections of child models. Remember that `chaperone()` is not available on BelongsTo relationships, as it's designed specifically for optimizing parent model hydration when iterating through collections of children.
