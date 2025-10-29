# MO Details Dialog State Augmentation Specification

## Overview

This specification details the refactoring requirements for the MODetailsDialog component to support all manufacturing step states and state transitions as defined in the Manufacturing Step States and Transitions documentation. The dialog will maintain its existing three-section layout while dynamically adapting the left section based on the current step state.

## Layout Structure

### Consistent Layout Across All States

The dialog maintains a consistent three-section layout:

1. **Left Side**: Dynamic content based on step state (state transitions, quantity reporting, actions)
2. **Top Right**: Item image and step pictures (remains constant)
3. **Bottom Right**: MO Route steps and gates visualization (remains constant)

### Header Section (Consistent)
- Manufacturing Order number
- Item name and total quantity
- MO status badge
- Work cell assignment

## State-Specific Left Side Content

### 1. Pending State
**Display**:
- Large icon: Clock/Hourglass
- Title: "Step Pending"
- Description: "Waiting for dependencies to be met"
- Dependency status list showing:
  - Previous step completion status
  - Child order dependencies status
  - Progress indicators for each dependency

**Action Buttons**:
- **Force Start** (warning style, requires permission)
  - Icon: AlertTriangle + Play
  - Label: "Force Start (Override Dependencies)"
  - Behavior: Shows warning dialog listing unmet dependencies, requires confirmation
  - Permission: `force_start_steps`
- **Refresh Dependencies** (ghost style)
  - Icon: RefreshCw
  - Label: "Check Dependencies"
  - Behavior: Re-evaluates dependency conditions
- **View Dependencies** (outline style)
  - Icon: Info
  - Label: "View Dependency Details"
  - Behavior: Opens modal with detailed dependency tree

### 2. Queued State
**Display**:
- Large icon: Play button
- Title: "Ready to Start"
- Subtitle: Step name and description
- Work cell assignment
- Estimated duration
- Queue position (if applicable)

**Action Buttons**:
- **Start Execution** (primary style, main action)
  - Icon: Play
  - Label: "Start Step Execution"
  - Behavior: Creates execution record, transitions to in_progress
  - Validates: Work cell assignment, operator permissions
- **Skip Step** (outline style, requires permission)
  - Icon: SkipForward
  - Label: "Skip This Step"
  - Behavior: Shows reason dialog, marks as skipped
  - Permission: `skip_steps`
- **Change Priority** (ghost style, requires permission)
  - Icon: ArrowUpDown
  - Label: "Change Queue Priority"
  - Behavior: Opens priority adjustment dialog
  - Permission: `manage_queue_priority`
- **View Instructions** (ghost style)
  - Icon: FileText
  - Label: "View Work Instructions"
  - Behavior: Shows step instructions/documents

### 3. In Progress State (Current Implementation Enhanced)
**Display**:
- Tabs: "PRODUÇÃO" / "SCRAP"
- Quantity counter controls
- Current progress vs remaining
- Timer showing elapsed time
- Operator information

**Action Buttons**:
Primary Row:
- **Submit Progress** (primary style, main action)
  - Icon: Check
  - Label: "Submit"
  - Behavior: Records quantities, may complete step or continue
  - Validates: Quantity > 0, scrap reason if scrap > 0
  
Secondary Row:
- **Mark Complete** (checkbox toggle)
  - Label: "Mark Step Complete"
  - Behavior: Completes step if quantities allow
  - Enabled when: cumulative >= required quantity
  
Action Grid (2x2):
- **Print QR Code** (outline style)
  - Icon: Printer
  - Label: "Print QR Code"
  - Behavior: Generates and prints step QR labels
- **Take Picture** (outline style)
  - Icon: Camera
  - Label: "Take Picture"
  - Behavior: Opens photo capture dialog
  - Limit: Max 3 photos per execution
- **Put On Hold** (warning style)
  - Icon: Pause
  - Label: "Put On Hold"
  - Behavior: Opens hold reason dialog
  - Creates: Hold record with reason
- **Report Issue** (ghost style)
  - Icon: AlertCircle
  - Label: "Report Issue"
  - Behavior: Opens issue reporting form
  - Creates: Issue ticket linked to step

### 4. On Hold State
**Display**:
- Large icon: Pause
- Title: "Step On Hold"
- Hold reason (displayed prominently)
- Hold duration timer (live updating)
- Previous state: "Was: [in_progress/awaiting_quality]"
- Held by: [User name]

