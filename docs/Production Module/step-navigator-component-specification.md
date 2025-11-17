# Step Navigator Component Specification

## Overview

A vertical step navigation component for the MOStepActionDialog that displays the previous, current, and next route steps in a graphical format with gate indicators. This component enables quick navigation between steps while providing visual context about step status, gates, and route position.

## Component Hierarchy

```
StepNavigator (new)
├── StepNavigatorHeader (new)
├── ScrollArea
│   └── StepNavigatorContent (new)
│       ├── RouteStartIndicator (new, conditional)
│       ├── StepCard (new)
│       ├── GateIndicator (new)
│       ├── StepCard (current step, emphasized)
│       ├── GateIndicator
│       ├── StepCard
│       └── RouteEndIndicator (new, conditional)
```

## Component Specifications

### 1. StepNavigator (Main Container)

**File**: `resources/js/components/production/reporting/StepNavigator.tsx`

**Purpose**: Main container component that manages step navigation logic and rendering.

**Props**:
```typescript
interface StepNavigatorProps {
  // The manufacturing order with full route data
  order: ManufacturingOrder;
  
  // Currently active step ID
  currentStepId: number;
  
  // Callback when user clicks a different step
  onStepChange: (stepId: number) => void;
  
  // Optional className for styling
  className?: string;
}
```

**State**:
```typescript
interface StepNavigatorState {
  // The three steps to display (prev, current, next)
  displaySteps: {
    previous: RouteStep | null;
    current: RouteStep;
    next: RouteStep | null;
  };
  
  // Gate configurations between steps
  gates: {
    beforeCurrent: GateData | null;
    afterCurrent: GateData | null;
  };
}
```

**Behavior**:
- Determines which 3 steps to show based on currentStepId
- Calculates gate data and status for gates before and after current step
- Handles step click events and calls onStepChange
- Manages scroll position to keep current step centered
- Shows route start indicator if current step is first
- Shows route end indicator if current step is last

**Layout**:
- Fixed height container (h-[600px])
- Full width of parent (50% of dialog)
- Border on left side to separate from other content
- Background: bg-muted/30

---

### 2. StepNavigatorHeader

**File**: Same file as StepNavigator (sub-component)

**Purpose**: Header showing title and current position in route.

**Content**:
- Title: "Route Progress"
- Subtitle: "Step X of Y" (e.g., "Step 3 of 8")
- Small icon indicator (Route icon from lucide-react)

**Styling**:
- Padding: px-4 py-3
- Border bottom: border-b
- Background: bg-background
- Text: text-sm font-medium

---

### 3. StepNavigatorContent

**File**: Same file as StepNavigator (sub-component)

**Purpose**: Scrollable content area containing steps and gates.

**Layout**:
- Vertical flex container with centered items
- Gap between elements: gap-0 (gates and steps connect)
- Padding: py-6 px-4
- Min height to enable scrolling

**Children Order** (example for middle step):
1. Previous StepCard (if exists)
2. GateIndicator (before current)
3. Current StepCard (emphasized)
4. GateIndicator (after current)
5. Next StepCard (if exists)

---

### 4. StepCard

**File**: `resources/js/components/production/reporting/StepCard.tsx`

**Purpose**: Visual card representing a single route step.

**Props**:
```typescript
interface StepCardProps {
  step: RouteStep;
  stepNumber: number;
  totalSteps: number;
  isCurrent: boolean;
  onClick: () => void;
  className?: string;
}

// RouteStep interface (from existing types)
interface RouteStep {
  id: number;
  name: string;
  display_position?: number;
  status: string; // 'pending' | 'queued' | 'in_progress' | 'completed' | 'skipped' | 'on_hold'
  work_cell: {
    id: number;
    name: string;
  } | null;
  quantity_completed: number;
  quantity_scrapped: number;
  quantity_total: number;
  rejection_rate: number;
  has_quality_issue: boolean;
  has_delay: boolean;
  // ... other existing fields
}
```

