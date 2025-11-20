# MO Viewer - External Steps Integration Plan

**Date**: November 20, 2025  
**Status**: Planning Phase - Requires Clarification  
**Related Files**: 
- `resources/js/pages/production/tracking/mo-viewer.tsx`
- `resources/js/pages/production/external-steps/index.tsx`
- `resources/js/pages/production/reporting/index.tsx`
- `resources/js/components/production/external-step-status-dialog.tsx`
- `resources/js/pages/production/reporting/components/MOStepActionDialog.tsx`

---

## 1. Overview

The MO Viewer currently displays manufacturing orders with their route steps but does not differentiate or provide special handling for external steps. External steps have different workflows involving shipment to manufacturers, processing at the manufacturer, and receipt of completed items. This plan outlines the integration of external step awareness into the MO Viewer.

---

## 2. Current State Analysis

### 2.1 External Steps Identification

**Key Fields**:
- `execution_location`: `'internal'` | `'external'` - Where the step is executed
- `manufacturer_id`: Foreign key to manufacturers table (nullable)
- `expected_lead_time_days`: Expected turnaround time (nullable)
- `external_status`: `'awaiting_shipment'` | `'at_manufacturer'` (nullable)

**External Step Lifecycle**:
```
Status Flow:
pending → queued → in_progress → completed
                        ↓
              (if execution_location === 'external')
                        ↓
External Status Flow:
awaiting_shipment → at_manufacturer
```

### 2.2 Existing Components

**External Steps Index** (`resources/js/pages/production/external-steps/index.tsx`):
- Shows steps filtered by `execution_location === 'external'`
- Displays steps with status filters: `awaiting_shipment`, `at_manufacturer`
- Uses `ExternalStepStatusDialog` for three actions:
  1. **Ship** - Mark step as shipped to manufacturer
  2. **In-Process** - Mark step as being processed at manufacturer
  3. **Record Receipt** - Record quantity received from manufacturer

**MO Viewer** (`resources/js/pages/production/tracking/mo-viewer.tsx`):
- Shows hierarchical view of manufacturing orders with route steps
- Shows canvas view with visual step dependencies
- Uses `MOStepActionDialog` for internal step actions
- Currently treats all steps uniformly (no external step distinction)

**Production Reporting** (`resources/js/pages/production/reporting/index.tsx`):
- Shows executable steps across all orders
- Uses `MOStepActionDialog` for step execution
- Currently treats all steps uniformly

### 2.3 Shared Component Pattern

**Current Sharing Model**:
- `MOStepActionDialog` is used by both MO Viewer and Production Reporting
- It handles internal step state transitions and quantity reporting
- Located at: `resources/js/pages/production/reporting/components/MOStepActionDialog.tsx`

---

## 3. Questions for Clarification

### 3.1 Visual Distinction
**Q1**: Should external steps be visually distinguished in the MO Viewer's canvas and hierarchical views?
- [ ] Add visual indicator (icon/badge) next to external step names?
- [ ] Use different colors/borders for external steps?
- [ ] Show manufacturer name in step display?
- [ ] Show external_status badge alongside regular status?

**Q2**: Should the canvas view show external-specific information?
- [ ] Show manufacturer name on step boxes?
- [ ] Show shipping/receipt status?
- [ ] Use different visual styling for external step boxes?

### 3.2 User Actions & Workflows
**Q3**: When a user clicks on an external step in MO Viewer, what dialog should open?
- **Option A**: Continue using `MOStepActionDialog` but enhance it to handle external steps
- **Option B**: Use `ExternalStepStatusDialog` for external steps, `MOStepActionDialog` for internal steps
- **Option C**: Create a unified dialog that handles both internal and external steps
- **Option D**: Other approach?

**Q4**: What actions should be available for external steps in MO Viewer?
- [ ] All internal step actions (Start, Pause, Complete, etc.)?
- [ ] All external step actions (Ship, Mark In-Process, Record Receipt)?
- [ ] Only a subset depending on current status?
- [ ] Different actions available in MO Viewer vs External Steps page?

**Q5**: Should external steps follow the same state machine as internal steps?
- Can external steps be "started" in the same way?
- Can operators report production/scrap quantities for external steps?
- Are quality checks handled differently for external steps?

### 3.3 Component Architecture
**Q6**: What is the preferred component sharing strategy?
- **Option A**: Enhance `MOStepActionDialog` to detect step type and show appropriate UI
  ```typescript
  // Pseudo-code
  if (step.execution_location === 'external') {
    // Show external-specific panels/actions
  } else {
    // Show internal step panels/actions
  }
  ```

- **Option B**: Create a router component that delegates to the appropriate dialog
  ```typescript
  // Pseudo-code
  <StepActionDialog>
    {step.execution_location === 'external' 
      ? <ExternalStepActions />
      : <InternalStepActions />
    }
  </StepActionDialog>
  ```

- **Option C**: Create completely separate dialog components, choose based on step type
  ```typescript
  // Pseudo-code
  {step.execution_location === 'external'
    ? <ExternalStepStatusDialog ... />
    : <MOStepActionDialog ... />
  }
  ```

