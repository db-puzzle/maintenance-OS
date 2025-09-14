# Migration Strategy and UI Changes Specification

## Executive Summary

This document outlines the migration strategy for transitioning from MO-level dependencies to step-level dependencies, and details the UI/UX changes required to support the new system architecture.

## Part 1: Migration Strategy

### 1. Migration Phases

#### Phase 1: Database Schema Updates (Non-Breaking)
**Duration**: 1 day
**Risk**: Low

1. Add new columns to `manufacturing_steps` table (non-breaking)
2. Create migration scripts but don't drop old MO columns yet
3. Deploy schema changes without breaking existing functionality

#### Phase 2: Dual-Write Period
**Duration**: 2 weeks
**Risk**: Low

1. Update code to write to both old (MO) and new (step) locations
2. Existing functionality continues using MO-level dependencies
3. New functionality begins populating step-level dependencies
4. Monitor for data consistency

#### Phase 3: Migration Execution
**Duration**: 1 day
**Risk**: Medium

1. Run data migration scripts to copy existing dependencies
2. Verify data integrity
3. Switch code to read from new step-level dependencies
4. Keep old MO columns as backup

#### Phase 4: Cleanup
**Duration**: 1 week observation + 1 day execution
**Risk**: Low

1. Monitor system for issues
2. Remove dual-write code
3. Archive old dependency data
4. Drop deprecated columns from MO table

### 2. Data Migration Scripts

#### 2.1 Pre-Migration Analysis Script

```sql
-- Analyze current dependency usage
SELECT 
    COUNT(*) as total_orders,
    SUM(CASE WHEN dependency_type != 'none' THEN 1 ELSE 0 END) as orders_with_dependencies,
    SUM(CASE WHEN auto_complete_on_children = 1 THEN 1 ELSE 0 END) as auto_complete_orders,
    SUM(CASE WHEN can_release_before_children = 0 THEN 1 ELSE 0 END) as restricted_release_orders,
    dependency_type,
    COUNT(*) as count_by_type
FROM manufacturing_orders
WHERE status NOT IN ('completed', 'cancelled')
GROUP BY dependency_type;
```

#### 2.2 Dependency Migration Script

```sql
-- Create temporary mapping table
CREATE TABLE IF NOT EXISTS dependency_migration_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_order_id BIGINT NOT NULL,
    manufacturing_step_id BIGINT NOT NULL,
    old_dependency_type VARCHAR(50),
    new_dependency_type VARCHAR(50),
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mo_id (manufacturing_order_id),
    INDEX idx_step_id (manufacturing_step_id)
);

-- Migrate dependencies to first steps
INSERT INTO dependency_migration_log (
    manufacturing_order_id,
    manufacturing_step_id,
    old_dependency_type,
    new_dependency_type
)
SELECT 
    mo.id,
    ms.id,
    mo.dependency_type,
    CASE 
        WHEN mo.dependency_type = 'all_children_released' THEN 'all_children_completed'
        WHEN mo.dependency_type = 'children_quantity' THEN 'children_quantity'
        WHEN mo.dependency_type = 'children_percentage' THEN 'children_percentage'
        ELSE 'none'
    END
FROM manufacturing_orders mo
INNER JOIN manufacturing_routes mr ON mr.manufacturing_order_id = mo.id
INNER JOIN manufacturing_steps ms ON ms.manufacturing_route_id = mr.id
WHERE ms.depends_on_step_id IS NULL  -- First steps only
  AND mo.dependency_type != 'none'
  AND mo.status NOT IN ('completed', 'cancelled');

-- Execute the migration
UPDATE manufacturing_steps ms
INNER JOIN manufacturing_routes mr ON ms.manufacturing_route_id = mr.id
INNER JOIN manufacturing_orders mo ON mr.manufacturing_order_id = mo.id
INNER JOIN dependency_migration_log dml ON dml.manufacturing_step_id = ms.id
SET 
    ms.child_order_dependency_type = dml.new_dependency_type,
    ms.child_order_minimum_quantity = mo.dependency_minimum_quantity,
    ms.child_order_minimum_percentage = mo.dependency_minimum_percentage,
    ms.cumulative_child_quantity_completed = COALESCE(mo.cumulative_children_quantity_completed, 0),
    ms.cumulative_child_quantity_required = COALESCE(mo.cumulative_children_quantity_required, 0);
```

