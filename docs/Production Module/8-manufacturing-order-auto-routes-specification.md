# Manufacturing Order Auto-Routes Specification

## Executive Summary

This document specifies the implementation plan to ensure all Manufacturing Orders (MOs) automatically have routes upon creation. The system will support seamless execution through route steps, with fallback behavior for MOs without steps. Templates will be the primary mechanism for route creation, with intelligent selection based on Item Types.

## Current State Analysis

### 1. Current Implementation

#### 1.1 Manufacturing Order Creation
- MOs can be created without routes
- Routes are optionally created if `route_template_id` or `template_source_id` is provided
- The `has_route` attribute checks if a route exists
- Manual production reporting is allowed for MOs without routes

#### 1.2 Route Structure
- Routes can be production routes (tied to MO) or templates (`is_template=true`)
- Templates may have an `item_category_id` restriction
- Routes inherit `item_id` from their MO
- Steps are ordered by `display_order` (production) or `step_number` (templates)

#### 1.3 Current Limitations
- No automatic route creation
- No fallback for MOs without routes in step execution
- Templates aren't automatically selected based on Item Type
- No UI for converting production routes to templates

## Proposed System Design

### 1. Core Principles

1. **Universal Routes**: Every MO MUST have a route upon creation
2. **Graceful Degradation**: MOs with empty routes execute as if no route exists
3. **Template First**: Standalone routes are always templates
4. **Flexible Templates**: Templates may or may not have Item Type restrictions
5. **Route Conversion**: Any production route can be saved as a template
6. **Cross-Type Copying**: Templates can be copied regardless of Item Type
7. **Intelligent Selection**: Automatic template selection based on Item Type with user override

### 2. Database Schema Updates

#### 2.1 Manufacturing Orders Table
No changes needed - orders already support routes through relationship

#### 2.2 Manufacturing Routes Table Additions
```sql
ALTER TABLE manufacturing_routes 
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN is_latest_for_category BOOLEAN DEFAULT FALSE,
ADD COLUMN created_from_route_id BIGINT NULL,
ADD COLUMN template_metadata JSONB NULL;

ALTER TABLE manufacturing_routes 
ADD FOREIGN KEY (created_from_route_id) REFERENCES manufacturing_routes(id);

-- Index for efficient template queries
CREATE INDEX idx_route_templates_latest 
ON manufacturing_routes(item_category_id, is_latest_for_category, version) 
WHERE is_template = true;
```

#### 2.3 Route Template Metadata Structure
```json
{
  "source_type": "production_route|manual|import",
  "source_order_number": "MO-24001-001",
  "created_date": "2024-01-15T10:30:00Z",
  "created_by_user": "John Doe",
  "tags": ["welding", "assembly", "quality"],
  "notes": "Standard assembly process for Type A products"
}
```

### 3. Service Layer Implementation

#### 3.1 Enhanced ManufacturingOrderService