- **Option D**: Extract common functionality into shared hooks/components, keep dialogs separate

**Q7**: Should there be a unified component library for step actions?
- Create `@/components/production/step-actions/` directory?
- Extract common functionality (photo management, quantity reporting, state transitions)?
- Create composable hooks for step operations?

### 3.4 External Step Status Transitions
**Q8**: What is the exact relationship between `status` and `external_status`?
- Can a step be `in_progress` (status) but `awaiting_shipment` (external_status)?
- Does shipping to manufacturer change the main `status` field?
- When does the step transition to `completed` - upon receipt or upon manufacturer confirmation?

**Q9**: How should the MO Viewer handle external steps that are at the manufacturer?
- Should they appear as "in progress" in the canvas?
- Should they show a special "at manufacturer" state?
- Should there be a visual indicator showing they're off-site?

### 3.5 Data Loading & State Management
**Q10**: Does the MO Viewer need additional data for external steps?
- [ ] Shipment information (tracking, dates, quantities)?
- [ ] Manufacturer contact information?
- [ ] Expected return date based on lead time?
- [ ] Current location/status details?

**Q11**: Should external steps in MO Viewer have different auto-refresh behavior?
- External steps may not change as frequently as internal steps
- Should they be polled less often?
- Should there be real-time updates when shipments are marked as received?

### 3.6 Permissions & Authorization
**Q12**: Are there different permission requirements for external step actions?
- Can the same users who manage internal steps also manage external steps?
- Are shipping/receiving actions restricted to specific roles?
- Should MO Viewer show actions the user doesn't have permission to execute?

### 3.7 Integration with Logistics Module
**Q13**: How does the MO Viewer interact with the Logistics Module?
- Should MO Viewer show shipment details for external steps?
- Can users create/view shipments from the MO Viewer?
- Should there be a link to the External Steps dashboard from MO Viewer?

**Q14**: When should users use MO Viewer vs External Steps Index?
- Is MO Viewer for order-centric view, External Steps for work-centric view?
- Should actions be available in both places?
- Should they have different capabilities/limitations?

---

## 4. Preliminary Architecture Recommendations

### 4.1 Component Structure (Pending Clarification)

**Proposed Shared Component Library**:
```
resources/js/components/production/step-actions/
├── shared/
│   ├── StepPhotoManager.tsx         (common photo management)
│   ├── StepQuantityReport.tsx       (common quantity reporting)
│   ├── StepStatusBadge.tsx          (unified status display)
│   └── StepActionButtons.tsx        (reusable action buttons)
├── internal/
│   ├── InternalStepActions.tsx      (internal-specific actions)
│   └── InternalStepStateManager.tsx (internal state transitions)
├── external/
│   ├── ExternalStepActions.tsx      (external-specific actions)
│   ├── ExternalShipmentManager.tsx  (shipping/receiving)
│   └── ExternalStatusManager.tsx    (external status transitions)
└── StepActionDialog.tsx             (unified dialog router)
```

**Usage in MO Viewer**:
```typescript
// In mo-viewer.tsx
<StepActionDialog 
  step={selectedStep}
  order={selectedOrder}
  onClose={handleClose}
  onStateChanged={handleStateChanged}
/>

// StepActionDialog internally detects step type and renders appropriate UI
```

### 4.2 Visual Indicators (Pending Confirmation)

**Canvas View**:
- External steps could have a distinct border color or icon
- Show manufacturer badge below step name
- Show external_status as a secondary badge

**Hierarchical View**:
- Add external step icon (e.g., Truck, Factory)
- Show manufacturer name if assigned
- Show external_status badge

**Example**:
```tsx
// Step display enhancement
<div className="step-item">
  {step.execution_location === 'external' && (
    <Badge variant="outline">
      <Truck className="h-3 w-3 mr-1" />
      External
    </Badge>
  )}
  <span>{step.name}</span>
  {step.manufacturer && (
    <span className="text-xs text-muted-foreground">
      {step.manufacturer.name}
    </span>
  )}
</div>
```

### 4.3 State Management Approach (Pending Clarification)

**Option 1 - Unified Hook**:
```typescript
// Hook that handles both internal and external steps
const { 
  canStart, 
  canPause, 
  canComplete,
  canShip,
  canReceive,
  executeAction 
} = useStepActions(step, order);
```

**Option 2 - Separate Hooks**:
```typescript
// Separate hooks for different concerns
const internalActions = useInternalStepActions(step, order);
const externalActions = useExternalStepActions(step, order);
const actions = step.execution_location === 'external' 
  ? externalActions 
  : internalActions;
```

---

## 5. Implementation Phases (Draft - Pending Clarification)

### Phase 1: Visual Indicators
1. Add external step identification in canvas view
2. Add external step identification in hierarchical view
3. Add manufacturer information display
4. Add external_status badge display

### Phase 2: Component Architecture
1. Extract common functionality from existing dialogs
2. Create shared component library structure
3. Create composable hooks for step operations
4. Implement unified or router dialog component

