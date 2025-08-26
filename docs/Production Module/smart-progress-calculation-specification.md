# Smart Progress Calculation Specification

## Overview

This document specifies a new, comprehensive progress calculation system for Manufacturing Orders (MOs) that accounts for the total work across all child MOs and routing steps. Instead of simply measuring "How many items have we produced?", the system will answer "What percentage of expected work have we completed?"

## Current System Limitations

The current progress calculation is simplistic:
```
Progress % = (quantity_completed / quantity) × 100
```

This approach:
- Only considers final output quantity
- Ignores work in progress through routing steps
- Doesn't account for child MO dependencies
- Provides no visibility into actual production effort

## Proposed Smart Progress Formula

### Core Concept

Progress should be calculated based on **total work units** across the entire manufacturing hierarchy:

```
Smart Progress % = (Total Completed Work Units / Total Expected Work Units) × 100
```

### Work Unit Definition

A **Work Unit** represents one unit of product passing through one manufacturing step. For example:
- 100 units × 5 steps = 500 work units
- Each completed step for each unit counts as progress

### Hierarchical Calculation

For MOs with children, the formula accounts for all levels:

```
Total Expected Work Units = Σ(Order Quantity × Number of Steps) for all orders in hierarchy
Total Completed Work Units = Σ(Step Completions) for all orders in hierarchy
```

## Detailed Formula Components

### 1. Single MO Without Children

For a manufacturing order without child orders:

```
Expected Work Units = Order.quantity × Order.route.steps.count
Completed Work Units = Σ(Step.cumulative_quantity_completed) for all steps
Progress % = (Completed Work Units / Expected Work Units) × 100
```

### 2. MO With Child Orders

For hierarchical orders, recursively calculate:

```
Expected Work Units = 
    (Order.quantity × Order.route.steps.count) +
    Σ(Child.Expected Work Units) for all children

Completed Work Units = 
    Σ(Step.cumulative_quantity_completed) for order's steps +
    Σ(Child.Completed Work Units) for all children

Progress % = (Completed Work Units / Expected Work Units) × 100
```

### 3. Weighted by Time (Optional Enhancement)

For more accurate effort representation, weight by estimated time:

```
Work Unit Weight = setup_time_minutes + (cycle_time_minutes × quantity)

Weighted Expected Units = Σ(Step Work Units × Step Time Weight)
Weighted Completed Units = Σ(Completed Step Work Units × Step Time Weight)
```

## Implementation Approach

### Performance Analysis: Stored vs Calculated

#### Option 1: Store in Database
**Pros:**
- Fast reads: O(1) lookup for progress on index page
- Enables efficient filtering/sorting by progress
- Supports database-level aggregations
- Better for dashboards and reports

**Cons:**
- Write overhead on every step completion
- Data consistency challenges
- Storage cost (3 fields × number of MOs)
- Potential for drift/staleness

#### Option 2: Calculate On-the-Fly
**Pros:**
- Always accurate, no drift
- No write overhead
- Less storage required
- Simpler data model

**Cons:**
- Heavy computation on index load
- N+1 query problems with hierarchies
- Poor performance at scale
- Difficult to filter/sort by progress

### Recommended Hybrid Approach

Based on the analysis, I recommend a **hybrid caching strategy**:

1. **Cache in Database** with smart invalidation:
   ```sql
   ALTER TABLE manufacturing_orders 
   ADD COLUMN smart_progress_percentage DECIMAL(5,2) DEFAULT 0,
   ADD COLUMN progress_calculated_at TIMESTAMP NULL,
   ADD INDEX idx_mo_smart_progress (smart_progress_percentage);
   ```

2. **Lazy Calculation** with TTL:
   - Calculate on first access if null
   - Recalculate if older than threshold
   - Background job for batch updates

3. **Strategic Updates**:
   - Update only on significant events
   - Batch updates for child propagation
   - Use database triggers for consistency

### Performance Calculations

Based on typical usage patterns:

#### Write Frequency
- **Step completions**: ~100-500/day in active production
- **Child updates**: ~50-200/day 
- **Total writes**: ~150-700/day

