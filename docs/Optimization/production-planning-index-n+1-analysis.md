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

### 1. Replace Recursive Descendant Fetching
```php
// Use a single recursive CTE query
$descendants = DB::select("
    WITH RECURSIVE descendants AS (
        SELECT id, parent_id FROM manufacturing_orders WHERE id = ?
        UNION ALL
        SELECT mo.id, mo.parent_id 
        FROM manufacturing_orders mo
        JOIN descendants d ON mo.parent_id = d.id
    )
    SELECT id FROM descendants WHERE id != ?
", [$parentId, $parentId]);
```

### 2. Flatten Hierarchy Loading
```php
// Load all orders and their relationships in one go
$allOrderIds = array_merge([$selectedMO], $descendantIds);
$orders = ManufacturingOrder::whereIn('id', $allOrderIds)
    ->with([
        'item.media',
        'item.category',
        'item.primaryBom',
        'parent',
        'parent.item',
        'manufacturingRoute.item.category',
        'manufacturingRoute.steps.workCell',
        'children' // Load only direct children
    ])
    ->get();

// Build hierarchy in memory
$orderMap = $orders->keyBy('id');
$hierarchy = $this->buildHierarchyFromFlatData($orderMap);
```

### 3. Eager Load Media
```php
'item' => function ($query) {
    $query->with(['media' => function ($mediaQuery) {
        $mediaQuery->where('collection_name', 'images');
    }]);
}
```

### 4. Cache Permission Checks
```php
// In constructor or middleware
$this->userPermissions = Cache::remember(
    "user.{$user->id}.permissions",
    300, // 5 minutes
    fn() => $user->getAllPermissions()->pluck('name')->toArray()
);
```

### 5. Use Database Views for Complex Hierarchies
Consider creating a materialized view for manufacturing order hierarchies:

```sql
CREATE MATERIALIZED VIEW manufacturing_order_hierarchy AS
WITH RECURSIVE hierarchy AS (
    SELECT 
        id, parent_id, item_id, order_number, status,
        0 as level,
        ARRAY[id] as path
    FROM manufacturing_orders
    WHERE parent_id IS NULL
    
    UNION ALL
    
    SELECT 
        mo.id, mo.parent_id, mo.item_id, mo.order_number, mo.status,
        h.level + 1,
        h.path || mo.id
    FROM manufacturing_orders mo
    JOIN hierarchy h ON mo.parent_id = h.id
)
SELECT * FROM hierarchy;
```

### 6. Implement Query Result Caching
```php
$cacheKey = "planning.orders.{$selectedMO}." . md5(json_encode($request->all()));
$data = Cache::remember($cacheKey, 60, function () use ($request) {
    // Current query logic
});
```

### 7. Use Laravel's `lazy()` for Large Datasets
For very large BOMs, consider using lazy loading:

```php
ManufacturingOrder::whereIn('id', $allOrderIds)
    ->with($eagerLoadRelations)
    ->lazy(100)
    ->each(function ($order) use (&$orderCollection) {
        $orderCollection->push($order);
    });
```

## Expected Performance Improvement

After implementing these optimizations:

**Optimized query count**:
- Recursive CTE for descendants: 1
- Flattened hierarchy loading with eager loading: 1-2
- Route templates: 1
- Work cells: 1
- Cached permissions: 0-1

**Total: ~5-6 queries (93% reduction)**

## Implementation Priority

1. **High Priority**: Fix recursive children loading (Issue #2)
   - Highest impact on performance
   - Relatively straightforward to implement

2. **High Priority**: Implement CTE for descendants (Issue #1)
   - Significant performance gain
   - Requires database-specific SQL

3. **Medium Priority**: Eager load media and BOMs (Issues #3 & #4)
   - Good performance gain
   - Easy to implement

4. **Low Priority**: Cache permissions (Issue #5)
   - Minor performance gain
   - Easy to implement

5. **Future**: Database views and advanced caching
   - Best for very large datasets
   - More complex implementation

## Monitoring Recommendations

1. Add query logging in development:
```php
DB::enableQueryLog();
// ... page logic ...
$queries = DB::getQueryLog();
\Log::info('Planning page queries', ['count' => count($queries), 'queries' => $queries]);
```

2. Use Laravel Debugbar or Telescope to monitor query counts in staging

3. Set up alerts for pages executing more than 50 queries

4. Track page load times before and after optimization

## Conclusion

The current implementation suffers from severe N+1 query problems, particularly in the recursive hierarchy loading. A page load that should execute 5-10 queries is instead executing 80+ queries. The recommended optimizations can reduce query count by over 90% while maintaining the same functionality.

The most critical optimization is replacing the recursive `loadAllChildren` method with a flattened eager loading approach. This single change could reduce query count by 50-70% on its own.