**Visual States** (matching mo-viewer):
```typescript
const stepStatusStyles = {
  completed: "border-l-green-500 bg-green-50 dark:bg-green-950/20",
  in_progress: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  queued: "border-l-gray-400 bg-background",
  pending: "border-l-gray-300 bg-muted/50",
  on_hold: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
  skipped: "border-l-gray-400 bg-muted line-through",
};
```

**Current Step Emphasis**:
- Larger size: scale-105
- Thicker border: border-2 vs border
- Shadow: shadow-md
- Ring: ring-2 ring-ring/20
- Slightly different background opacity

**Layout**:
```
┌─────────────────────────────────┐
│ #3                    [WorkCell]│ ← Header with step # and work cell badge
├─────────────────────────────────┤
│ Step Name                       │ ← Step name (truncate if long)
├─────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓░░░ 75%              │ ← Progress bar
│ 75 of 100 completed             │ ← Quantities text
│ [Status Icons]                  │ ← Quality issues, delays icons
└─────────────────────────────────┘
```

**Step Card Sections**:

1. **Header Row**:
   - Step position badge (left): `#3`
   - Work cell badge (right): `Assembly Cell`
   - Gap between: flex justify-between

2. **Step Name**:
   - Font: text-sm font-medium
   - Truncate with ellipsis if too long
   - Padding: py-2

3. **Progress Section**:
   - Progress bar showing completion percentage
   - Text below: "{completed} of {total} completed"
   - If scrapped > 0, show: "{scrapped} scrapped"

4. **Status Indicators Row**:
   - Icons for: completed (CheckCircle2), in_progress (Clock, animated), quality_issue (AlertTriangle), has_delay (TrendingDown)
   - Small size: h-3 w-3
   - Appropriate colors matching status

**Interactions**:
- Clickable: cursor-pointer
- Hover state: hover:bg-accent/50
- onClick calls parent's onStepChange

**Styling**:
- Width: full (w-full)
- Max width: max-w-sm
- Border radius: rounded-lg
- Border left thickness: 4px (border-l-4)
- Padding: p-3
- Transition: transition-all duration-200

---

### 5. GateIndicator

**File**: `resources/js/components/production/reporting/GateIndicator.tsx`

**Purpose**: Visual representation of a gate between two steps.

**Props**:
```typescript
interface GateIndicatorProps {
  gate: GateConfiguration;
  gateStatus: GateStatus;
  precedingStep: RouteStep;
  followingStep: RouteStep;
  className?: string;
}

interface GateConfiguration {
  dependency_type: 'all_children_completed' | 'any_child_completed' | 'minimum_quantity' | 'none';
  minimum_quantity?: number;
}

interface GateStatus {
  isMet: boolean;
  currentProgress?: number; // For quantity-based gates
  requiredProgress?: number; // For quantity-based gates
  message?: string; // Description of gate status
}
```

**Visual Design**:

Similar to RouteBuilder gate design but more compact:

```
    ║
    ║ ← Arrow pointing down
    ▼
┌───────┐
│ GATE  │ ← Gate type icon/label
│  ✓/✗  │ ← Status indicator (met/not met)
│ 75/100│ ← Progress (if quantity-based)
└───────┘
    ║
    ▼
```

**Layout**:
- Vertical connector lines (top and bottom)
- Center diamond or rectangular box for gate info
- Width: narrower than step cards (w-32 or w-40)
- Centered: mx-auto

**Gate Type Indicators**:
```typescript
const gateTypeConfig = {
  all_children_completed: {
    icon: Package,
    label: "All Children",
    color: "blue",
  },
  any_child_completed: {
    icon: Package,
    label: "Any Child",
    color: "blue",
  },
  minimum_quantity: {
    icon: Hash,
    label: "Min Quantity",
    color: "purple",
  },
  none: {
    icon: ArrowDown,
    label: "Continue",
    color: "gray",
  },
};
```

**Status Visualization**:
- Gate met: Green background (bg-green-100 dark:bg-green-950/30), checkmark icon
- Gate not met: Red background (bg-red-100 dark:bg-red-950/30), X icon
- Gate type 'none': Gray, simple arrow

**Quantity Progress** (for minimum_quantity gates):
- Small progress bar or fraction display
- Example: "75 / 100" or progress bar
- Color: green if met, red if not met