**Action Buttons**:
- **Resume Execution** (primary style, main action)
  - Icon: Play
  - Label: "Resume Step"
  - Behavior: Returns to previous state (in_progress or awaiting_quality)
  - Validates: Original conditions still met
- **Cancel Step** (destructive style, requires permission)
  - Icon: XCircle
  - Label: "Cancel This Step"
  - Behavior: Confirmation dialog, cancels step and dependent steps
  - Permission: `cancel_steps`
- **Change Hold Reason** (outline style)
  - Icon: Edit
  - Label: "Update Hold Reason"
  - Behavior: Opens edit dialog for hold reason
- **View Hold History** (ghost style)
  - Icon: History
  - Label: "Hold History"
  - Behavior: Shows timeline of holds/resumes

### 5. Awaiting Quality State
**Display**:
- Large icon: Clipboard with checkmark
- Title: "Awaiting Quality Check"
- Completed quantity display
- Quality check requirements list
- Quality form link (if applicable)
- Inspector assignment field

**Action Buttons**:
Main Quality Actions (button group):
- **Quality Pass** (success style)
  - Icon: CheckCircle
  - Label: "Pass Quality Check"
  - Behavior: Completes step, records pass result
  - Validates: Quality form completed if required
- **Quality Fail - Scrap** (destructive style)
  - Icon: Trash2
  - Label: "Fail - Scrap All"
  - Behavior: Opens scrap reason dialog, marks quantities as scrap
  - Creates: Scrap record with reason
- **Quality Fail - Rework** (warning style)
  - Icon: RotateCw
  - Label: "Fail - Rework Required"
  - Behavior: Creates rework step, links to original
  - Creates: New rework step in route

Secondary Actions:
- **Partial Pass** (outline style, if enabled)
  - Icon: PieChart
  - Label: "Record Partial Results"
  - Behavior: Opens dialog to pass some, fail some
  - Enabled when: Partial quality allowed
- **Put On Hold** (outline style)
  - Icon: Pause
  - Label: "Hold Quality Check"
  - Behavior: Pauses quality process
- **Attach Quality Report** (ghost style)
  - Icon: Paperclip
  - Label: "Attach Report"
  - Behavior: File upload for quality documents
- **Request Re-inspection** (ghost style)
  - Icon: UserCheck
  - Label: "Request Different Inspector"
  - Behavior: Notifies quality supervisor

### 6. Completed State
**Display**:
- Large icon: Check circle (green)
- Title: "Step Completed"
- Completion summary:
  - Total quantity produced
  - Total quantity scrapped
  - Actual duration vs estimated
  - Efficiency percentage
  - Completed by: [Operator name]

**Action Buttons**:
- **View Execution Details** (primary style)
  - Icon: FileText
  - Label: "View Full Report"
  - Behavior: Opens detailed execution history
- **View Photos** (outline style)
  - Icon: Image
  - Label: "View Photos Taken"
  - Behavior: Opens photo gallery
  - Shows: All photos from all executions
- **Print Completion Report** (outline style)
  - Icon: Printer
  - Label: "Print Report"
  - Behavior: Generates PDF completion report
- **Navigate to Next Step** (ghost style)
  - Icon: ArrowRight
  - Label: "Go to Next Step"
  - Behavior: Opens next step if available
  - Enabled when: Next step exists and is accessible

### 7. Skipped State
**Display**:
- Large icon: Forward/Skip
- Title: "Step Skipped"
- Skip reason (displayed prominently)
- Skipped by: [User name]
- Skipped at: [Timestamp]
- Authorization: [Authorizer if different]

**Action Buttons**:
- **Revert Skip** (warning style, requires permission)
  - Icon: Undo
  - Label: "Revert Skip Decision"
  - Behavior: Returns step to queued state
  - Permission: `revert_skip`
  - Validates: Dependent steps not started
- **View Skip Justification** (outline style)
  - Icon: FileText
  - Label: "View Full Justification"
  - Behavior: Shows detailed skip documentation

### 8. Cancelled State
**Display**:
- Large icon: X circle (red)
- Title: "Step Cancelled"
- Cancellation reason
- Cancelled by: [User name]
- Impact summary: Lists affected dependent steps

