# MODetailsDialog Step-Level Reporting Conversion Plan

## Executive Summary

This document outlines the plan to convert the MODetailsDialog from reporting progress at the Manufacturing Order (MO) level to strictly reporting progress at the Route Step level. This change aligns with the system's progressive flow architecture and enables proper tracking of work through manufacturing routes.

## Current State Analysis

### Problems with Current Implementation

1. **Conceptual Mismatch**: The dialog reports quantities at the MO level while the system is designed for step-by-step execution
2. **Lost Granularity**: No visibility into which steps have processed which quantities
3. **Work Cell Tracking**: Cannot track which work cell performed the work
4. **Progressive Flow Incompatibility**: Cannot leverage step dependencies (quantity-based, percentage-based, immediate)
5. **Timing Information**: No capture of actual setup/cycle times per step
6. **Quality Control**: No step-specific quality check handling

### Current Data Flow

```
User Input → MO quantities updated → No step execution records
```

### Desired Data Flow

```
User Input → Step Execution created/updated → Step cumulative quantities updated → MO quantities updated (if last step)
```

## Proposed Solution Architecture

### 1. Dialog Purpose and Focus

The MODetailsDialog will be converted to a **Route Step Execution Dialog** that:

#### Primary Functions:
- Displays MO context (order info, item details)
- Shows all route steps with their current status and progress
- Enables reporting ONLY at the step level
- Tracks execution through ManufacturingStepExecution records
- Enforces step dependencies and progressive flow rules

#### What It Will NOT Do:
- No direct MO quantity updates
- No MO-level reporting interface
- No option to bypass route steps

### 2. UI Structure Redesign

#### A. New Component Structure
```typescript
// The dialog becomes a comprehensive step execution interface
interface MOStepExecutionDialog {
  order: ManufacturingOrder;
  route: ManufacturingRoute;
  steps: ManufacturingStep[];
  currentStepExecutions: ManufacturingStepExecution[];
}
```

#### B. Layout Design
```
MODetailsDialog (Renamed: MOStepExecutionDialog)
├── MO Context Header (Minimal)
│   ├── Order Number & Status Badge
│   ├── Item Info (Number, Name)
│   └── Total Progress Bar
│
├── Active Step Section (Primary Focus)
│   ├── Step Header
│   │   ├── Step Name & Number
│   │   ├── Work Cell
│   │   └── Status Badge
│   ├── Progress Indicators
│   │   ├── Step Progress (X of Y units)
│   │   ├── Cumulative Quantities
│   │   └── Time Tracking
│   └── Reporting Interface
│       ├── Quantity Input (+/- controls)
│       ├── Scrap Reporting
│       ├── Quality Check (if applicable)
│       └── Action Buttons
│
└── Route Steps List (Secondary)
    ├── Completed Steps (Collapsed by default)
    ├── Current Step (Highlighted)
    └── Upcoming Steps (Show dependencies)
```

#### C. Step Card Design
Each step in the route will display:
```typescript
interface StepCard {
  // Visual Elements
  stepNumber: number;
  stepName: string;
  workCell: string;
  status: StepStatus;
  
  // Progress Data
  cumulativeCompleted: number;
  cumulativeScrapped: number;
  targetQuantity: number;
  
  // Status Indicators
  canStart: boolean;
  dependencyInfo?: string; // "Waiting for Step 2 to complete 50 units"
  
  // Actions (based on status)
  actions: {
    start?: boolean;
    report?: boolean;
    complete?: boolean;
    hold?: boolean;
  };
}
```

#### D. Reporting Interface for Active Step
```typescript
interface StepReportingInterface {
  // Only shown for the step that's currently being executed
  quantityCompleted: number;
  quantityScrapped: number;
  scrapReason?: string;
  
  // Quality check fields (conditional)
  qualityMode?: 'every_part' | 'entire_lot' | 'sampling';
  qualityResult?: 'passed' | 'failed';
  failureAction?: 'scrap' | 'rework';
  
  // Time tracking
  setupTimeActual?: number;
  cycleTimeActual?: number;
  
  // Notes
  notes?: string;
}

### 3. Backend Changes

#### A. New/Modified Endpoints

1. **Start Step Execution**
   ```
   POST /production/reporting/steps/{step}/start
   Creates ManufacturingStepExecution record
   ```

2. **Report Step Progress**
   ```
   POST /production/reporting/steps/{step}/executions/{execution}/progress
   Updates quantities on execution, step, and MO (if last step)
   ```

3. **Complete Step Execution**
   ```
   POST /production/reporting/steps/{step}/executions/{execution}/complete
   Finalizes execution, checks next step activation
   ```

4. **Get Step Execution Status**
   ```
   GET /production/reporting/orders/{order}/step-status
   Returns current execution state for all steps
   ```

#### B. Service Layer Enhancements

```php
class StepExecutionService {
    public function startStepExecution(ManufacturingStep $step, User $user): ManufacturingStepExecution;
    public function reportStepProgress(ManufacturingStepExecution $execution, array $data): void;
    public function completeStepExecution(ManufacturingStepExecution $execution, array $data): void;
    public function checkAndActivateNextSteps(ManufacturingStep $completedStep): void;
}
```

### 4. Data Model Utilization

#### Leverage Existing Models:
- `ManufacturingStep`: Track cumulative quantities
- `ManufacturingStepExecution`: Track individual execution sessions
- `ManufacturingOrder`: Update only when last step reports

#### Key Relationships:
```
MO → Route → Steps → Executions
             ↓
          Cumulative Quantities → Progressive Flow Dependencies