```php
class ManufacturingOrderService
{
    /**
     * Create a new manufacturing order with automatic route creation.
     */
    public function createOrder(array $data): ManufacturingOrder
    {
        return DB::transaction(function () use ($data) {
            // Generate order number if not provided
            if (!isset($data['order_number'])) {
                $data['order_number'] = $this->generateOrderNumber();
            }

            $order = ManufacturingOrder::create($data);

            // Create child orders if BOM-based
            if ($order->bill_of_material_id) {
                $order->createChildOrders();
            }

            // ALWAYS create a route
            $this->ensureOrderHasRoute($order, $data);

            return $order->fresh(['item', 'billOfMaterial', 'children', 'manufacturingRoute']);
        });
    }

    /**
     * Ensure order has a route, creating one if necessary.
     */
    protected function ensureOrderHasRoute(ManufacturingOrder $order, array $data): void
    {
        // If route already exists (shouldn't happen on create), return
        if ($order->manufacturingRoute()->exists()) {
            return;
        }

        // Priority 1: Explicit template specified
        if (isset($data['template_source_id'])) {
            $this->createRouteFromTemplate($order, $data['template_source_id']);
            return;
        }

        // Priority 2: Auto-select template based on item type
        if ($order->item && $order->item->item_category_id) {
            $template = $this->findBestTemplateForItem($order->item);
            if ($template) {
                // Check if multiple templates exist for category
                $templateCount = $this->getTemplateCountForCategory($order->item->item_category_id);
                
                if ($templateCount > 1 && !isset($data['auto_select_template'])) {
                    // Create empty route and mark for user selection
                    $this->createEmptyRoute($order, [
                        'requires_template_selection' => true,
                        'available_templates' => $templateCount
                    ]);
                } else {
                    $this->createRouteFromTemplate($order, $template->id);
                }
                return;
            }
        }

        // Priority 3: Create empty route
        $this->createEmptyRoute($order);
    }

    /**
     * Find the best template for an item.
     */
    protected function findBestTemplateForItem(Item $item): ?ManufacturingRoute
    {
        // First, try exact category match with latest version
        $template = ManufacturingRoute::templates()
            ->where('item_category_id', $item->item_category_id)
            ->where('is_latest_for_category', true)
            ->where('is_active', true)
            ->first();

        if ($template) {
            return $template;
        }

        // Second, try any template for the category
        return ManufacturingRoute::templates()
            ->where('item_category_id', $item->item_category_id)
            ->where('is_active', true)
            ->orderBy('version', 'desc')
            ->first();
    }

    /**
     * Get count of available templates for a category.
     */
    protected function getTemplateCountForCategory(int $categoryId): int
    {
        return ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->where('is_active', true)
            ->count();
    }

    /**
     * Create an empty route for the order.
     */
    protected function createEmptyRoute(ManufacturingOrder $order, array $metadata = []): ManufacturingRoute
    {
        return $order->manufacturingRoute()->create([
            'item_id' => $order->item_id,
            'name' => "Route for {$order->order_number}",
            'description' => $metadata['requires_template_selection'] ?? false 
                ? 'Template selection required' 
                : 'Empty route - add steps or execute without steps',
            'is_active' => true,
            'is_template' => false,
            'created_by' => auth()->id(),
            'template_metadata' => $metadata ? json_encode($metadata) : null,
        ]);
    }
}
```

#### 3.2 New RouteTemplateService

