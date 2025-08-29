# Route Template Schema Unification Specification

## Executive Summary

This document specifies the plan to deprecate the separate `route_templates` and `route_template_steps` tables and unify them with the `manufacturing_routes` and `manufacturing_steps` tables. The unification will be achieved by adding an `is_template` field to distinguish between production routes and templates, simplifying the database schema while maintaining all existing functionality.

## Current State Analysis

### 1. Current Database Schema

#### 1.1 Template Tables
- **route_templates**: Stores route template definitions
  - Fields: id, name, description, item_category (string), is_active, created_by, timestamps
  - Relationships: Has many route_template_steps
  - Note: item_category is stored as a string, not a foreign key
  
- **route_template_steps**: Stores template step definitions
  - Fields: id, route_template_id, step_number, step_type, name, description, setup_time_minutes, cycle_time_minutes, work_cell_id, form_id, quality_check_mode, sampling_size, timestamps
  - No dependency tracking (implicit sequential order based on step_number)

#### 1.2 Manufacturing Tables
- **manufacturing_routes**: Stores production routes
  - Fields: id, manufacturing_order_id, item_id, route_template_id (FK), name, description, is_active, created_by, timestamps
  - References route_template_id when created from template
  
- **manufacturing_steps**: Stores production steps
  - Fields: id, manufacturing_route_id, display_order, step_type, name, description, work_cell_id, status, form_id, form_version_id, setup_time_minutes, cycle_time_minutes, actual_start_time, actual_end_time, quality_result, failure_action, quality_check_mode, sampling_size, depends_on_step_id, can_start_when_dependency, dependency_start_condition, dependency_minimum_quantity, dependency_minimum_percentage, cumulative_quantity_completed, cumulative_quantity_scrapped, timestamps
  - Explicit dependency tracking via depends_on_step_id
  - Progressive flow support

### 2. Key Differences Between Templates and Manufacturing

1. **Ownership**: Templates are standalone; manufacturing routes belong to orders
2. **Steps**: Template steps use `step_number`; manufacturing steps use `display_order`
3. **Dependencies**: Templates have implicit sequential dependencies; manufacturing has explicit dependency graph
4. **State**: Templates are stateless; manufacturing tracks execution state
5. **Versioning**: Templates don't track versions; manufacturing tracks actual execution

### 3. Current Usage Patterns

1. **Template Creation**: Currently no dedicated UI for creating templates (only through seeding/manual DB)
2. **Template Application**: Templates are applied when creating routes for manufacturing orders
3. **Template Selection**: Based on item category compatibility (string matching, not FK)
4. **Step Copying**: When applying template, steps are copied with field mapping (step_number → display_order)

## Proposed Unified Schema

### 1. Database Schema Changes

#### 1.1 manufacturing_routes table additions:
```sql
ALTER TABLE manufacturing_routes ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE manufacturing_routes ADD COLUMN item_category_id BIGINT NULL;
ALTER TABLE manufacturing_routes ADD COLUMN template_source_id BIGINT NULL;
ALTER TABLE manufacturing_routes ADD FOREIGN KEY (item_category_id) REFERENCES item_categories(id);
ALTER TABLE manufacturing_routes ADD FOREIGN KEY (template_source_id) REFERENCES manufacturing_routes(id);
ALTER TABLE manufacturing_routes ALTER COLUMN manufacturing_order_id DROP NOT NULL;
```

#### 1.2 manufacturing_steps table additions:
```sql
ALTER TABLE manufacturing_steps ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE manufacturing_steps ADD COLUMN step_number INTEGER NULL;
```

#### 1.3 Constraints:
- Template routes: manufacturing_order_id must be NULL, is_template must be TRUE
- Production routes: manufacturing_order_id must be NOT NULL, is_template must be FALSE
- Template steps: status must be NULL, actual times must be NULL
- Step dependencies: Templates use step_number ordering; production uses depends_on_step_id

### 2. Model Changes

#### 2.1 ManufacturingRoute Model

```php
class ManufacturingRoute extends Model
{
    protected $fillable = [
        'manufacturing_order_id',
        'item_id',
        'route_template_id', // Deprecated, use template_source_id
        'template_source_id', // New: references another manufacturing_route where is_template=true
        'name',
        'description',
        'is_active',
        'is_template', // New
        'item_category_id', // New: for template filtering
        'created_by',
    ];

    // New scopes
    public function scopeTemplates($query)
    {
        return $query->where('is_template', true);
    }

    public function scopeProduction($query)
    {
        return $query->where('is_template', false);
    }

    // New relationships
    public function templateSource(): BelongsTo
    {
        return $this->belongsTo(ManufacturingRoute::class, 'template_source_id');
    }

    public function derivedRoutes(): HasMany
    {
        return $this->hasMany(ManufacturingRoute::class, 'template_source_id');
    }

    public function itemCategory(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class);
    }

    // Modified relationship
    public function steps(): HasMany
    {
        if ($this->is_template) {
            return $this->hasMany(ManufacturingStep::class)->orderBy('step_number');
        }
        return $this->hasMany(ManufacturingStep::class)->orderBy('display_order');
    }

    // New method to replace createFromTemplate
    public function createFromTemplate(ManufacturingRoute $template): void
    {
        if (!$template->is_template) {
            throw new \InvalidArgumentException('Source must be a template');
        }

        foreach ($template->steps as $templateStep) {
            $this->steps()->create([
                'display_order' => $templateStep->step_number * 10,
                'step_number' => $templateStep->step_number, // Keep for reference
                'step_type' => $templateStep->step_type,
                'name' => $templateStep->name,
                'description' => $templateStep->description,
                'work_cell_id' => $templateStep->work_cell_id,
                'form_id' => $templateStep->form_id,
                'setup_time_minutes' => $templateStep->setup_time_minutes,
                'cycle_time_minutes' => $templateStep->cycle_time_minutes,
                'quality_check_mode' => $templateStep->quality_check_mode,
                'sampling_size' => $templateStep->sampling_size,
                'status' => 'pending',
                'is_template' => false,
            ]);
        }
        
        // Set up dependencies based on step_number sequence
        $this->setupStepDependencies();
    }
}
```

