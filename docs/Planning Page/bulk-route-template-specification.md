# Bulk Route Template Application Specification

## Executive Summary

This document specifies a new feature for the Production Planning page that enables users to select multiple Manufacturing Orders (MOs) and perform bulk operations including applying route templates, transitioning states, and managing routes. The feature uses a dedicated selection mode with a card-based operations panel that replaces the route builder when multiple MOs are selected, providing an intuitive and efficient workflow for batch operations.

## Business Value

### Current Limitations
- Users must apply route templates one MO at a time
- Time-consuming for batch orders of similar products
- Risk of inconsistency when manually applying the same template multiple times
- No visibility into which MOs will be affected before applying

### Expected Benefits
- **Time Savings**: Apply templates to dozens of MOs in seconds instead of minutes
- **Consistency**: Ensure identical routing across similar products
- **Error Reduction**: Minimize human error in repetitive tasks
- **Improved Workflow**: Better support for batch production planning

## User Experience Design

### 1. Multi-Select Mode Activation

#### Selection Mode Toggle
A new "Select Multiple" button is added to the MO tree toolbar:

```
┌───────────────────────────────────────────────────────────┐
│ 🔍 [Search MOs...]  [↑ Open Parent]  [📋 Select Multiple] │
└───────────────────────────────────────────────────────────┘
```

When activated:
- MO tree shows checkboxes next to each order
- Selection count badge appears: "3 Selected"
- Right panel transforms to show bulk action options
- Individual MO route details are replaced with bulk operations view

### 2. Bulk Operations Panel

When multiple MOs are selected, the right panel displays action cards similar to the home page design:

```
┌─ Bulk Operations ─────────────────────────────────────────┐
│                                                           │
│  Selected: 5 Manufacturing Orders                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ • MO-2024-001 - Widget A (Draft)                │    │
│  │ • MO-2024-002 - Widget B (Draft)                │    │
│  │ • MO-2024-003 - Widget C (Draft)                │    │
│  │ • + 2 more...                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ╔═══════════════════════════════════════════════════╗  │
│  ║                 Route Management                   ║  │
│  ╚═══════════════════════════════════════════════════╝  │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   📋 Apply      │  │   🔄 Copy       │              │
│  │    Template     │  │    Routes       │              │
│  │                 │  │                 │              │
│  │ Apply a route   │  │ Copy route from │              │
│  │ template to all │  │ one MO to       │              │
│  │ selected orders │  │ others          │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   🗑️ Clear      │  │   📊 Export     │              │
│  │    Routes       │  │    Routes       │              │
│  │                 │  │                 │              │
│  │ Remove routes   │  │ Export routes   │              │
│  │ from selected   │  │ to CSV or       │              │
│  │ orders          │  │ template        │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                           │
│  ╔═══════════════════════════════════════════════════╗  │
│  ║                 Status Management                  ║  │
│  ╚═══════════════════════════════════════════════════╝  │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   ✅ Mark       │  │   🚀 Release to │              │
│  │    Planned      │  │  Manufacturing  │              │
│  │                 │  │                 │              │
│  │ Transition to   │  │ Release orders  │              │
│  │ planned state   │  │ for production  │              │
│  │ (5 orders)      │  │ (0 eligible)    │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                           │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   ↩️ Revert to  │  │   📝 Revert to  │              │
│  │    Planned      │  │     Draft       │              │
│  │                 │  │                 │              │
│  │ Revert from     │  │ Return orders   │              │
│  │ released state  │  │ to draft state  │              │
│  │ (0 eligible)    │  │ (0 eligible)    │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                           │
│  [Exit Selection Mode]                                   │
└───────────────────────────────────────────────────────────┘
```

#### Dynamic Button States
- Buttons show eligibility counts based on selected MOs
- Disabled states for incompatible selections
- Clear visual feedback for available actions

### 3. State-Based Action Availability

The bulk operations panel dynamically adjusts based on the states of selected MOs:

#### All Draft State
- **Available**: Apply Template, Mark Planned, Clear Routes, Export Routes
- **Unavailable**: Release to Manufacturing, Revert operations

#### All Planned State  
- **Available**: Apply Template, Release to Manufacturing, Revert to Draft, Export Routes
- **Unavailable**: Mark Planned