```php
class RouteTemplateService
{
    /**
     * Save a production route as a template.
     */
    public function saveAsTemplate(ManufacturingRoute $route, array $data): ManufacturingRoute
    {
        if ($route->is_template) {
            throw new \InvalidArgumentException('Route is already a template');
        }

        return DB::transaction(function () use ($route, $data) {
            // Determine version number
            $version = 1;
            if (isset($data['item_category_id'])) {
                $version = $this->getNextVersionForCategory($data['item_category_id']);
            }

            // Create template metadata
            $metadata = [
                'source_type' => 'production_route',
                'source_order_number' => $route->manufacturingOrder->order_number,
                'created_date' => now()->toIso8601String(),
                'created_by_user' => auth()->user()->name,
                'tags' => $data['tags'] ?? [],
                'notes' => $data['notes'] ?? null,
            ];

            // Create the template
            $template = ManufacturingRoute::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? $route->description,
                'is_template' => true,
                'is_active' => true,
                'item_category_id' => $data['item_category_id'] ?? null,
                'version' => $version,
                'is_latest_for_category' => true,
                'created_from_route_id' => $route->id,
                'template_metadata' => json_encode($metadata),
                'created_by' => auth()->id(),
            ]);

            // Mark previous versions as not latest
            if (isset($data['item_category_id'])) {
                ManufacturingRoute::templates()
                    ->where('item_category_id', $data['item_category_id'])
                    ->where('id', '!=', $template->id)
                    ->update(['is_latest_for_category' => false]);
            }

            // Copy steps
            foreach ($route->steps as $step) {
                $template->steps()->create([
                    'step_number' => $step->display_order / 10, // Convert display_order to step_number
                    'display_order' => $step->display_order,
                    'step_type' => $step->step_type,
                    'name' => $step->name,
                    'description' => $step->description,
                    'work_cell_id' => $step->work_cell_id,
                    'form_id' => $step->form_id,
                    'setup_time_minutes' => $step->setup_time_minutes,
                    'cycle_time_minutes' => $step->cycle_time_minutes,
                    'quality_check_mode' => $step->quality_check_mode,
                    'sampling_size' => $step->sampling_size,
                    'is_template' => true,
                ]);
            }

            return $template;
        });
    }

    /**
     * Get next version number for a category.
     */
    protected function getNextVersionForCategory(?int $categoryId): int
    {
        if (!$categoryId) {
            return 1;
        }

        $maxVersion = ManufacturingRoute::templates()
            ->where('item_category_id', $categoryId)
            ->max('version');

        return ($maxVersion ?? 0) + 1;
    }

    /**
     * Copy a template to a manufacturing order, regardless of item type.
     */
    public function copyTemplateToOrder(ManufacturingRoute $template, ManufacturingOrder $order, bool $force = false): ManufacturingRoute
    {
        if (!$template->is_template) {
            throw new \InvalidArgumentException('Source must be a template');
        }

        // Check if order already has steps
        if (!$force && $order->manufacturingRoute && $order->manufacturingRoute->steps()->exists()) {
            throw new \Exception('Order already has route steps. Use force=true to replace.');
        }

        return DB::transaction(function () use ($template, $order) {
            // Get or create route
            $route = $order->manufacturingRoute;
            if (!$route) {
                $route = $order->manufacturingRoute()->create([
                    'item_id' => $order->item_id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'is_active' => true,
                    'is_template' => false,
                    'template_source_id' => $template->id,
                    'created_by' => auth()->id(),
                ]);
            } else {
                // Update existing route
                $route->update([
                    'template_source_id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                ]);

                // Clear existing steps if forcing
                if ($force) {
                    $route->steps()->delete();
                }
            }

            // Copy template steps
            $route->createFromTemplate($template);

            return $route;
        });
    }
}
```

#### 3.3 Enhanced Manufacturing Step Execution

```php
class ManufacturingStepExecutionService
{
    /**
     * Execute manufacturing order - handles both routed and non-routed execution.
     */
    public function executeOrder(ManufacturingOrder $order, array $data): void
    {
        // Check if order has route with steps
        $hasSteps = $order->manufacturingRoute && $order->manufacturingRoute->steps()->exists();

        if ($hasSteps) {
            // Execute through steps
            $this->executeNextStep($order, $data);
        } else {
            // Execute as simple production report
            $this->executeWithoutSteps($order, $data);
        }
    }

    /**
     * Execute order without steps (legacy behavior).
     */
    protected function executeWithoutSteps(ManufacturingOrder $order, array $data): void
    {
        // Validate
        if (!$order->canReportProduction()) {
            throw new \Exception('Cannot report production on this order');
        }

        DB::transaction(function () use ($order, $data) {
            // Update quantities
            $order->increment('quantity_completed', $data['quantity_completed']);
            
            if (isset($data['quantity_scrapped'])) {
                $order->increment('quantity_scrapped', $data['quantity_scrapped']);
            }

            // Update status
            if ($order->status === 'released') {
                $order->update([
                    'status' => 'in_progress',
                    'actual_start_date' => now(),
                ]);
            }

            // Check completion
            if ($order->quantity_completed >= $order->quantity) {
                $order->update([
                    'status' => 'completed',
                    'actual_end_date' => now(),
                ]);

                // Update parent
                if ($order->parent) {
                    $order->parent->checkAutoCompletion();
                }
            }

            // Log activity
            activity()
                ->performedOn($order)
                ->causedBy(auth()->user())
                ->withProperties($data)
                ->log('Direct production execution (no route steps)');
        });
    }
}
```