**Connector Lines**:
- Dashed vertical lines (border-l-2 border-dashed)
- Color: border-border
- Height: varies based on spacing

**Styling**:
- Padding: p-2
- Border: border-2
- Border radius: rounded-md
- Text: text-xs text-center
- Background varies by status

---

### 6. RouteStartIndicator

**File**: Same file as StepNavigator (sub-component)

**Purpose**: Indicates the start of the manufacturing route.

**Visual**:
```
  ╔═══════════════╗
  ║ START OF ROUTE║
  ╚═══════════════╝
         ║
         ▼
```

**Conditions**:
- Only shown when current step is the first step
- Appears above the first step card

**Special Behavior**:
- If first step has child MO dependencies, show indicator:
  - "Waiting for child orders" message
  - Icon: Package or Layers
  - Color: blue or amber based on dependency status

**Styling**:
- Width: w-48
- Centered: mx-auto
- Background: bg-primary/10
- Border: border-2 border-primary
- Text: text-xs font-semibold uppercase
- Padding: px-4 py-2
- Rounded: rounded-full

---

### 7. RouteEndIndicator

**File**: Same file as StepNavigator (sub-component)

**Purpose**: Indicates the end of the manufacturing route.

**Visual**:
```
         ║
         ▼
  ╔═══════════════╗
  ║  END OF ROUTE ║
  ╚═══════════════╝
```

**Conditions**:
- Only shown when current step is the last step
- Appears below the last step card

**Content**:
- Text: "END OF ROUTE"
- Icon: Flag or CheckCircle2
- Optional: "Final step before completion"

**Styling**:
- Width: w-48
- Centered: mx-auto
- Background: bg-success/10
- Border: border-2 border-success
- Text: text-xs font-semibold uppercase
- Padding: px-4 py-2
- Rounded: rounded-full

---

## Backend Requirements

### API Endpoints

**No new endpoints required** - Component uses existing order data passed as props.

However, the component expects the following data structure from the parent (MOStepActionDialog):

```typescript
// Order prop must include:
interface RequiredOrderData {
  id: number;
  manufacturing_route: {
    id: number;
    steps: RouteStep[]; // Complete array of all steps
  };
  children?: ManufacturingOrder[]; // For child MO dependencies
  quantity: number; // Total order quantity
}
```

### Data Processing

**Step Selection Logic** (Frontend):
```typescript
function getDisplaySteps(steps: RouteStep[], currentStepId: number) {
  const currentIndex = steps.findIndex(s => s.id === currentStepId);
  
  return {
    previous: currentIndex > 0 ? steps[currentIndex - 1] : null,
    current: steps[currentIndex],
    next: currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null,
  };
}
```

**Gate Status Calculation** (Frontend):
```typescript
function calculateGateStatus(
  gate: GateConfiguration,
  precedingStep: RouteStep,
  order: ManufacturingOrder
): GateStatus {
  switch (gate.dependency_type) {
    case 'all_children_completed':
      // Check if all child orders have completed the corresponding step
      const allChildrenComplete = order.children?.every(
        child => child.route_steps?.some(
          step => step.display_position === precedingStep.display_position 
            && step.status === 'completed'
        )
      ) ?? true;
      
      return {
        isMet: allChildrenComplete,
        message: allChildrenComplete 
          ? 'All child orders completed' 
          : 'Waiting for child orders',
      };
      
    case 'minimum_quantity':
      const currentQty = precedingStep.quantity_completed;
      const requiredQty = gate.minimum_quantity || 0;
      
      return {
        isMet: currentQty >= requiredQty,
        currentProgress: currentQty,
        requiredProgress: requiredQty,
        message: `${currentQty} / ${requiredQty} completed`,
      };
      
    case 'none':
      return {
        isMet: true,
        message: 'No gate restriction',
      };
      
    default:
      return {
        isMet: false,
        message: 'Unknown gate type',
      };
  }
}
```

---

## Integration with MOStepActionDialog

### Current Dialog Structure

The MOStepActionDialog currently has a two-panel layout:
- **Left Panel**: Step actions and controls
- **Right Panel (Lower Section)**: Currently shows additional information