### Phase 3: External Step Actions
1. Integrate shipping actions in MO Viewer
2. Integrate receipt actions in MO Viewer
3. Add manufacturer status updates
4. Add external-specific validations

### Phase 4: Integration & Polish
1. Integrate with logistics module data
2. Add permissions checking
3. Add loading states and error handling
4. Add user feedback and notifications

---

## 6. Questions Summary

### Critical Questions Requiring Answers:
1. **Q3**: Which dialog approach should be used for external steps?
2. **Q4**: What actions should be available for external steps in MO Viewer?
3. **Q6**: What component sharing strategy should be used?
4. **Q8**: What is the exact relationship between status and external_status?
5. **Q14**: When should users use MO Viewer vs External Steps Index?

### Important Questions for Better Implementation:
1. **Q1, Q2**: Visual distinction requirements
2. **Q5**: External step state machine behavior
3. **Q7**: Unified component library structure
4. **Q10, Q11**: Data loading and refresh behavior
5. **Q13**: Logistics module integration requirements

### Nice-to-Have Clarifications:
1. **Q9**: External step appearance in canvas
2. **Q12**: Permission requirements
3. All other questions help optimize the implementation

---

## 7. Next Steps

1. **User Review**: Review this document and answer the clarification questions
2. **Architecture Decision**: Based on answers, finalize component architecture
3. **Detailed Specification**: Create detailed specification for chosen approach
4. **Implementation Plan**: Break down into specific tasks with file changes
5. **Testing Strategy**: Define test cases for external step workflows

---

## 8. Related Documentation

- [External Steps THE REAL COMPLETE FIX](./external-steps-THE-REAL-COMPLETE-FIX.md) - External step save issue resolution
- [External Steps in Route Templates](./external-steps-in-route-templates.md) - Template support for external steps
- [External Steps Template Naming Convention](./external-steps-template-naming-convention.md) - Naming conventions
- [External Steps Redesign Summary](./external-steps-redesign-summary.md) - Overall external steps design
- [State Management Summary](../Logistics/3-state-management-summary.md) - External step state transitions

---

## Appendix A: Current External Step Data Structure

```typescript
interface ManufacturingStep {
  id: number;
  name: string;
  status: 'pending' | 'queued' | 'in_progress' | 'on_hold' | 'awaiting_quality' | 'completed' | 'skipped' | 'cancelled';
  
  // External execution fields
  execution_location?: 'internal' | 'external';
  manufacturer_id?: number | null;
  manufacturer?: {
    id: number;
    name: string;
    code?: string;
  };
  expected_lead_time_days?: number | null;
  external_status?: 'awaiting_shipment' | 'at_manufacturer' | null;
  
  // Quantity tracking (computed from shipments)
  quantity_shipped?: number;
  quantity_received?: number;
  remaining_quantity_to_ship?: number;
  remaining_quantity_to_receive?: number;
  
  // Other fields...
  work_cell_id?: number;
  work_cell?: { id: number; name: string };
  quantity_completed: number;
  quantity_scrapped: number;
  quantity_total: number;
}
```

## Appendix B: Current Dialog Comparison

### ExternalStepStatusDialog
**Location**: `resources/js/components/production/external-step-status-dialog.tsx`

**Actions**:
- Ship (mark as shipped, record quantity, add photos/notes)
- In-Process (mark as being processed at manufacturer)
- Record Receipt (record quantity received, add photos/notes)

**Features**:
- Quantity input with validation
- Photo upload (max 5)
- Notes field
- Simple form submission

### MOStepActionDialog
**Location**: `resources/js/pages/production/reporting/components/MOStepActionDialog.tsx`

**Actions**:
- Start step
- Pause/Resume step
- Complete step
- Skip step
- Report production quantity
- Report scrap quantity
- Manage photos
- Print labels

**Features**:
- Complex state management with hooks
- Step navigator
- Photo capture and viewing
- Quantity reporting dialogs
- Reason dialogs (for skip/hold)
- Label printing
- Execution history

**Architecture**:
- Uses custom hooks:
  - `useMOStepData` - Data fetching and state
  - `useMOStepStateTransitions` - State transition logic
  - `useMOStepQuantityReporting` - Quantity reporting
  - `useMOStepPhotoManagement` - Photo management
- Modular sub-dialogs
- Comprehensive error handling

---

## Appendix C: External Steps Index Features

**Location**: `resources/js/pages/production/external-steps/index.tsx`

**Features**:
- Card/Table view toggle
- Status filters (awaiting_shipment, at_manufacturer, unassigned)
- Manufacturer filter
- Search functionality
- Auto-refresh (30 seconds)
- Image display toggle
- Status summary cards with unit counts

**Components Used**:
- `ExternalStepCard` - Card view display
- `ExternalStepTableRow` - Table view display
- `ManufacturerSearchDialog` - Manufacturer filtering
- `ExternalStepStatusDialog` - Status updates

**Actions Per Status**:
- **awaiting_shipment**: Ship action available
- **at_manufacturer**: In-Process and Record Receipt actions available
- **unassigned**: Warning badge shown

---

*This document will be updated based on user feedback and clarifications.*