```

### 5. Progressive Flow Integration

#### Dependency Checking:
- Before allowing step execution, check:
  - Previous step completion status
  - Quantity-based dependencies
  - Percentage-based dependencies
  - Child order dependencies

#### Real-time Updates:
- After each progress report:
  - Update step cumulative quantities
  - Check if dependent steps can now start
  - Update UI to show newly available steps

### 6. Quality Control Integration

For quality check steps:
- Show quality-specific interface
- Require quality result (passed/failed)
- Handle failure actions (scrap/rework)
- Block dependent steps on quality failure

### 7. Work Cell Integration

- Display assigned work cell prominently
- Filter available steps by user's work cell permissions
- Track which work cell performed each execution

## Implementation Phases

### Phase 1: Backend Foundation (2-3 days)
1. Create StepExecutionService
2. Implement step execution endpoints
3. Add progressive flow dependency checks
4. Update permissions/policies

### Phase 2: UI Complete Redesign (3-4 days)
1. Convert MODetailsDialog to MOStepExecutionDialog
2. Remove all MO-level reporting UI
3. Build step-focused layout
4. Implement step card components

### Phase 3: Step Execution Flow (2-3 days)
1. Implement start execution
2. Add progress reporting
3. Handle execution completion
4. Integrate quality checks

### Phase 4: Progressive Flow UI (2 days)
1. Show dependency information
2. Real-time step availability updates
3. Visual dependency indicators

### Phase 5: Testing & Polish (2 days)
1. End-to-end testing
2. Error handling
3. Loading states
4. User feedback

## Migration Strategy

### Handling Non-Routed Orders:
- Non-routed orders will need a different interface
- Create a separate `SimpleProductionDialog` for non-routed MOs
- Route to appropriate dialog based on `order.has_route`

### For Routed Orders:
- Strict step execution only
- No fallback to MO-level reporting
- Enforce step sequence and dependencies

### Data Migration:
```sql
-- For existing in-progress MOs with routes
UPDATE manufacturing_steps ms
JOIN manufacturing_routes mr ON ms.manufacturing_route_id = mr.id
JOIN manufacturing_orders mo ON mr.manufacturing_order_id = mo.id
SET ms.cumulative_quantity_completed = mo.quantity_completed,
    ms.cumulative_quantity_scrapped = mo.quantity_scrapped
WHERE ms.id = (
    SELECT MAX(id) FROM manufacturing_steps 
    WHERE manufacturing_route_id = mr.id
);
```

## Success Metrics

1. **Accuracy**: Step-level quantities match MO totals
2. **Visibility**: Users can see progress at each step
3. **Efficiency**: Reduced time to identify bottlenecks
4. **Compliance**: Quality checks properly enforced
5. **Traceability**: Complete execution history per step

## Risks and Mitigations

### Risk 1: User Confusion
- **Mitigation**: Phased rollout with training materials

### Risk 2: Performance Impact
- **Mitigation**: Optimize queries, use eager loading

### Risk 3: Complex UI
- **Mitigation**: Progressive disclosure, clear visual hierarchy

## Future Enhancements

1. **Batch Execution**: Report progress for multiple units
2. **Time Tracking**: Automatic setup/cycle time capture
3. **Resource Assignment**: Track operators per execution
4. **Real-time Updates**: WebSocket integration for live progress
5. **Mobile Interface**: Optimized step execution for tablets

## Key Design Decisions

### 1. **Single Purpose Dialog**
- The dialog is exclusively for step execution
- No mixing of MO-level and step-level reporting
- Clear separation of concerns

### 2. **Step-Centric Interface**
- Active step takes primary visual focus
- Route overview is secondary/contextual
- Reporting interface only appears for executable steps

### 3. **Strict Enforcement**
- No bypassing of route steps
- Dependencies must be satisfied
- Quality checks are mandatory

### 4. **Progressive Flow First**
- UI designed around progressive flow concepts
- Clear visualization of dependencies
- Real-time updates as steps progress

## Expected Outcomes

### User Experience Improvements:
1. **Clarity**: Users know exactly which step they're working on
2. **Efficiency**: Focus on current work, not entire order
3. **Accuracy**: Step-level tracking prevents errors
4. **Visibility**: Clear view of bottlenecks and dependencies

### System Benefits:
1. **Data Integrity**: Proper execution records at step level
2. **Traceability**: Complete history of who did what, when
3. **Performance**: Optimized queries for step-level data
4. **Scalability**: Supports complex multi-step manufacturing

## Conclusion

This conversion transforms the MODetailsDialog from a conceptually flawed MO-level reporting tool into a proper step execution interface. By focusing strictly on step-level execution, we align the UI with the system's architecture and enable true progressive flow manufacturing. The redesign eliminates the current conceptual mismatch and provides users with a clear, efficient interface for executing manufacturing steps in sequence.