### 4. Controller Updates

#### 4.1 ManufacturingOrderController Updates

```php
public function create(Request $request)
{
    $this->authorize('create', ManufacturingOrder::class);

    $item = null;
    $itemId = $request->get('item_id');
    
    if ($itemId) {
        $item = Item::with('category')->findOrFail($itemId);
    }

    // Get available templates
    $templates = collect();
    $recommendedTemplate = null;
    
    if ($item && $item->item_category_id) {
        $templates = ManufacturingRoute::templates()
            ->where('item_category_id', $item->item_category_id)
            ->where('is_active', true)
            ->orderBy('is_latest_for_category', 'desc')
            ->orderBy('version', 'desc')
            ->get();
            
        $recommendedTemplate = $templates->firstWhere('is_latest_for_category', true);
    }

    // Get all templates for manual selection
    $allTemplates = ManufacturingRoute::templates()
        ->where('is_active', true)
        ->with('itemCategory')
        ->orderBy('name')
        ->get();

    return Inertia::render('production/orders/create', [
        'item' => $item,
        'templates' => $templates,
        'recommendedTemplate' => $recommendedTemplate,
        'allTemplates' => $allTemplates,
        'hasMultipleTemplates' => $templates->count() > 1,
    ]);
}

public function store(Request $request)
{
    $validated = $request->validate([
        // ... existing validation ...
        'template_source_id' => 'nullable|exists:manufacturing_routes,id',
        'auto_select_template' => 'nullable|boolean',
        'create_empty_route' => 'nullable|boolean',
    ]);

    // ... rest of store method
}
```

#### 4.2 New RouteTemplateController

```php
class RouteTemplateController extends Controller
{
    public function __construct(
        private RouteTemplateService $templateService
    ) {}

    /**
     * Display listing of route templates.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingRoute::class);

        $templates = ManufacturingRoute::templates()
            ->with(['itemCategory', 'createdBy'])
            ->when($request->input('category_id'), function ($query, $categoryId) {
                $query->where('item_category_id', $categoryId);
            })
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(20);

        return Inertia::render('production/templates/index', [
            'templates' => $templates,
            'categories' => ItemCategory::active()->orderBy('name')->get(),
        ]);
    }

    /**
     * Save production route as template.
     */
    public function saveAsTemplate(Request $request, ManufacturingRoute $route)
    {
        $this->authorize('create', ManufacturingRoute::class);

        if ($route->is_template) {
            return back()->with('error', 'This route is already a template.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $template = $this->templateService->saveAsTemplate($route, $validated);

            return redirect()->route('production.templates.show', $template)
                ->with('success', 'Route saved as template successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Copy template to manufacturing order.
     */
    public function copyToOrder(Request $request, ManufacturingRoute $template)
    {
        $this->authorize('view', $template);

        $validated = $request->validate([
            'manufacturing_order_id' => 'required|exists:manufacturing_orders,id',
            'force' => 'nullable|boolean',
        ]);

        $order = ManufacturingOrder::findOrFail($validated['manufacturing_order_id']);
        $this->authorize('update', $order);

        try {
            $route = $this->templateService->copyTemplateToOrder(
                $template, 
                $order, 
                $validated['force'] ?? false
            );

            return redirect()->route('production.orders.show', $order)
                ->with('success', 'Template copied to order successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
```

### 5. Frontend Components

#### 5.1 Manufacturing Order Creation Flow