### Integration Changes

**File**: `resources/js/pages/production/reporting/components/MOStepActionDialog.tsx`

**Layout Modification**:

Replace the lower right section content with StepNavigator:

```typescript
// In MOStepActionDialog.tsx

import { StepNavigator } from '@/components/production/reporting/StepNavigator';

// ... inside the dialog JSX, lower right section:

<div className="flex-1 border-l">
  <StepNavigator
    order={order}
    currentStepId={activeStepId}
    onStepChange={handleStepNavigatorChange}
  />
</div>
```

**New Handler Function**:
```typescript
const handleStepNavigatorChange = useCallback((stepId: number) => {
  // Update the active step in the dialog
  setActiveStepId(stepId);
  
  // Optionally: Update URL if using query params
  // router.visit(route(currentRoute, { step: stepId }), { preserveScroll: true });
  
  // Trigger any necessary data refresh for the new step
  // (most data should already be available in the order prop)
}, []);
```

**State Management**:
- The `activeStepId` state already exists in MOStepActionDialog
- StepNavigator reads from this state and updates it via callback
- No additional state needed

---

## Styling Guidelines

### Colors

Follow existing project patterns from mo-viewer and RouteBuilder:

**Step Status Colors**:
- Completed: Green (`green-500`, `green-50`, `green-950/20`)
- In Progress: Blue (`blue-500`, `blue-50`, `blue-950/20`)
- Queued: Gray (`gray-400`, `background`)
- Pending: Light Gray (`gray-300`, `muted/50`)
- On Hold: Orange (`orange-500`, `orange-50`, `orange-950/20`)
- Skipped: Gray with strikethrough

**Gate Status Colors**:
- Gate Met: Green (`green-500`, `green-100`, `green-950/30`)
- Gate Not Met: Red (`red-500`, `red-100`, `red-950/30`)
- No Gate: Gray (`gray-400`, `gray-100`, `gray-950/30`)

### Icons (from lucide-react)

- **Steps**: 
  - Completed: `CheckCircle2`
  - In Progress: `Clock` (with animate-pulse)
  - Quality Issue: `AlertTriangle`
  - Delay: `TrendingDown`
  - Work Cell: Badge component

- **Gates**:
  - Child Dependencies: `Package` or `Layers`
  - Quantity Gate: `Hash` or `Percent`
  - No Gate: `ArrowDown`
  - Gate Met: `Check` or `CheckCircle`
  - Gate Not Met: `X` or `AlertCircle`

- **Route Indicators**:
  - Start: `PlayCircle` or `Flag`
  - End: `FlagTriangledRight` or `CheckCircle2`

### Spacing

- Container padding: `p-4` (16px)
- Step card padding: `p-3` (12px)
- Gap between elements: Connected (gap-0), use borders/lines
- Header padding: `px-4 py-3`

### Typography

- Header title: `text-sm font-medium`
- Step number badge: `text-xs font-semibold`
- Step name: `text-sm font-medium`
- Quantities/details: `text-xs text-muted-foreground`
- Gate labels: `text-xs font-medium`
- Route indicators: `text-xs font-semibold uppercase`

---

## Accessibility

### Keyboard Navigation

- All step cards should be focusable: `tabIndex={0}`
- Enter/Space key should trigger step change
- Implement arrow key navigation (up/down between steps)

### ARIA Labels

```typescript
<button
  role="button"
  aria-label={`Navigate to step ${stepNumber}: ${step.name}`}
  aria-current={isCurrent ? 'step' : undefined}
  onClick={handleClick}
>
```

### Screen Reader Support

- Gate status announcements: `aria-live="polite"` for status changes
- Current step indicator: `aria-current="step"`
- Route position: Include in aria-label ("Step 3 of 8")

---

## Testing Requirements

### Unit Tests

**File**: `resources/js/components/production/reporting/__tests__/StepNavigator.test.tsx`

Test cases:
1. Renders three steps correctly (prev, current, next)
2. Emphasizes current step visually
3. Shows route start indicator for first step
4. Shows route end indicator for last step
5. Calculates gate status correctly
6. Handles click on previous step
7. Handles click on next step
8. Shows correct status colors for each step state
9. Displays gate indicators between steps
10. Shows quantity progress for minimum_quantity gates
11. Handles edge case: only one step in route
12. Handles edge case: two steps in route