#### Read Frequency
- **Index page loads**: ~1000-5000/day (50 users × 20-100 views)
- **Filtering/sorting**: ~500-2500/day
- **Reports/dashboards**: ~100-500/day
- **Total reads**: ~1600-8000/day

**Read/Write Ratio**: ~10:1 to 20:1 (heavily read-oriented)

### Cost Analysis

#### Storage Cost
```
Per MO: 8 bytes (DECIMAL) + 8 bytes (TIMESTAMP) = 16 bytes
10,000 active MOs × 16 bytes = 160 KB (negligible)
```

#### Computation Cost
```
On-the-fly calculation per MO:
- Simple MO: 1 query (5ms)
- With 5 children + routes: 15 queries (75ms)
- 20 MOs on index: 300 queries (1.5 seconds!)
```

#### Database Write Cost
```
Updates per step completion: 2-3 writes
Daily write overhead: 450-2100 writes
Impact: Minimal with proper indexing
```

### Recommendation Justification

The **hybrid caching approach** is optimal because:

1. **Read-Heavy Pattern**: 10-20x more reads than writes
2. **Unacceptable Read Latency**: 1.5s+ for index page with calculations
3. **Acceptable Write Overhead**: <1ms per step completion
4. **Negligible Storage**: <1MB for 50,000 MOs
5. **Better UX**: Instant progress display, sortable/filterable

### Implementation Strategy

#### Phase 1: Add Cached Fields
```php
// Migration
Schema::table('manufacturing_orders', function (Blueprint $table) {
    $table->decimal('smart_progress_percentage', 5, 2)
          ->default(0)
          ->after('quantity_scrapped');
    $table->timestamp('progress_calculated_at')
          ->nullable()
          ->after('smart_progress_percentage');
    $table->index('smart_progress_percentage');
});
```

#### Phase 2: Smart Update Logic
```php
// In ManufacturingStep model
protected static function booted()
{
    static::updated(function ($step) {
        if ($step->isDirty('cumulative_quantity_completed')) {
            // Queue progress update for parent MO
            UpdateSmartProgress::dispatch($step->manufacturingRoute->manufacturingOrder)
                ->delay(now()->addSeconds(5)); // Debounce rapid updates
        }
    });
}
```

#### Phase 3: Batch Optimization
```php
// Batch update job for child propagation
class UpdateSmartProgressBatch implements ShouldQueue
{
    public function handle()
    {
        DB::statement('
            UPDATE manufacturing_orders mo
            SET smart_progress_percentage = (
                SELECT calculated_progress 
                FROM smart_progress_calculation_view
                WHERE order_id = mo.id
            ),
            progress_calculated_at = NOW()
            WHERE mo.id IN (?)
        ', $this->orderIds);
    }
}
```

### Model Implementation

```php
// In ManufacturingOrder model

public function calculateSmartProgress(): float
{
    $expectedUnits = $this->calculateExpectedWorkUnits();
    $completedUnits = $this->calculateCompletedWorkUnits();
    
    if ($expectedUnits == 0) {
        return $this->status === 'completed' ? 100 : 0;
    }
    
    return round(($completedUnits / $expectedUnits) * 100, 2);
}

private function calculateExpectedWorkUnits(): int
{
    $units = 0;
    
    // This order's work units
    if ($this->has_route) {
        $stepCount = $this->manufacturingRoute->steps()->count();
        $units += $this->quantity * $stepCount;
    } else {
        // Orders without routes count as single step
        $units += $this->quantity;
    }
    
    // Child orders' work units (recursive)
    foreach ($this->children as $child) {
        $units += $child->calculateExpectedWorkUnits();
    }
    
    return $units;
}

private function calculateCompletedWorkUnits(): int
{
    $units = 0;
    
    // This order's completed units
    if ($this->has_route) {
        $units += $this->manufacturingRoute->steps()
            ->sum('cumulative_quantity_completed');
    } else {
        // Orders without routes use quantity_completed
        $units += $this->quantity_completed;
    }
    
    // Child orders' completed units (recursive)
    foreach ($this->children as $child) {
        $units += $child->calculateCompletedWorkUnits();
    }
    
    return $units;
}
```