```typescript
// OrderCreationWizard.tsx
interface OrderCreationWizardProps {
    item?: Item;
    templates: ManufacturingRoute[];
    recommendedTemplate?: ManufacturingRoute;
    allTemplates: ManufacturingRoute[];
}

const OrderCreationWizard: React.FC<OrderCreationWizardProps> = ({
    item,
    templates,
    recommendedTemplate,
    allTemplates
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
        recommendedTemplate?.id || null
    );
    const [routeCreationMode, setRouteCreationMode] = useState<'auto' | 'manual' | 'empty'>('auto');

    // Show template selection if multiple templates for item type
    const showTemplateSelection = templates.length > 1 && routeCreationMode === 'auto';

    return (
        <div>
            {/* Route Creation Mode Selection */}
            <RadioGroup value={routeCreationMode} onValueChange={setRouteCreationMode}>
                <RadioGroupItem value="auto">
                    Automatic - Use template for {item?.category?.name || 'item type'}
                    {templates.length > 0 && ` (${templates.length} available)`}
                </RadioGroupItem>
                <RadioGroupItem value="manual">
                    Manual - Select any template
                </RadioGroupItem>
                <RadioGroupItem value="empty">
                    Empty - Create without steps
                </RadioGroupItem>
            </RadioGroup>

            {/* Template Selection */}
            {showTemplateSelection && (
                <TemplateSelector
                    templates={templates}
                    selected={selectedTemplate}
                    onSelect={setSelectedTemplate}
                    recommended={recommendedTemplate?.id}
                />
            )}

            {routeCreationMode === 'manual' && (
                <TemplateSelector
                    templates={allTemplates}
                    selected={selectedTemplate}
                    onSelect={setSelectedTemplate}
                    showCategories
                />
            )}
        </div>
    );
};
```

#### 5.2 Route Template Management

```typescript
// SaveAsTemplateDialog.tsx
interface SaveAsTemplateDialogProps {
    route: ManufacturingRoute;
    onSave: (data: SaveTemplateData) => void;
}

const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({ route, onSave }) => {
    const [formData, setFormData] = useState({
        name: `Template from ${route.name}`,
        description: route.description,
        item_category_id: route.item?.item_category_id || null,
        tags: [],
        notes: ''
    });

    return (
        <Dialog>
            <DialogContent>
                <h2>Save Route as Template</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
                    <TextInput
                        label="Template Name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                    />
                    
                    <TextArea
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                    
                    <Select
                        label="Item Category (Optional)"
                        value={formData.item_category_id}
                        onChange={(value) => setFormData({...formData, item_category_id: value})}
                    >
                        <option value="">No category restriction</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </Select>
                    
                    <TagInput
                        label="Tags"
                        value={formData.tags}
                        onChange={(tags) => setFormData({...formData, tags})}
                    />
                    
                    <Button type="submit">Save as Template</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
```

### 6. Execution Flow Updates

#### 6.1 Manufacturing Order Show Page

```typescript
// ManufacturingOrderShow.tsx
const ManufacturingOrderShow: React.FC<{order: ManufacturingOrder}> = ({ order }) => {
    const hasRoute = order.has_route;
    const hasSteps = order.manufacturing_route?.steps?.length > 0;
    
    return (
        <div>
            {/* Route Section */}
            <Card>
                <CardHeader>
                    <h3>Manufacturing Route</h3>
                    {hasRoute && !hasSteps && (
                        <Badge variant="warning">No Steps - Direct Execution</Badge>
                    )}
                </CardHeader>
                <CardContent>
                    {!hasRoute && (
                        <Alert variant="error">
                            Critical: No route found. This should not happen.
                        </Alert>
                    )}
                    
                    {hasRoute && !hasSteps && (
                        <div>
                            <p>This order will execute without steps.</p>
                            <Button onClick={() => openTemplateSelector()}>
                                Add Steps from Template
                            </Button>
                            <Button onClick={() => openRouteBuilder()}>
                                Build Custom Route
                            </Button>
                        </div>
                    )}
                    
                    {hasRoute && hasSteps && (
                        <RouteStepsList 
                            steps={order.manufacturing_route.steps}
                            onSaveAsTemplate={() => openSaveAsTemplateDialog()}
                        />
                    )}
                </CardContent>
            </Card>
            
            {/* Execution Section */}
            <Card>
                <CardHeader>
                    <h3>Production Execution</h3>
                </CardHeader>
                <CardContent>
                    {hasSteps ? (
                        <StepBasedExecution order={order} />
                    ) : (
                        <DirectExecution order={order} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
```