#### 2.3 Verification Script

```sql
-- Verify migration success
SELECT 
    'Orders with dependencies' as check_type,
    COUNT(DISTINCT mo.id) as total,
    SUM(CASE WHEN ms.child_order_dependency_type != 'none' THEN 1 ELSE 0 END) as migrated
FROM manufacturing_orders mo
LEFT JOIN manufacturing_routes mr ON mr.manufacturing_order_id = mo.id
LEFT JOIN manufacturing_steps ms ON ms.manufacturing_route_id = mr.id 
    AND ms.depends_on_step_id IS NULL
WHERE mo.dependency_type != 'none'
  AND mo.status NOT IN ('completed', 'cancelled');
```

### 3. Code Migration

#### 3.1 Feature Flags

```php
// config/production.php
return [
    'features' => [
        'use_step_level_dependencies' => env('USE_STEP_LEVEL_DEPENDENCIES', false),
        'disable_mo_auto_complete' => env('DISABLE_MO_AUTO_COMPLETE', false),
        'unrestricted_mo_release' => env('UNRESTRICTED_MO_RELEASE', false),
    ],
];
```

#### 3.2 Transition Service

Create a service to handle the transition period:

```php
class DependencyTransitionService
{
    public function shouldUseStepDependencies(): bool
    {
        return config('production.features.use_step_level_dependencies', false);
    }
    
    public function syncDependencies(ManufacturingOrder $order): void
    {
        if (!$this->shouldUseStepDependencies()) {
            return;
        }
        
        // Copy MO dependencies to first steps during transition
        $firstSteps = $order->manufacturingRoute?->steps()
            ->whereNull('depends_on_step_id')
            ->get();
            
        foreach ($firstSteps as $step) {
            $this->copyDependenciesToStep($order, $step);
        }
    }
}
```

## Part 2: UI/UX Changes

### 1. Manufacturing Order Creation Dialog

#### 1.1 Simplified Step Flow

**Current**: 6 steps including release and production dependencies
**New**: 4 steps with dependencies moved to route configuration

```typescript
// Updated step configuration
const steps = [
    { title: 'Item', icon: Package },
    { title: 'BOM', icon: FileText },
    { title: 'Detalhes', icon: Info },
    { title: 'Rotas', icon: GitBranch },
];
```

#### 1.2 Removed UI Elements

Remove the following from `CreateManufacturingOrderDialog.tsx`:

1. Step 5: Release Dependencies section
2. Step 6: Production Dependencies section
3. Auto-complete configuration in Step 4
4. All related state and validation logic

#### 1.3 Updated Step 4: Route Configuration

Focus solely on route creation options:
- Manual creation
- Template selection
- Auto-creation from category (for BOM orders)

### 2. Route Builder Interface

#### 2.1 Enhanced Step Configuration Dialog

```typescript
interface StepConfigurationDialogProps {
  step: ManufacturingStep;
  onSave: (step: ManufacturingStep) => void;
}

// New tab structure
const ConfigurationTabs = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'timing', label: 'Timing' },
  { id: 'quality', label: 'Quality' },
];

// Dependencies tab now includes both types
interface DependenciesTabContent {
  stepDependencies: StepDependencyConfig;
  childOrderDependencies: ChildOrderDependencyConfig;
}
```

#### 2.2 Child Order Dependencies UI

```tsx
// Component for configuring child order dependencies
const ChildOrderDependencyConfig: React.FC = ({ step, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Child Order Dependencies</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Configure when this step can start based on child order progress
        </p>
      </div>
      
      <RadioGroup
        value={step.child_order_dependency_type}
        onValueChange={(value) => onChange({ child_order_dependency_type: value })}
      >
        <div className="grid grid-cols-2 gap-4">
          <DependencyOption
            value="none"
            title="No Dependencies"
            description="Step can start regardless of child orders"
            icon={PlayCircle}
          />
          <DependencyOption
            value="all_children_completed"
            title="All Children Complete"
            description="Wait for all child orders to finish"
            icon={CheckCircle}
          />
          <DependencyOption
            value="children_quantity"
            title="Quantity Based"
            description="Start after specific quantity completed"
            icon={TrendingUp}
          />
          <DependencyOption
            value="children_percentage"
            title="Percentage Based"
            description="Start after percentage completed"
            icon={Percent}
          />
        </div>
      </RadioGroup>
      
      {/* Conditional configuration based on type */}
      {renderDependencyConfiguration(step.child_order_dependency_type)}
    </div>
  );
};
```