## Special Cases

### 1. Orders Without Routes
- Count as single-step processes
- Expected work units = quantity
- Completed work units = quantity_completed

### 2. Partially Scrapped Units
- Scrapped units still count as "work done"
- Include in completed work units but flag separately

### 3. Skipped Steps
- Reduce expected work units when steps are skipped
- Maintain audit trail of why steps were skipped

### 4. Parallel Steps
- Count each parallel path separately
- Work units = quantity × number of parallel branches

## Performance Considerations

### Caching Strategy
1. Cache calculated values in database
2. Use database triggers or observers to update
3. Batch updates for large hierarchies

### Query Optimization
```sql
-- Optimized query for progress calculation
WITH RECURSIVE mo_hierarchy AS (
    SELECT id, parent_id, quantity, 0 as level
    FROM manufacturing_orders
    WHERE id = :root_order_id
    
    UNION ALL
    
    SELECT mo.id, mo.parent_id, mo.quantity, h.level + 1
    FROM manufacturing_orders mo
    JOIN mo_hierarchy h ON mo.parent_id = h.id
)
SELECT 
    SUM(expected_units) as total_expected,
    SUM(completed_units) as total_completed
FROM (
    SELECT 
        mo.id,
        mo.quantity * COUNT(ms.id) as expected_units,
        SUM(ms.cumulative_quantity_completed) as completed_units
    FROM mo_hierarchy mo
    LEFT JOIN manufacturing_routes mr ON mr.manufacturing_order_id = mo.id
    LEFT JOIN manufacturing_steps ms ON ms.manufacturing_route_id = mr.id
    GROUP BY mo.id, mo.quantity
) calculations;
```

## UI Updates

### Progress Display
1. **Progress Bar**: Show smart progress percentage
2. **Completed Column**: Show quantity_completed / quantity
3. **Tooltip**: Display work unit breakdown on hover

### Example Display
```
Order: MO-2024-001
Progress: 45% (450/1000 work units)
Completed: 20/100 units

Breakdown:
- Current Order: 100/500 work units (5 steps)
- Child MO-2024-001.1: 200/300 work units (3 steps)  
- Child MO-2024-001.2: 150/200 work units (2 steps)
```

## Migration Strategy

### Phase 1: Parallel Implementation
1. Add new smart_progress fields
2. Calculate both old and new progress
3. Display new progress in tooltip

### Phase 2: UI Transition
1. Make smart progress primary display
2. Move simple progress to "Completed" column
3. Add user preference toggle

### Phase 3: Full Migration
1. Remove old progress calculation
2. Optimize queries for smart progress
3. Archive migration code

## Benefits

1. **Accurate Progress Tracking**: Reflects actual work completed
2. **Early Progress Visibility**: Shows progress through early manufacturing steps
3. **Better Planning**: More accurate completion estimates
4. **Hierarchical Insights**: Understand progress at all levels
5. **Performance Metrics**: Can identify bottlenecks in routing

## Future Enhancements

1. **Time-Weighted Progress**: Factor in setup and cycle times
2. **Quality-Adjusted Progress**: Reduce progress for failed quality checks
3. **Resource Utilization**: Include machine/operator availability
4. **Predictive Analytics**: Use historical data for better estimates
5. **Real-time Updates**: WebSocket updates for live progress

## Performance Best Practices

### 1. Debouncing Updates
- Group rapid step completions within 5-second windows
- Use Redis or database flags to prevent duplicate calculations
- Batch child order updates together

### 2. Selective Calculation
- Only recalculate affected branches of hierarchy
- Use database CTEs for efficient recursive queries
- Cache intermediate results for large hierarchies

### 3. Background Processing
```php
// Nightly job to ensure consistency
class RecalculateStaleProgress implements ShouldQueue
{
    public function handle()
    {
        ManufacturingOrder::where('progress_calculated_at', '<', now()->subHours(24))
            ->orWhereNull('progress_calculated_at')
            ->chunk(100, function ($orders) {
                UpdateSmartProgressBatch::dispatch($orders->pluck('id')->toArray());
            });
    }
}
```

