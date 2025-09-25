# Production Planning Query Optimization Recommendations

## Executive Summary

The production planning page (`/production/planning`) currently executes approximately 25 queries when loading, with significant N+1 query issues in the hierarchical manufacturing order loading. This document provides actionable recommendations to reduce the query count to 6-8 well-optimized queries without changing the data model or implementing caching beyond the existing permission system.

## Current Query Analysis

### Query Breakdown (25 total queries)
1. Session & Authentication: 3 queries
2. Permissions: 2 queries (already cached)
3. Manufacturing Orders: 13 queries (main optimization target)
4. Templates & Work Cells: 2 queries
5. Miscellaneous: 5 queries

### Primary Issues Identified

#### 1. Cascading N+1 in Manufacturing Order Hierarchy
```
- Load parent orders (1 query)
- Load items for parents (1 query)
- Load categories for items (1 query)
- Load media for items (1 query)
- Load BOMs for items (1 query)
- Load routes for orders (1 query)
- Load steps for routes (1 query)
- Load work cells for steps (1 query)
- Load child orders (1 query)
- Repeat above for children...
```

#### 2. Duplicate Data Loading
- Items loaded 3 times with overlapping IDs
- Categories loaded 2 times with overlapping IDs
- Manufacturing orders loaded 3 times

#### 3. Inefficient Relationship Loading
- Routes and steps loaded separately when they could be joined
- Work cells loaded after steps instead of being eager loaded

## Optimization Recommendations

### 1. Implement Single-Pass Hierarchical Loading

**Current Approach:**
```php
// Multiple separate queries
$parentIds = ManufacturingOrder::whereNull('parent_id')
    ->whereIn('status', ['draft', 'planned'])
    ->pluck('id');

$parents = ManufacturingOrder::whereIn('id', $parentIds)
    ->with(['item', 'item.category', ...])
    ->get();

$children = ManufacturingOrder::whereIn('parent_id', $parentIds)
    ->with(['item', 'item.category', ...])
    ->get();
```

**Recommended Approach:**
```php
// Single query with all relationships
$allOrderIds = ManufacturingOrder::whereNull('parent_id')
    ->whereIn('status', ['draft', 'planned'])
    ->with(['children' => function ($query) {
        $query->whereIn('status', ['draft', 'planned']);
    }])
    ->pluck('id');

// Get all order IDs including children in one pass
$allOrderIds = ManufacturingOrder::whereIn('id', $allOrderIds)
    ->orWhereIn('parent_id', $allOrderIds)
    ->pluck('id');

// Load everything in one optimized query
$orders = ManufacturingOrder::whereIn('id', $allOrderIds)
    ->with([
        'item' => function ($query) {
            $query->select('id', 'item_number', 'name', 'category_id', 'description');
        },
        'item.category' => function ($query) {
            $query->select('id', 'name', 'parent_id');
        },
        'item.media',
        'item.billOfMaterials' => function ($query) {
            $query->where('is_active', true)->latest();
        },
        'manufacturingRoute' => function ($query) {
            $query->with(['steps' => function ($stepQuery) {
                $stepQuery->orderBy('display_order')
                    ->with(['workCell:id,name,cell_type,is_active']);
            }]);
        },
        'children' => function ($query) {
            $query->with([
                'item:id,item_number,name,category_id',
                'item.category:id,name',
                'item.media',
                'manufacturingRoute.steps' => function ($stepQuery) {
                    $stepQuery->orderBy('display_order')
                        ->with('workCell:id,name,cell_type,is_active');
                }
            ]);
        }
    ])
    ->get();

// Then structure hierarchically in memory
$hierarchical = $orders->whereNull('parent_id')->values();
```

### 2. Optimize Eager Loading with Constraints

**Use select() to limit columns:**
```php
->with([
    'item:id,item_number,name,category_id,description',
    'item.category:id,name,parent_id',
    'manufacturingRoute:id,manufacturing_order_id,name,is_active',
    'manufacturingRoute.steps:id,manufacturing_route_id,name,work_cell_id,sequence,display_order'
])
```

### 3. Implement Query Result Structuring

**Create a dedicated method for hierarchical data preparation:**
```php
private function prepareHierarchicalOrders($orders)
{
    // Group by parent_id for efficient lookup
    $grouped = $orders->groupBy('parent_id');
    
    // Build hierarchy in memory (O(n) complexity)
    $roots = $grouped->get(null, collect());
    
    $roots->each(function ($order) use ($grouped) {
        $this->attachChildren($order, $grouped);
    });
    
    return $roots;
}

private function attachChildren($order, $grouped)
{
    $children = $grouped->get($order->id, collect());
    $order->setRelation('children', $children);
    
    $children->each(function ($child) use ($grouped) {
        $this->attachChildren($child, $grouped);
    });
}
```

### 4. Batch Load Shared Resources