#### All Released State
- **Available**: Revert to Planned (if eligible), Export Routes
- **Unavailable**: Apply Template, Mark Planned, Release to Manufacturing

#### Mixed States
- Only common operations available (e.g., Export Routes)
- Clear messaging about why certain operations are disabled
- Suggestion to filter selection by state

### 4. Bulk Template Application Dialog

#### Dialog Structure
```
┌─ Bulk Apply Route Template ──────────────────────────────────────┐
│                                                                  │
│  Selected Orders: 5 manufacturing orders                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 📦 MO-2024-001 - Widget A (Status: Draft)              │    │
│  │ 📦 MO-2024-002 - Widget A Variant (Status: Draft)      │    │
│  │ 📦 MO-2024-003 - Widget B (Status: Planned) ⚠️         │    │
│  │ 📦 MO-2024-004 - Widget A Premium (Status: Draft)      │    │
│  │ 📦 MO-2024-005 - Widget C (Status: Draft)              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ⚠️ Warning: 1 order has status "Planned". Applying a template  │
│  will replace its existing route.                               │
│                                                                  │
│  Select Template:                                                │
│  [🔍 Search templates...]                                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ○ Standard Assembly Route (5 steps)                    │    │
│  │   Category: Assembly | Used: 45 times                  │    │
│  │                                                         │    │
│  │ ○ Quick Assembly Process (3 steps)                     │    │
│  │   Category: Assembly | Used: 23 times                  │    │
│  │                                                         │    │
│  │ ● Premium Assembly Route (7 steps)                     │    │
│  │   Category: Assembly | Used: 67 times                  │    │
│  │   ┌─────────────────────────────────────────┐         │    │
│  │   │ Steps Preview:                          │         │    │
│  │   │ 1. Material Preparation (15 min)       │         │    │
│  │   │ 2. Component Assembly (45 min)         │         │    │
│  │   │ 3. Quality Check (10 min)             │         │    │
│  │   │ ... 4 more steps                      │         │    │
│  │   └─────────────────────────────────────────┘         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Application Options:                                            │
│  ☑ Skip orders that already have routes                         │
│  ☐ Apply only to orders matching template category              │
│  ☐ Adjust times based on order quantity                         │
│                                                                  │
│  Preview Results:                                                │
│  • 4 orders will receive new routes                            │
│  • 1 order will have its route replaced                        │
│  • 0 orders will be skipped                                    │
│                                                                  │
│  [Cancel]                                    [Apply to 5 Orders] │
└──────────────────────────────────────────────────────────────────┘
```

### 5. Selection Mode Features

#### Visual Indicators
- Checkboxes appear smoothly with animation when entering selection mode
- Selected MOs highlighted with primary color accent
- Selection count updates in real-time
- "Select All" / "Deselect All" options in toolbar

#### Keyboard Shortcuts
- `Ctrl/Cmd + Click`: Toggle individual selection
- `Shift + Click`: Select range
- `Ctrl/Cmd + A`: Select all visible
- `Escape`: Exit selection mode

#### Selection Persistence
- Selections maintained when scrolling
- Warning if navigating away with active selection
- Option to save selection as a "working set"

### 6. Progress and Results Display

#### During Application
```
┌─ Applying Template ──────────────────────────────────────────────┐
│                                                                  │
│  Applying "Premium Assembly Route" to selected orders...         │
│                                                                  │
│  ████████████████░░░░░░░░░░░░░░░░░░  3 of 5 (60%)             │
│                                                                  │
│  ✓ MO-2024-001 - Success                                       │
│  ✓ MO-2024-002 - Success                                       │
│  ⏳ MO-2024-003 - Processing...                                │
│  ⏸  MO-2024-004 - Pending                                      │
│  ⏸  MO-2024-005 - Pending                                      │
│                                                                  │
│  [Cancel Remaining]                                             │
└──────────────────────────────────────────────────────────────────┘
```