### 4. Read Optimization
- Use database views for complex calculations
- Implement query result caching for reports
- Consider read replicas for heavy dashboard usage

## N+1 Query Risks and Mitigation

### Identified N+1 Risks

#### 1. Hierarchical Child Loading
**Risk**: Loading 20 MOs with avg 5 children each = 100+ queries
```php
// BAD: N+1 for each level
foreach ($orders as $order) {
    foreach ($order->children as $child) {
        $progress = $child->calculateSmartProgress(); // Loads route + steps
    }
}
```

**Mitigation**: Eager load full hierarchy
```php
// GOOD: Single query with recursive CTE
$orders = ManufacturingOrder::with([
    'children.manufacturingRoute.steps',
    'children.children.manufacturingRoute.steps', // Up to expected depth
])->paginate(20);
```

#### 2. Route and Step Loading
**Risk**: Each MO loads route, each route loads steps
```php
// BAD: 1 + N + (N × M) queries
$orders->each(function ($order) {
    $stepCount = $order->manufacturingRoute->steps->count(); // N+1
});
```

**Mitigation**: Eager load with counts
```php
// GOOD: 3 queries total
$orders = ManufacturingOrder::with(['manufacturingRoute'])
    ->withCount(['manufacturingRoute.steps'])
    ->get();
```

#### 3. Recursive Progress Calculation
**Risk**: Deep hierarchies trigger exponential queries
```php
// BAD: Recursive method calls
public function calculateSmartProgress() {
    $units = $this->quantity * $this->manufacturingRoute->steps->count();
    foreach ($this->children as $child) {
        $units += $child->calculateSmartProgress(); // Recursive N+1
    }
}
```

**Mitigation**: Use cached values or batch calculation
```php
// GOOD: Use cached smart_progress_percentage
public function getSmartProgressAttribute() {
    if ($this->progress_calculated_at?->gt(now()->subHours(1))) {
        return $this->smart_progress_percentage;
    }
    return $this->calculateAndCacheProgress();
}
```

### Prevention Strategies

#### 1. Database View Approach
```sql
-- Pre-calculate in database to avoid application-level N+1
CREATE MATERIALIZED VIEW mo_progress_summary AS
WITH RECURSIVE mo_tree AS (
    SELECT id, parent_id, 0 as depth,
           ARRAY[id] as path
    FROM manufacturing_orders
    WHERE parent_id IS NULL
    
    UNION ALL
    
    SELECT mo.id, mo.parent_id, tree.depth + 1,
           tree.path || mo.id
    FROM manufacturing_orders mo
    JOIN mo_tree tree ON mo.parent_id = tree.id
    WHERE NOT mo.id = ANY(tree.path) -- Prevent cycles
)
SELECT 
    id,
    depth,
    path,
    (SELECT COUNT(*) FROM unnest(path)) as hierarchy_size
FROM mo_tree;
```

#### 2. Eager Loading Helper
```php
// In ManufacturingOrder model
public function scopeWithFullProgress($query)
{
    return $query->with([
        'manufacturingRoute.steps',
        'children' => function ($q) {
            $q->withFullProgress(); // Recursive eager loading
        }
    ])->withCount([
        'manufacturingRoute.steps',
        'children'
    ]);
}
```

#### 3. Batch Progress Updates
```php
// Avoid N+1 during updates
class BatchUpdateProgress implements ShouldQueue
{
    public function handle()
    {
        // Single query to identify all affected MOs
        $affectedIds = DB::select('
            WITH RECURSIVE affected AS (
                SELECT id FROM manufacturing_orders 
                WHERE updated_at > ? 
                UNION
                SELECT mo.parent_id FROM manufacturing_orders mo
                JOIN affected a ON mo.id = a.id
                WHERE mo.parent_id IS NOT NULL
            )
            SELECT DISTINCT id FROM affected
        ', [now()->subMinutes(5)]);
        
        // Batch update all at once
        $this->updateProgressBatch($affectedIds);
    }
}
```