**Load work cells and templates once:**
```php
// These rarely change and are small datasets
$workCells = WorkCell::active()
    ->select('id', 'name', 'description', 'cell_type', 'default_production_rate_per_hour')
    ->orderBy('name')
    ->get();

$routeTemplates = ManufacturingRoute::templates()
    ->with(['steps' => function ($query) {
        $query->orderBy('display_order');
    }])
    ->latest()
    ->get();
```

### 5. Implement Index Optimizations

**Recommended indexes to add:**
```sql
-- Composite index for status filtering
CREATE INDEX idx_manufacturing_orders_status_parent 
ON manufacturing_orders(status, parent_id);

-- Index for order number pattern matching
CREATE INDEX idx_manufacturing_orders_order_number_pattern 
ON manufacturing_orders(order_number varchar_pattern_ops);

-- Composite index for route steps
CREATE INDEX idx_manufacturing_steps_route_display 
ON manufacturing_steps(manufacturing_route_id, display_order);
```

## Expected Results

### Query Reduction
- **Current:** 25 queries
- **Optimized:** 6-8 queries
  1. Session/Auth (3 queries - unchanged)
  2. Permissions (1 query - cached)
  3. Manufacturing orders with all relationships (1 query)
  4. Work cells (1 query)
  5. Route templates (1 query)

### Performance Improvements
- **Reduced round trips:** From 25 to 6-8 database round trips
- **Lower memory overhead:** Eliminate duplicate data loading
- **Faster page load:** Estimated 40-60% reduction in load time
- **Better scalability:** O(n) complexity instead of O(n²) for hierarchy

## Implementation Steps

### Phase 1: Controller Optimization (Immediate)
1. Refactor `PlanningController::index()` to use single-pass loading
2. Implement hierarchical data structuring in memory
3. Add query constraints to limit selected columns

### Phase 2: Model Optimization (Short-term)
1. Add scopes for common query patterns
2. Implement relationship methods with default constraints
3. Add accessor methods for commonly computed properties

### Phase 3: Database Optimization (Medium-term)
1. Add recommended indexes
2. Analyze query execution plans
3. Consider materialized views for complex aggregations (future consideration)

## Code Implementation Example

```php
// In PlanningController.php
public function index(Request $request)
{
    // Get all relevant order IDs first
    $rootOrderIds = ManufacturingOrder::query()
        ->whereNull('parent_id')
        ->whereIn('status', ['draft', 'planned'])
        ->pluck('id');
    
    // Get all orders (parents and children) in one query
    $allOrders = ManufacturingOrder::query()
        ->where(function ($query) use ($rootOrderIds) {
            $query->whereIn('id', $rootOrderIds)
                  ->orWhereIn('parent_id', $rootOrderIds);
        })
        ->with([
            'item:id,item_number,name,category_id,description',
            'item.category:id,name,parent_id',
            'item.media' => function ($query) {
                $query->where('collection_name', 'images')
                      ->orderBy('order_column');
            },
            'item.activeBillOfMaterials',
            'manufacturingRoute' => function ($query) {
                $query->with(['steps' => function ($stepQuery) {
                    $stepQuery->orderBy('display_order')
                        ->with('workCell:id,name,cell_type,is_active');
                }]);
            }
        ])
        ->get();
    
    // Structure hierarchically in memory
    $manufacturingOrders = $this->buildHierarchy($allOrders);
    
    // Load other resources
    $routeTemplates = $this->getRouteTemplates();
    $workCells = $this->getActiveWorkCells();
    
    return Inertia::render('production/planning/index', [
        'manufacturingOrders' => $manufacturingOrders,
        'routeTemplates' => $routeTemplates,
        'workCells' => $workCells,
        'selectedMO' => $request->get('mo'),
        'permissions' => $this->getPlanningPermissions(),
    ]);
}

private function buildHierarchy($orders)
{
    $grouped = $orders->groupBy('parent_id');
    $roots = $grouped->get(null, collect());
    
    $roots->each(function ($order) use ($grouped) {
        $children = $grouped->get($order->id, collect());
        $order->setRelation('children', $children);
        
        // Recursively attach grandchildren if needed
        $children->each(function ($child) use ($grouped) {
            $grandchildren = $grouped->get($child->id, collect());
            if ($grandchildren->isNotEmpty()) {
                $child->setRelation('children', $grandchildren);
            }
        });
    });
    
    return $roots->values();
}
```

## Monitoring and Validation

### Metrics to Track
1. Total query count per page load
2. Total query execution time
3. Memory usage during request
4. Page load time (frontend metric)

### Validation Steps
1. Use Laravel Debugbar to verify query reduction
2. Compare data structure before/after optimization
3. Test with various data volumes (10, 100, 1000+ orders)
4. Verify no regression in functionality

## Conclusion

These optimizations focus on reducing the number of database queries through better use of Laravel's eager loading capabilities and in-memory data structuring. The recommendations maintain the existing data model and don't introduce any caching beyond what's already implemented for permissions. The expected result is a significant reduction in page load time and better scalability as data volume grows.