#### 2.2 ManufacturingStep Model

```php
class ManufacturingStep extends Model
{
    protected $fillable = [
        // ... existing fields ...
        'is_template', // New
        'step_number', // New: for template ordering
    ];

    // Add validation in boot method
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($step) {
            if ($step->manufacturingRoute && $step->manufacturingRoute->is_template) {
                // Template steps
                $step->is_template = true;
                $step->status = null;
                $step->actual_start_time = null;
                $step->actual_end_time = null;
                $step->cumulative_quantity_completed = 0;
                $step->cumulative_quantity_scrapped = 0;
            } else {
                // Production steps
                $step->is_template = false;
                if (!$step->status) {
                    $step->status = 'pending';
                }
            }
        });
    }
}
```

### 3. Migration Strategy

#### Phase 1: Add New Fields (Week 1)
1. Add new columns to manufacturing tables
2. Add is_template getters that return false by default
3. Deploy without breaking changes

#### Phase 2: Data Migration (Week 2)
1. Create manufacturing_routes records for each route_template with is_template=true
2. Map string item_category to item_category_id (create missing categories if needed)
3. Create manufacturing_steps records for each route_template_step
4. Update template_source_id for existing routes that reference route_template_id
5. Maintain both schemas running in parallel

#### Phase 3: Code Migration (Week 3-4)
1. Update all template queries to use ManufacturingRoute::templates()
2. Update UI components to work with unified models
3. Update creation/editing logic
4. Add route template management UI

#### Phase 4: Cleanup (Week 5)
1. Remove references to RouteTemplate and RouteTemplateStep models
2. Drop route_template_id foreign key from manufacturing_routes
3. Drop route_templates and route_template_steps tables
4. Remove old model files

### 4. API Changes

#### 4.1 Template Listing
```php
// Old
$templates = RouteTemplate::where('is_active', true)->get();

// New
$templates = ManufacturingRoute::templates()
    ->where('is_active', true)
    ->whereNull('manufacturing_order_id')
    ->with('itemCategory')
    ->get();
```

#### 4.2 Template Application
```php
// Old
$route->createFromTemplate($template);

// New
$templateRoute = ManufacturingRoute::templates()->findOrFail($templateId);
$route->createFromTemplate($templateRoute);
$route->update(['template_source_id' => $templateRoute->id]);
```

### 5. Benefits of Unification

1. **Simplified Schema**: One set of tables instead of two
2. **Code Reuse**: Share logic between templates and production routes
3. **Consistency**: Same field names and structures
4. **Flexibility**: Templates can use all features of manufacturing routes
5. **Versioning**: Easy to track which template a route came from
6. **Evolution**: Templates can have dependencies and progressive flow configs
7. **Better Data Integrity**: Proper foreign key to ItemCategory instead of string field

### 6. Risks and Mitigation

#### 6.1 Risk: Data Migration Complexity
- **Mitigation**: Run parallel schemas during transition
- **Rollback Plan**: Keep backup of original tables

#### 6.2 Risk: Performance Impact
- **Mitigation**: Add indexes on is_template field
- **Monitoring**: Track query performance during migration

#### 6.3 Risk: Breaking Changes
- **Mitigation**: Phased approach with backward compatibility
- **Testing**: Comprehensive test suite for both schemas

### 7. Implementation Checklist

#### Database Changes
- [ ] Create migration for manufacturing_routes additions
- [ ] Create migration for manufacturing_steps additions
- [ ] Create data migration script
- [ ] Add database indexes

#### Model Updates
- [ ] Update ManufacturingRoute model
- [ ] Update ManufacturingStep model
- [ ] Add scopes and relationships
- [ ] Update validation rules

#### Controller Updates
- [ ] Create RouteTemplateController using ManufacturingRoute
- [ ] Update ManufacturingOrderController template methods
- [ ] Update ProductionRoutingController

#### UI Updates
- [ ] Create template management UI
- [ ] Update template selection components
- [ ] Update route builder for template mode
- [ ] Add template editing capabilities

#### Testing
- [ ] Unit tests for model changes
- [ ] Integration tests for template operations
- [ ] Migration tests
- [ ] Performance benchmarks

### 8. Future Enhancements

1. **Template Versioning**: Track changes to templates over time
2. **Template Inheritance**: Templates can extend other templates
3. **Smart Templates**: Templates that adapt based on order parameters
4. **Template Library**: Shared templates across organizations
5. **Template Analytics**: Track template usage and effectiveness

## Conclusion

This unification simplifies the codebase while adding powerful new capabilities. By treating templates as a special case of manufacturing routes, we can leverage all the advanced features (dependencies, progressive flow, etc.) for templates while maintaining a cleaner, more maintainable schema.

The phased migration approach ensures zero downtime and provides multiple rollback points if issues arise. The end result will be a more flexible and powerful template system that can grow with future requirements.