**Action Buttons**:
- **View Cancellation Details** (outline style)
  - Icon: Info
  - Label: "View Details"
  - Behavior: Shows full cancellation information
- **Export Cancellation Report** (ghost style)
  - Icon: Download
  - Label: "Export Report"
  - Behavior: Downloads cancellation documentation

## Button Layout Guidelines

### Layout Principles
1. **Primary Action**: Always prominent, full width at bottom of left section
2. **Secondary Actions**: Grouped by function, using consistent spacing
3. **Destructive Actions**: Red/warning styling, require confirmation
4. **Permission-based Actions**: Hidden if user lacks permission

### Button Organization by State

#### Pending State Layout
```
[Dependency Status Display]
      ↓
[Force Start - Warning Button]
[Refresh Deps] [View Details]
```

#### Queued State Layout
```
[Step Info Display]
      ↓
[Start Execution - Primary]
[Skip Step] [Priority] [Instructions]
```

#### In Progress State Layout
```
[Quantity Controls]
      ↓
[Submit - Primary Button]
[✓ Mark Complete - Checkbox]
[Print QR | Take Pic]
[Hold     | Report  ]
```

#### On Hold State Layout
```
[Hold Info Display]
      ↓
[Resume - Primary Button]
[Cancel Step - Destructive]
[Change Reason] [History]
```

#### Awaiting Quality State Layout
```
[Quality Requirements]
      ↓
[Pass | Fail-Scrap | Fail-Rework]
[Partial Pass - If Enabled]
[Hold] [Attach] [Re-inspect]
```

#### Completed State Layout
```
[Completion Summary]
      ↓
[View Details - Primary]
[Photos] [Print] [Next →]
```

## Implementation Requirements

### State Detection Logic

```typescript
interface StepState {
  state: 'pending' | 'queued' | 'in_progress' | 'on_hold' | 
         'awaiting_quality' | 'completed' | 'skipped' | 'cancelled';
  canStart: boolean;
  cannotStartReason?: string;
  dependencies?: {
    stepDependencies: Array<{
      step: string;
      status: 'pending' | 'met' | 'failed';
      progress?: number;
    }>;
    childOrderDependencies: Array<{
      order: string;
      status: 'pending' | 'met' | 'failed';
      progress?: number;
    }>;
  };
  holdInfo?: {
    reason: string;
    duration: number;
    previousState: string;
  };
  qualityRequirements?: {
    formRequired: boolean;
    formUrl?: string;
    specifications: string[];
  };
}
```

### State Transition Buttons

Each state should show only valid transition actions:

```typescript
interface StateTransition {
  action: string;
  label: string;
  icon: React.ComponentType;
  variant: 'default' | 'outline' | 'destructive' | 'ghost';
  confirmMessage?: string;
  requiresPermission?: string;
}

const stateTransitions: Record<StepState['state'], StateTransition[]> = {
  pending: [],
  queued: [
    { action: 'start', label: 'Start Execution', icon: Play, variant: 'default' },
    { action: 'skip', label: 'Skip Step', icon: SkipForward, variant: 'outline', requiresPermission: 'skip_steps' }
  ],
  in_progress: [
    { action: 'hold', label: 'Put On Hold', icon: Pause, variant: 'outline' },
    { action: 'submit', label: 'Submit Progress', icon: Check, variant: 'default' }
  ],
  on_hold: [
    { action: 'resume', label: 'Resume', icon: Play, variant: 'default' },
    { action: 'cancel', label: 'Cancel', icon: XCircle, variant: 'destructive', confirmMessage: 'Are you sure?' }
  ],
  awaiting_quality: [
    { action: 'quality_pass', label: 'Pass', icon: CheckCircle, variant: 'default' },
    { action: 'quality_fail', label: 'Fail', icon: XCircle, variant: 'destructive' },
    { action: 'hold', label: 'Put On Hold', icon: Pause, variant: 'outline' }
  ],
  completed: [],
  skipped: [],
  cancelled: []
};
```

### API Endpoints Required

```typescript
// New endpoints needed
POST   /production/reporting/steps/{step}/start
POST   /production/reporting/steps/{step}/hold
POST   /production/reporting/steps/{step}/resume
POST   /production/reporting/steps/{step}/skip
POST   /production/reporting/steps/{step}/quality-result
GET    /production/reporting/steps/{step}/dependencies
GET    /production/reporting/steps/{step}/quality-requirements
```