#### 4. Query Monitoring
```php
// Add to AppServiceProvider for development
if (app()->environment('local')) {
    DB::listen(function ($query) {
        if ($query->time > 100) {
            Log::warning('Slow query detected', [
                'sql' => $query->sql,
                'time' => $query->time,
            ]);
        }
    });
}
```

### Performance Testing Checklist
- [ ] Test index page with 100+ MOs with deep hierarchies
- [ ] Monitor query count with Laravel Debugbar
- [ ] Use `EXPLAIN ANALYZE` on complex progress queries  
- [ ] Load test with concurrent progress updates
- [ ] Verify eager loading includes all needed relations

## Monitoring and Alerts

### Key Metrics to Track
1. **Progress Calculation Time**: Alert if >100ms
2. **Stale Progress Count**: Alert if >5% of MOs
3. **Update Queue Depth**: Alert if >1000 pending
4. **Calculation Accuracy**: Spot-check sample MOs
5. **Query Count per Request**: Alert if >50 queries
6. **Database Connection Pool**: Monitor for exhaustion

### Database View Example
```sql
CREATE VIEW smart_progress_calculation_view AS
WITH RECURSIVE mo_hierarchy AS (
    -- Base case: all MOs
    SELECT 
        id,
        parent_id,
        quantity,
        quantity_completed,
        0 as level
    FROM manufacturing_orders
    
    UNION ALL
    
    -- Recursive case
    SELECT 
        mo.id,
        mo.parent_id,
        mo.quantity,
        mo.quantity_completed,
        h.level + 1
    FROM manufacturing_orders mo
    JOIN mo_hierarchy h ON mo.parent_id = h.id
),
work_units AS (
    SELECT 
        mh.id,
        mh.quantity * COALESCE(COUNT(ms.id), 1) as expected_units,
        COALESCE(SUM(ms.cumulative_quantity_completed), mh.quantity_completed) as completed_units
    FROM mo_hierarchy mh
    LEFT JOIN manufacturing_routes mr ON mr.manufacturing_order_id = mh.id
    LEFT JOIN manufacturing_steps ms ON ms.manufacturing_route_id = mr.id
    GROUP BY mh.id, mh.quantity, mh.quantity_completed
)
SELECT 
    id as order_id,
    SUM(expected_units) as total_expected,
    SUM(completed_units) as total_completed,
    CASE 
        WHEN SUM(expected_units) = 0 THEN 100
        ELSE ROUND((SUM(completed_units)::numeric / SUM(expected_units)) * 100, 2)
    END as calculated_progress
FROM work_units
GROUP BY id;
```

## Best Practices Summary

### 1. Query Optimization
- **Always use eager loading** for hierarchical data
- **Implement query result caching** for frequently accessed data
- **Use database views** for complex calculations
- **Monitor query counts** with alerts for N+1 detection
- **Batch updates** to prevent cascading queries

### 2. Data Consistency
- **Use database transactions** for progress updates
- **Implement optimistic locking** to prevent race conditions
- **Add data validation** to ensure progress never exceeds 100%
- **Create audit logs** for progress changes
- **Regular consistency checks** via background jobs

### 3. Performance Guidelines
- **Cache aggressively** with smart invalidation
- **Debounce rapid updates** (5-second window)
- **Use background jobs** for non-critical updates
- **Implement circuit breakers** for recursive calculations
- **Set reasonable depth limits** for hierarchies (e.g., max 10 levels)

### 4. Code Organization
```php
// Good: Separate concerns
class SmartProgressCalculator
{
    public function calculate(ManufacturingOrder $order): float
    {
        return Cache::remember(
            "mo_progress_{$order->id}",
            now()->addMinutes(5),
            fn() => $this->performCalculation($order)
        );
    }
}

// Bad: Mixed concerns in model
class ManufacturingOrder extends Model
{
    public function getProgressAttribute()
    {
        // Don't put complex calculations in attribute accessors
    }
}
```

### 5. Error Handling
```php
// Implement graceful degradation
try {
    $progress = $calculator->calculate($order);
} catch (CircularDependencyException $e) {
    Log::error('Circular dependency detected', ['order' => $order->id]);
    $progress = $this->fallbackToSimpleProgress($order);
} catch (Exception $e) {
    Log::error('Progress calculation failed', [
        'order' => $order->id,
        'error' => $e->getMessage()
    ]);
    $progress = 0; // Safe default
}
```