### 7. Migration Strategy

#### Phase 1: Database & Model Updates (Week 1)
1. Add new columns to manufacturing_routes table
2. Update model relationships and methods
3. Deploy without breaking changes

#### Phase 2: Service Layer (Week 2)
1. Implement RouteTemplateService
2. Update ManufacturingOrderService with auto-route logic
3. Update execution services for empty route handling
4. Add comprehensive logging

#### Phase 3: Controller & API Updates (Week 3)
1. Update ManufacturingOrderController
2. Create RouteTemplateController
3. Update API documentation
4. Add permission checks

#### Phase 4: Frontend Implementation (Week 4-5)
1. Update order creation wizard
2. Build template management UI
3. Update order detail pages
4. Add save-as-template functionality

#### Phase 5: Data Migration & Testing (Week 6)
1. Create routes for existing orders without them
2. Mark existing standalone routes as templates
3. Set version numbers and latest flags
4. Comprehensive testing

### 8. Backward Compatibility

#### 8.1 Existing Orders Without Routes
- Migration script creates empty routes for all existing orders
- Orders continue to work with direct production reporting

#### 8.2 API Compatibility
- Existing endpoints continue to work
- New optional parameters don't break existing integrations
- Graceful handling of orders created before this change

### 9. Security Considerations

#### 9.1 Permissions
- `production.templates.create` - Create new templates
- `production.templates.viewAny` - View template library
- `production.templates.apply` - Apply templates to orders
- `production.routes.saveAsTemplate` - Save production routes as templates

#### 9.2 Validation
- Prevent deletion of templates in use
- Validate template compatibility warnings (not blocks)
- Audit trail for template creation and usage

### 10. Performance Optimizations

#### 10.1 Database
- Index on `item_category_id, is_latest_for_category` for fast template lookup
- Partial index on `is_template = true` routes
- Consider materialized view for template usage statistics

#### 10.2 Caching
- Cache template list per category
- Cache "best template" selection per item type
- Invalidate on template updates

### 11. Future Enhancements

1. **Template Versioning UI**: Visual diff between template versions
2. **Template Analytics**: Track which templates are most effective
3. **AI Template Suggestion**: ML-based template recommendations
4. **Template Marketplace**: Share templates between organizations
5. **Dynamic Templates**: Templates that adapt based on order parameters

## Implementation Checklist

### Database Changes
- [ ] Create migration for route table updates
- [ ] Add indexes for performance
- [ ] Create data migration for existing orders

### Backend Implementation
- [ ] Update ManufacturingOrderService
- [ ] Create RouteTemplateService
- [ ] Update ManufacturingStepExecutionService
- [ ] Update model relationships
- [ ] Add model methods for template operations

### API & Controllers
- [ ] Update ManufacturingOrderController
- [ ] Create RouteTemplateController
- [ ] Update route definitions
- [ ] Add API documentation

### Frontend Implementation
- [ ] Update order creation wizard
- [ ] Create template selector component
- [ ] Add save-as-template dialog
- [ ] Update order detail page
- [ ] Create template management pages

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for order creation
- [ ] UI tests for template selection
- [ ] Performance tests for template queries

### Documentation
- [ ] Update user documentation
- [ ] Create template management guide
- [ ] Update API documentation
- [ ] Create migration guide

## Conclusion

This specification ensures all Manufacturing Orders have routes while maintaining flexibility and backward compatibility. The template system provides reusable configurations while allowing manual overrides. The implementation supports graceful degradation for empty routes and intelligent template selection based on item types.