### Component Structure

```typescript
// Main component structure
export function MODetailsDialog({ order, isOpen, onOpenChange }: MODetailsDialogProps) {
  // State management
  const [currentStepState, setCurrentStepState] = useState<StepState>();
  const [stateSpecificData, setStateSpecificData] = useState<any>();
  
  // Render functions for each state
  const renderPendingState = () => { /* ... */ };
  const renderQueuedState = () => { /* ... */ };
  const renderInProgressState = () => { /* ... */ };
  const renderOnHoldState = () => { /* ... */ };
  const renderAwaitingQualityState = () => { /* ... */ };
  const renderCompletedState = () => { /* ... */ };
  const renderSkippedState = () => { /* ... */ };
  const renderCancelledState = () => { /* ... */ };
  
  // State renderer selector
  const renderStateContent = () => {
    switch (currentStepState?.state) {
      case 'pending': return renderPendingState();
      case 'queued': return renderQueuedState();
      case 'in_progress': return renderInProgressState();
      case 'on_hold': return renderOnHoldState();
      case 'awaiting_quality': return renderAwaitingQualityState();
      case 'completed': return renderCompletedState();
      case 'skipped': return renderSkippedState();
      case 'cancelled': return renderCancelledState();
      default: return renderNoStepState();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>{/* Consistent header */}</DialogHeader>
        
        <div className="flex min-h-[600px] gap-6">
          {/* Left - Dynamic State Content */}
          <div className="flex-1 flex flex-col pr-6 border-r">
            {renderStateContent()}
          </div>
          
          {/* Right - Consistent Picture and Step Info */}
          <div className="flex-1 flex flex-col gap-4 pl-6">
            {/* Top Right - Picture (unchanged) */}
            {/* Bottom Right - Current Step (unchanged) */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Visual Design Guidelines

### State Colors
- **Pending**: Gray/Muted (#6B7280)
- **Queued**: Blue (#3B82F6)
- **In Progress**: Green (#10B981)
- **On Hold**: Yellow/Orange (#F59E0B)
- **Awaiting Quality**: Purple (#8B5CF6)
- **Completed**: Success Green (#059669)
- **Skipped**: Gray (#9CA3AF)
- **Cancelled**: Red (#EF4444)

### Icons
- Use Lucide React icons consistently
- Large state icons: 64x64px (h-16 w-16)
- Button icons: 16x16px (h-4 w-4) or 20x20px (h-5 w-5)

### Transitions
- Smooth state transitions with fade effects
- Loading states during API calls
- Skeleton loaders for dependency checks

## Error Handling

### State-Specific Errors
- **Start Execution Failures**: Show dependency details
- **Quality Recording Failures**: Preserve entered data
- **Hold/Resume Failures**: Show reason and retry option
- **Network Errors**: Offline mode indication

### User Feedback
- Toast notifications for successful transitions
- Inline error messages for validation
- Confirmation dialogs for destructive actions

## Testing Requirements

### Unit Tests
- State transition logic validation
- Permission checks
- Dependency calculation logic
- Error state handling

### Integration Tests
- API endpoint integration
- State persistence
- Multi-user scenarios (concurrent updates)
- Network failure recovery

### E2E Tests
- Complete state transition flows
- UI interaction for each state
- Photo capture and viewing
- Quality result recording

## Migration Strategy

1. **Phase 1**: Add new state rendering functions
2. **Phase 2**: Implement state detection logic
3. **Phase 3**: Add new API endpoints
4. **Phase 4**: Wire up state transitions
5. **Phase 5**: Add animations and polish
6. **Phase 6**: Comprehensive testing

## Performance Considerations

- Lazy load state-specific components
- Optimize dependency checking queries
- Cache quality requirements
- Debounce state update checks
- Use optimistic UI updates where safe

## Accessibility

- ARIA labels for all state indicators
- Keyboard navigation for all actions
- Screen reader announcements for state changes
- High contrast mode support
- Focus management during transitions

## Future Enhancements

1. **State History Timeline**: Visual timeline of all state transitions
2. **Bulk Operations**: Handle multiple steps simultaneously
3. **State Predictions**: ML-based completion time estimates
4. **Mobile Optimizations**: Touch-friendly controls for tablet use
5. **Offline Support**: Queue actions when offline
6. **Real-time Updates**: WebSocket integration for live state updates