#### Results Summary
```
┌─ Template Application Complete ──────────────────────────────────┐
│                                                                  │
│  ✅ Successfully applied template to 4 orders                    │
│  ⚠️  1 order had warnings                                        │
│                                                                  │
│  Details:                                                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ✓ MO-2024-001: Route created (7 steps)                 │    │
│  │ ✓ MO-2024-002: Route created (7 steps)                 │    │
│  │ ⚠ MO-2024-003: Route replaced (previous: 5 steps)     │    │
│  │ ✓ MO-2024-004: Route created (7 steps)                 │    │
│  │ ✓ MO-2024-005: Route created (7 steps)                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  The changes have been saved automatically.                     │
│                                                                  │
│  [View Report]  [Export Log]                         [Close]    │
└──────────────────────────────────────────────────────────────────┘
```

### 7. UI/UX Considerations

#### Bulk Operations Panel Design
- Card-based layout matching home page aesthetic
- Clear visual grouping of related actions
- Hover states with subtle animations
- Icons and colors consistent with existing UI

#### Smart Action Cards
- Each card shows:
  - Clear icon representing the action
  - Action title in bold
  - Brief description of what it does
  - Count of eligible orders (when applicable)
- Disabled cards show why they're unavailable
- Loading states during operations

#### Responsive Behavior
- Panel adapts to available space
- Cards reflow on smaller screens
- Mobile-friendly touch targets
- Smooth transitions between modes

#### Context Preservation
- When exiting selection mode:
  - Option to save current selection
  - Return to previously active MO
  - Maintain scroll position
- Clear visual feedback for mode transitions

## Technical Implementation

### 1. Frontend Architecture

#### Component Structure
```typescript
// New components
BulkOperationsPanel.tsx      // Main panel showing action cards
BulkActionCard.tsx          // Individual action card component
BulkTemplateDialog.tsx      // Dialog for template selection
BulkOperationProgress.tsx   // Progress indicator component
BulkOperationResults.tsx    // Results summary component

// Modified components
PlanningPage/index.tsx      // Add selection mode state and handlers
ManufacturingOrderHierarchicalView.tsx  // Add checkbox support
```

#### State Management
```typescript
interface PlanningPageState {
  // Existing state...
  
  // Selection mode
  isSelectionMode: boolean;
  selectedMOs: Set<number>;
  
  // Bulk operation state
  bulkOperation: {
    type: 'template' | 'status' | 'route' | null;
    inProgress: boolean;
    results: BulkOperationResult[];
  };
}

interface BulkOperationResult {
  orderId: number;
  orderNumber: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
}

// New store for selection mode
interface SelectionModeStore {
  isActive: boolean;
  selectedIds: Set<number>;
  toggleSelection(id: number): void;
  selectRange(fromId: number, toId: number): void;
  selectAll(ids: number[]): void;
  clearSelection(): void;
  exitSelectionMode(): void;
}
```

### 2. Backend Implementation

#### New Endpoints
```php
// POST /production/planning/orders/bulk-apply-template
public function bulkApplyTemplate(Request $request)
{
    $validated = $request->validate([
        'order_ids' => 'required|array|min:1',
        'order_ids.*' => 'required|exists:manufacturing_orders,id',
        'template_id' => 'required|exists:route_templates,id',
        'options' => 'array',
        'options.skip_existing' => 'boolean',
        'options.match_category' => 'boolean',
        'options.adjust_times' => 'boolean',
    ]);

    // Implementation details...
}

// POST /production/planning/orders/bulk-preview-template
public function bulkPreviewTemplate(Request $request)
{
    // Returns preview of what would happen without making changes
}
```

#### Service Layer
```php
class BulkTemplateApplicationService
{
    public function applyTemplateToOrders(
        array $orderIds, 
        RouteTemplate $template,
        array $options = []
    ): BulkOperationReport {
        // Process orders in chunks
        // Handle transactions
        // Generate detailed report
    }
}
```

### 3. Integration Points

#### With Existing Manual Save System
- Bulk operations bypass the manual save flow (auto-save)
- Clear indication that bulk operations save immediately
- Option to preview changes aligns with manual save philosophy

#### With Change Tracking
- Bulk operations clear any pending changes for affected MOs
- Warning if user has unsaved changes on selected MOs
- Audit trail for bulk operations

#### With Permissions
- Requires same permissions as individual template application
- Additional permission check for bulk operations
- Respects order-level permissions

## User Flows