### Integration Tests

**File**: `tests/Feature/Production/Reporting/StepNavigatorTest.php`

Test cases:
1. Component receives correct order data from MOStepActionDialog
2. Step change callback updates dialog state
3. Gate conditions are correctly evaluated based on child orders
4. Navigation works correctly when steps are skipped
5. Component handles orders without routes gracefully

---

## Performance Considerations

### Optimization Strategies

1. **Memoization**:
   - Memoize step display calculation
   - Memoize gate status calculation
   - Use `React.memo` for StepCard component

```typescript
const displaySteps = useMemo(() => 
  getDisplaySteps(order.manufacturing_route?.steps || [], currentStepId),
  [order.manufacturing_route?.steps, currentStepId]
);

const StepCard = React.memo(({ step, isCurrent, onClick }) => {
  // ... component implementation
});
```

2. **Avoid Unnecessary Re-renders**:
   - Use `useCallback` for click handlers
   - Don't inline object creation in render

3. **Lazy Loading**:
   - Not required - only 3 steps rendered at once

---

## Error Handling

### Edge Cases

1. **No Route Defined**:
   ```typescript
   if (!order.manufacturing_route?.steps?.length) {
     return (
       <div className="flex items-center justify-center h-full">
         <p className="text-muted-foreground text-sm">
           No route defined for this order
         </p>
       </div>
     );
   }
   ```

2. **Current Step Not Found**:
   ```typescript
   const currentStepIndex = steps.findIndex(s => s.id === currentStepId);
   if (currentStepIndex === -1) {
     // Fallback to first step or show error
     console.error('Current step not found in route');
     return <ErrorDisplay />;
   }
   ```

3. **Invalid Gate Configuration**:
   - Show default "Continue" gate
   - Log warning to console

---

## Migration & Rollout

### Phase 1: Component Development
1. Create base StepNavigator component
2. Create StepCard sub-component
3. Create GateIndicator sub-component
4. Add route start/end indicators

### Phase 2: Integration
1. Update MOStepActionDialog layout
2. Connect callbacks and state
3. Test navigation flow

### Phase 3: Polish
1. Refine animations and transitions
2. Add accessibility features
3. Responsive adjustments (mobile layout)

### Phase 4: Testing
1. Unit tests for all components
2. Integration tests with dialog
3. Manual QA testing

---

## Future Enhancements (Out of Scope for v1)

1. **Compact Mode**: Toggle to show only step names without full cards
2. **Step Details Tooltip**: Hover to see full step information
3. **Timeline View**: Alternative horizontal timeline view option
4. **Step Search**: Quick search/filter to jump to any step
5. **Drag to Reorder**: Allow reordering steps (if permissions allow)
6. **Step Execution History**: Show execution timestamps inline

---

## File Structure Summary

```
resources/js/components/production/reporting/
├── StepNavigator.tsx          # Main component (NEW)
├── StepCard.tsx               # Step display card (NEW)
├── GateIndicator.tsx          # Gate between steps (NEW)
└── __tests__/
    └── StepNavigator.test.tsx # Unit tests (NEW)

resources/js/pages/production/reporting/components/
└── MOStepActionDialog.tsx     # Modified to integrate StepNavigator

docs/Production Module/
└── step-navigator-component-specification.md # This file
```

---

## Dependencies

### NPM Packages (Already Installed)
- `lucide-react` - Icons
- `@/components/ui/scroll-area` - Scrollable container
- `@/components/ui/badge` - Work cell badges
- `@/components/ui/progress` - Progress bars
- `@/lib/utils` - cn() utility

### Internal Dependencies
- `@/types/production` - TypeScript types
- `@/components/production/GateCard` - GateConfiguration type
- Existing step status styling patterns from mo-viewer

---

## Open Questions / Decisions Needed