### 6. Testing Strategy
```php
// Test N+1 prevention
public function test_index_page_prevents_n_plus_one_queries()
{
    // Create complex hierarchy
    $parentOrder = ManufacturingOrder::factory()
        ->hasChildren(5)
        ->hasManufacturingRoute(function ($route) {
            return $route->hasSteps(10);
        })
        ->create();
    
    DB::enableQueryLog();
    
    $response = $this->get(route('production.orders.index'));
    
    $queryCount = count(DB::getQueryLog());
    $this->assertLessThan(20, $queryCount, 'Too many queries detected');
}
```

### 7. Monitoring Implementation
```php
// Add to monitoring dashboard
class ProgressHealthCheck
{
    public function check(): array
    {
        return [
            'stale_progress_count' => ManufacturingOrder::where(
                'progress_calculated_at', '<', now()->subDay()
            )->count(),
            
            'avg_calculation_time' => Cache::get('avg_progress_calc_time', 0),
            
            'failed_calculations_24h' => Log::where(
                'message', 'like', '%Progress calculation failed%'
            )->where('created_at', '>', now()->subDay())->count(),
            
            'max_hierarchy_depth' => DB::select('
                WITH RECURSIVE depth_calc AS (
                    SELECT id, 0 as depth FROM manufacturing_orders 
                    WHERE parent_id IS NULL
                    UNION ALL
                    SELECT mo.id, dc.depth + 1
                    FROM manufacturing_orders mo
                    JOIN depth_calc dc ON mo.parent_id = dc.id
                )
                SELECT MAX(depth) as max_depth FROM depth_calc
            ')[0]->max_depth
        ];
    }
}
```

### 8. Migration Safety
```php
// Safe migration with rollback plan
class AddSmartProgressToManufacturingOrders extends Migration
{
    public function up()
    {
        // Add columns without breaking existing functionality
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            $table->decimal('smart_progress_percentage', 5, 2)
                  ->nullable() // Start nullable
                  ->after('quantity_scrapped');
        });
        
        // Populate in batches to avoid locking
        ManufacturingOrder::chunk(100, function ($orders) {
            foreach ($orders as $order) {
                UpdateSmartProgress::dispatch($order)->onQueue('low');
            }
        });
    }
    
    public function down()
    {
        Schema::table('manufacturing_orders', function (Blueprint $table) {
            $table->dropColumn('smart_progress_percentage');
        });
    }
}
```

### 9. API Design
```php
// Clean API for progress updates
interface ProgressCalculatorInterface
{
    public function calculate(ManufacturingOrder $order): float;
    public function invalidate(ManufacturingOrder $order): void;
    public function recalculateHierarchy(ManufacturingOrder $root): void;
}

// Facade for easy access
Progress::calculate($order);
Progress::invalidate($order);
Progress::recalculateTree($rootOrder);
```

### 10. Documentation Requirements
- **Architecture Decision Records (ADRs)** for caching strategy
- **Performance benchmarks** before and after implementation
- **Runbooks** for troubleshooting progress issues
- **API documentation** for progress endpoints
- **Database diagrams** showing relationships

## Conclusion

Based on the performance analysis and N+1 considerations, the **hybrid caching approach** with these best practices is the optimal solution:

- **10-20x more reads than writes** justifies caching
- **1.5+ second page loads** are unacceptable without optimization
- **N+1 query risks** make caching essential
- **Storage overhead is negligible** (<1MB for 50k MOs)
- **Write overhead is minimal** with proper debouncing

This approach provides:
1. **Instant page loads** with cached progress and eager loading
2. **Accurate progress** through smart invalidation
3. **Scalability** through batch processing and query optimization
4. **Reliability** through proper error handling and monitoring
5. **Maintainability** through clean code organization

By implementing smart progress calculation with strategic caching and following these best practices, the system delivers both performance and accuracy, transforming progress tracking from a simple output metric to a comprehensive work effort indicator that scales with business growth.