### Flow 1: Bulk Template Application
1. User clicks "Select Multiple" button in MO tree toolbar
2. MO tree shows checkboxes, user selects desired orders
3. Right panel transforms to show bulk operations
4. User clicks "Apply Template" card
5. Template selection dialog opens
6. User selects template and reviews preview
7. Clicks "Apply to X Orders"
8. Sees progress and results
9. Exits selection mode or continues with other operations

### Flow 2: Bulk Status Transitions
1. User enters selection mode
2. Selects multiple MOs in "Draft" state
3. Bulk operations panel shows available transitions
4. User clicks "Mark Planned" card
5. Confirmation dialog shows affected orders
6. User confirms, operation executes
7. Results show success/failure per order
8. MO tree updates to reflect new states

### Flow 3: Mixed State Handling
1. User selects MOs with different states
2. Bulk operations panel shows limited options
3. Status cards show why they're disabled:
   - "Selected orders have different states"
   - "Filter by state to enable this action"
4. User can:
   - Deselect incompatible orders
   - Use state filter in tree view
   - Proceed with available operations only

## Error Handling

### Validation Errors
- Order locked by another user
- Order status prevents route modification
- Insufficient permissions
- Template incompatible with order type

### Recovery Options
- Partial success handling (some orders succeed, others fail)
- Retry failed orders
- Export error log for investigation
- Rollback option for recent bulk operations

## Performance Considerations

### Optimization Strategies
1. **Chunked Processing**: Process orders in batches of 10-20
2. **Async Operations**: Use queued jobs for large batches
3. **Progress Streaming**: Real-time updates via WebSocket/SSE
4. **Smart Caching**: Cache template data during operation
5. **Optimistic UI**: Update UI before server confirmation

### Scalability Targets
- Handle up to 100 MOs in single operation
- Sub-second response for preview generation
- Complete 50 orders in under 30 seconds

## Success Metrics

1. **Efficiency Gain**: 80% time reduction for batch template application
2. **Error Rate**: Less than 1% failed applications
3. **User Adoption**: 60% of users with batch orders use bulk feature
4. **Performance**: 95% of operations complete within SLA
5. **User Satisfaction**: Positive feedback in surveys

## Implementation Phases

### Phase 1: Selection Mode Infrastructure (Week 1-2)
- Add "Select Multiple" button to MO tree toolbar
- Implement checkbox display/hide animations
- Create selection state management
- Basic selection interactions (click, shift-click, etc.)

### Phase 2: Bulk Operations Panel (Week 3-4)
- Create BulkOperationsPanel component
- Implement action cards matching home page design
- Dynamic state-based button availability
- Integration with right panel switching

### Phase 3: Core Bulk Operations (Week 5-6)
- Bulk template application
- Bulk status transitions
- Route management operations
- Backend services and endpoints

### Phase 4: Polish & Advanced Features (Week 7-8)
- Progress indicators and results display
- Error handling and recovery
- Performance optimization
- User acceptance testing

## Future Enhancements

1. **Template Sets**: Apply multiple templates based on conditions
2. **Bulk Route Editing**: Modify specific steps across multiple routes
3. **Schedule Integration**: Bulk apply with scheduling considerations
4. **AI Suggestions**: ML-based template recommendations
5. **Automation Rules**: Auto-apply templates based on triggers

## Key Design Decisions

### Selection Mode Approach
- **Dedicated Mode**: Clear entry/exit from bulk selection mode prevents accidental bulk operations
- **Visual Transform**: Right panel completely changes to bulk operations, providing clear context
- **Familiar Patterns**: Checkbox selection follows standard UI conventions

### Card-Based Operations Panel
- **Consistency**: Matches home page design for familiar user experience
- **Clarity**: Each operation clearly labeled with description and eligibility
- **Safety**: State-based availability prevents invalid operations
- **Efficiency**: All bulk actions accessible from single view

### State-Aware Operations
- **Smart Filtering**: Only shows operations valid for selected MO states
- **Clear Feedback**: Disabled cards explain why operations unavailable
- **Guided Experience**: Helps users understand system constraints

## Conclusion

This enhanced bulk operations feature transforms the Planning page into a powerful batch management tool. By introducing a dedicated selection mode with a card-based operations panel, we provide users with an intuitive, safe, and efficient way to manage multiple manufacturing orders simultaneously. The design maintains consistency with existing UI patterns while introducing powerful new capabilities that will significantly improve productivity for users managing large numbers of orders.