### 3. Manufacturing Order Detail View

#### 3.1 Remove Dependency Information

The MO detail view should remove:
- Auto-complete status indicator
- Release dependency information
- Production dependency details

#### 3.2 Add Route-Level Dependency Visualization

Add a new section showing:
- Which steps have child order dependencies
- Current progress toward meeting those dependencies
- Estimated time until dependencies are met

### 4. Route Visualization Updates

#### 4.1 Step Card Enhancements

```tsx
interface StepCardProps {
  step: ManufacturingStep;
  childOrderProgress?: {
    type: string;
    current: number;
    required: number;
    percentage: number;
    canStart: boolean;
  };
}

const StepCard: React.FC<StepCardProps> = ({ step, childOrderProgress }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3>{step.name}</h3>
          {childOrderProgress && (
            <ChildOrderDependencyBadge progress={childOrderProgress} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Existing content */}
        
        {/* New: Child order dependency progress */}
        {childOrderProgress && childOrderProgress.type !== 'none' && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-muted-foreground">
              Child Order Progress
            </div>
            <Progress 
              value={childOrderProgress.percentage} 
              className="h-2"
            />
            <div className="text-xs">
              {childOrderProgress.current} / {childOrderProgress.required}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 5. Planning Interface Updates

#### 5.1 Bulk Dependency Configuration

Add ability to configure dependencies for multiple first steps at once during planning:

```tsx
const BulkDependencyConfig: React.FC = ({ routes, onApply }) => {
  const [config, setConfig] = useState<ChildOrderDependencyConfig>({
    type: 'none',
  });
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Child Order Dependencies</DialogTitle>
          <DialogDescription>
            Apply the same dependency configuration to all selected first steps
          </DialogDescription>
        </DialogHeader>
        
        <ChildOrderDependencyConfig
          step={config}
          onChange={setConfig}
        />
        
        <DialogFooter>
          <Button onClick={() => onApply(config)}>
            Apply to {routes.length} Routes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 6. Template Management Updates

#### 6.1 Template Editor

Add child order dependency configuration to route template editor:

```tsx
const RouteTemplateEditor: React.FC = ({ template }) => {
  return (
    <div>
      {/* Existing template configuration */}
      
      {/* New section for first step dependencies */}
      <Section title="Default Child Order Dependencies">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            These dependencies will be applied to first steps when this template is used
          </AlertDescription>
        </Alert>
        
        <ChildOrderDependencyConfig
          step={template.defaultFirstStepConfig}
          onChange={updateTemplate}
        />
      </Section>
    </div>
  );
};
```

### 7. Monitoring and Analytics Updates

#### 7.1 New Metrics Dashboard

Create dashboard showing:
- Steps blocked by child order dependencies
- Average wait time for child order dependencies
- Dependency satisfaction rates
- Bottleneck analysis at step level

#### 7.2 Real-time Status Updates

Implement WebSocket updates for:
- Child order progress affecting step availability
- Step status changes when dependencies are met
- Visual notifications when steps become available

## Part 3: User Communication

### 1. In-App Notifications

```typescript
// Notify users about the change
const MigrationNotification: React.FC = () => {
  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>System Update</AlertTitle>
      <AlertDescription>
        Production dependencies are now configured at the route step level 
        for more flexible manufacturing flow control. 
        <Link href="/docs/migration-guide">Learn more</Link>
      </AlertDescription>
    </Alert>
  );
};
```

### 2. Migration Guide

Create user-facing documentation explaining:
- What changed and why
- How to configure dependencies in the new system
- Benefits of the new approach
- Common migration scenarios

### 3. Training Materials

- Video tutorials showing new workflow
- Interactive demos of dependency configuration
- Best practices guide
- FAQ section

## Conclusion

This migration strategy ensures a smooth transition from MO-level to step-level dependencies while maintaining system stability. The phased approach minimizes risk and allows for rollback if needed. The UI changes simplify the order creation process while providing more powerful configuration options at the route level where they provide the most value.