1. **Exact height for container**: Suggested 600px - confirm this fits well in dialog
2. **Animation preferences**: Should step transitions be animated when changing steps?
3. **Mobile behavior**: Confirm that component will be positioned below in mobile view
4. **Gate complexity**: Should we support all existing gate types or start with subset?

---

## Acceptance Criteria

✅ Component displays 3 steps (prev, current, next) in vertical layout  
✅ Current step is visually emphasized  
✅ Step cards show: number, name, work cell, progress, status indicators  
✅ Gate indicators appear between steps  
✅ Gate status (met/not met) is visually clear  
✅ Clicking a step changes the active step in MOStepActionDialog  
✅ Route start indicator shows for first step  
✅ Route end indicator shows for last step  
✅ Component has fixed height with internal scrolling  
✅ Visual styling matches mo-viewer and RouteBuilder patterns  
✅ Component follows 50/50 width distribution in dialog  
✅ All UI states (completed, in_progress, etc.) use correct colors  
✅ Component is accessible (keyboard navigation, ARIA labels)  
✅ Unit tests cover core functionality  

---

## Timeline Estimate

- **Component Development**: 2-3 days
- **Integration with Dialog**: 1 day
- **Testing & Polish**: 1-2 days
- **Total**: 4-6 days

---

## Implementation Notes

### Implementation Status: ✅ COMPLETED

All components have been successfully implemented and integrated:

1. **StepCard.tsx** - Fully functional step display component
   - Shows step position, name, work cell, and progress
   - Visual status indicators matching mo-viewer patterns
   - Current step emphasis with scale, shadow, and ring effects
   - Keyboard navigation support (Enter/Space)
   - Located: `resources/js/components/production/reporting/StepCard.tsx`

2. **GateIndicator.tsx** - Gate visualization component
   - Displays gate type (none, all_children_completed, children_quantity)
   - Shows gate status with checkmark/X indicators
   - Quantity progress for minimum_quantity gates
   - Tooltips with detailed gate information
   - Located: `resources/js/components/production/reporting/GateIndicator.tsx`

3. **StepNavigator.tsx** - Main navigation component
   - Displays previous, current, and next steps
   - Route start/end indicators
   - Gate status calculation
   - Click-to-navigate functionality
   - Located: `resources/js/components/production/reporting/StepNavigator.tsx`

4. **Integration with MOStepActionDialog**
   - Updated `MOStepDialogContent.tsx` to use StepNavigator
   - Added step change handling in `MOStepActionDialog.tsx`
   - Internal state management for active step ID
   - Seamless navigation between steps

### Type Safety

- ✅ All TypeScript compilation passes without errors
- ✅ All ESLint rules pass without warnings
- ✅ Proper type definitions for all props and interfaces
- ✅ No use of `any` types

### Files Created

```
resources/js/components/production/reporting/
├── StepCard.tsx          (170 lines)
├── GateIndicator.tsx     (145 lines)
└── StepNavigator.tsx     (318 lines)
```

### Files Modified

```
resources/js/pages/production/reporting/components/
├── MOStepActionDialog.tsx              (Added step navigation state)
└── components/MOStepDialogContent.tsx  (Integrated StepNavigator)
```

### Key Implementation Decisions

1. **Gate Status Calculation**: Implemented in frontend using existing order data
   - Checks child order completion for `all_children_completed` gates
   - Compares quantities for `children_quantity` gates
   - No backend API calls needed

2. **Step Navigation**: Uses internal state in MOStepActionDialog
   - Syncs with prop changes from parent
   - Triggers data refresh through existing hooks
   - No URL changes (preserves dialog behavior)

3. **Visual Consistency**: Matches existing patterns
   - Step status colors from mo-viewer
   - Gate display similar to RouteBuilder
   - Consistent spacing and typography

4. **Accessibility**: Full keyboard support
   - Tab navigation between steps
   - Enter/Space to activate
   - ARIA labels and current step indication

## Notes

- This component is intentionally simple and focused on navigation
- Real-time updates are not required (per requirements)
- Component should feel lightweight and responsive
- Visual consistency with existing components is critical
- Follow project's existing patterns for forms, interactions, styling
- ✅ All components pass TypeScript strict type checking
- ✅ No linting errors or warnings

