# MOStepActionDialog Refactoring Plan

## Overview

This document outlines the comprehensive refactoring plan for the `MOStepActionDialog.tsx` component, which currently contains 1,186 lines of code. The goal is to break this monolithic component into smaller, more maintainable pieces with clear separation of concerns.

## Current Issues

1. **Size**: 1,186 lines in a single file
2. **Multiple Responsibilities**: State management, data fetching, UI rendering, business logic
3. **Poor Testability**: Difficult to unit test individual features
4. **Maintenance Burden**: Hard to locate and fix specific functionality
5. **Performance**: Large component re-renders affecting performance

## Refactoring Goals

- **Maximum 200 lines** per component file
- **Single Responsibility** for each component/hook
- **Type Safety** throughout with proper TypeScript interfaces
- **Inertia-based** communication with backend
- **Testable** hooks and utility functions
- **Reusable** components where applicable

## New File Structure

```
resources/js/pages/production/reporting/components/
├── MOStepActionDialog.tsx (main component, ~150-200 lines)
├── MOStepActionDialogDEPRECATED.tsx (current file, renamed)
├── hooks/
│   ├── useMOStepData.ts
│   ├── useMOStepStateTransitions.ts
│   ├── useMOStepQuantityReporting.ts
│   └── useMOStepPhotoManagement.ts
├── components/
│   ├── MOStepDialogHeader.tsx
│   ├── MOStepDialogContent.tsx
│   ├── MOStepStateContent.tsx
│   ├── MOStepProductionActions.tsx
│   ├── MOStepActionButtons.tsx
│   ├── MOStepPictureSection.tsx
│   └── MOStepCurrentStepSection.tsx
├── dialogs/
│   ├── MOStepReasonDialog.tsx
│   └── MOStepLabelPrintDialog.tsx
├── utils/
│   ├── moStepHelpers.ts
│   └── moStepStateTransitions.ts
└── types/
    └── moStep.ts (if not already in global types)
```

## Detailed Component Breakdown

### 1. Main Component: `MOStepActionDialog.tsx`

**Responsibilities:**
- Dialog state management (open/close)
- Orchestration of sub-components
- Top-level error boundary

**Structure:**
```typescript
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMOStepData } from './hooks/useMOStepData';
import { useMOStepStateTransitions } from './hooks/useMOStepStateTransitions';
import { useMOStepQuantityReporting } from './hooks/useMOStepQuantityReporting';
import { useMOStepPhotoManagement } from './hooks/useMOStepPhotoManagement';
import { MOStepDialogHeader } from './components/MOStepDialogHeader';
import { MOStepDialogContent } from './components/MOStepDialogContent';
// ... other imports

interface MOStepActionDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeStepId?: number;
    onStateChanged?: () => void;
}

export function MOStepActionDialog(props: MOStepActionDialogProps) {
    // Use custom hooks - note the order and dependencies
    const stepData = useMOStepData(props.order, props.isOpen, props.activeStepId);
    
    const stateTransitions = useMOStepStateTransitions({
        stepData,
        order: props.order,
        onStateChanged: props.onStateChanged
    });
    
    const quantityReporting = useMOStepQuantityReporting({
        stepData,
        order: props.order,
        onStateChanged: props.onStateChanged
    });
    
    const photoManagement = useMOStepPhotoManagement({ stepData });

    if (!props.order || stepData.loading) return null;

    return (
        <>
            <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
                <DialogContent className="!max-w-[90vw] w-[80vw] max-h-[90vh] p-0 gap-0">
                    <MOStepDialogHeader 
                        order={props.order} 
                        currentStep={stepData.currentStep} 
                    />
                    <MOStepDialogContent
                        stepData={stepData}
                        stateTransitions={stateTransitions}
                        quantityReporting={quantityReporting}
                        photoManagement={photoManagement}
                        order={props.order}
                    />
                </DialogContent>
            </Dialog>
            
            {/* Sub-dialogs */}
            <MOStepReasonDialog {...stateTransitions.reasonDialog} />
            <QuantityReportDialog {...quantityReporting.productionDialog} />
            <QuantityReportDialog {...quantityReporting.scrapDialog} />
            <StepPhotoCapture {...photoManagement.captureDialog} />
            <MOStepLabelPrintDialog {...stateTransitions.labelDialog} />
        </>
    );
}
```

### 2. Hooks

#### `useMOStepData.ts`

**Extracted lines:** 88-287 (initialization and data management)

**Responsibilities:**
- Initialize dialog data
- Find active step
- Determine step state
- Manage loading states
- **CRITICAL**: Provide setters for state updates from other hooks

**Interface:**
```typescript
interface UseMOStepDataReturn {
    // State values
    currentStep: ManufacturingStep | null;
    activeExecution: ManufacturingStepExecution | null;
    stepStateInfo: StepStateInfo | null;
    loading: boolean;
    
    // State setters (needed by other hooks)
    setCurrentStep: (step: ManufacturingStep | null) => void;
    setActiveExecution: (execution: ManufacturingStepExecution | null) => void;
    setStepStateInfo: (info: StepStateInfo | null) => void;
    setStepPhotos: (photos: Media[]) => void;
    stepPhotos: Media[];
    
    // Methods
    refresh: () => Promise<void>;
    initializeDialog: () => Promise<void>;
}

export function useMOStepData(
    order: ManufacturingOrder | null,
    isOpen: boolean,
    activeStepId?: number
): UseMOStepDataReturn {
    const [currentStep, setCurrentStep] = useState<ManufacturingStep | null>(null);
    const [activeExecution, setActiveExecution] = useState<ManufacturingStepExecution | null>(null);
    const [stepStateInfo, setStepStateInfo] = useState<StepStateInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [stepPhotos, setStepPhotos] = useState<Media[]>([]);
    
    // initializeDialog function that other hooks can call
    const initializeDialog = useCallback(async () => {
        // Implementation
    }, [order, activeStepId]);
    
    useEffect(() => {
        if (order && isOpen) {
            initializeDialog();
        }
    }, [order?.id, isOpen, activeStepId, initializeDialog]);
    
    return {
        currentStep,
        activeExecution,
        stepStateInfo,
        loading,
        setCurrentStep,
        setActiveExecution,
        setStepStateInfo,
        stepPhotos,
        setStepPhotos,
        refresh: initializeDialog,
        initializeDialog
    };
}
```

#### `useMOStepStateTransitions.ts`

**Extracted lines:** 290-516 (state transition logic)

**Responsibilities:**
- Handle state transitions via Inertia
- Manage transition loading states
- Handle reason dialogs
- Execute all state-specific actions
- **CRITICAL**: Update stepData states after successful transitions

**Interface:**
```typescript
interface UseMOStepStateTransitionsParams {
    stepData: UseMOStepDataReturn;
    order: ManufacturingOrder | null;
    onStateChanged?: () => void;
}

interface UseMOStepStateTransitionsReturn {
    transitionLoading: boolean;
    handleStateAction: (action: StateTransitionAction) => void;
    reasonDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        pendingAction: StateTransitionAction | null;
        reason: string;
        onReasonChange: (reason: string) => void;
        onConfirm: () => void;
    };
    labelDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
    };
}

export function useMOStepStateTransitions({
    stepData,
    order,
    onStateChanged
}: UseMOStepStateTransitionsParams): UseMOStepStateTransitionsReturn {
    const [transitionLoading, setTransitionLoading] = useState(false);
    const [showReasonDialog, setShowReasonDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<StateTransitionAction | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [showLabels, setShowLabels] = useState(false);
    
    const { 
        currentStep, 
        activeExecution, 
        setCurrentStep, 
        setActiveExecution, 
        setStepStateInfo,
        initializeDialog 
    } = stepData;
    
    // Example of state transition that updates local state
    const startExecution = () => {
        if (!currentStep || !order) return;
        
        router.post(route('production.reporting.steps.start'), {
            manufacturing_order_id: order.id,
            manufacturing_step_id: currentStep.id,
        }, {
            preserveUrl: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const pageProps = page.props as { execution?: ManufacturingStepExecution };
                
                if (pageProps.execution) {
                    // Update states directly
                    setActiveExecution(pageProps.execution);
                    setCurrentStep({
                        ...currentStep,
                        status: 'in_progress'
                    });
                    setStepStateInfo({
                        state: 'in_progress',
                        canStart: false,
                        cannotStartReason: undefined
                    });
                    
                    setTransitionLoading(false);
                    if (onStateChanged) onStateChanged();
                } else {
                    // Fallback to reinitializing
                    initializeDialog().then(() => {
                        setTransitionLoading(false);
                        if (onStateChanged) onStateChanged();
                    });
                }
            },
            onError: () => {
                setTransitionLoading(false);
            }
        });
    };
    
    // All other transition methods follow similar pattern
}
```

#### `useMOStepQuantityReporting.ts`

**Extracted lines:** 80-87, 517-612 (form handling and quantity reporting)

**Responsibilities:**
- useForm management
- Production/scrap quantity reporting via Inertia
- Dialog state management
- **CRITICAL**: Form data needs to be isolated but accessible

**Interface:**
```typescript
interface UseMOStepQuantityReportingParams {
    stepData: UseMOStepDataReturn;
    order: ManufacturingOrder | null;
    onStateChanged?: () => void;
}

interface UseMOStepQuantityReportingReturn {
    form: {
        data: {
            quantity_completed: number;
            quantity_scrapped: number;
            scrap_reason: string;
            notes: string;
            time_spent: number;
            mark_complete: boolean;
        };
        setData: (key: string, value: any) => void;
        reset: () => void;
        processing: boolean;
    };
    productionDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        maxQuantity: number;
        currentQuantity: number;
        onSubmit: (quantity: number) => void;
        unitOfMeasure?: string;
    };
    scrapDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        maxQuantity: number;
        currentQuantity: number;
        onSubmit: (quantity: number, reason?: string) => void;
        unitOfMeasure?: string;
    };
    handleSubmit: () => void;
    getRemainingQuantity: () => number;
}

export function useMOStepQuantityReporting({
    stepData,
    order,
    onStateChanged
}: UseMOStepQuantityReportingParams): UseMOStepQuantityReportingReturn {
    const { currentStep, activeExecution, initializeDialog } = stepData;
    
    const [showProductionDialog, setShowProductionDialog] = useState(false);
    const [showScrapDialog, setShowScrapDialog] = useState(false);
    
    const { data, setData, post, reset, processing } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        notes: '',
        time_spent: 0,
        mark_complete: false,
    });
    
    const getRemainingQuantity = () => {
        if (!activeExecution || !order) return 0;
        const cumulative = currentStep?.cumulative_quantity_completed || 0;
        const cumulativeScrap = currentStep?.cumulative_quantity_scrapped || 0;
        return order.quantity - cumulative - cumulativeScrap;
    };
    
    const handleSubmit = () => {
        if (!activeExecution?.id) return;
        
        post(route('production.reporting.steps.report', { execution: activeExecution.id }), {
            preserveUrl: true,
            onSuccess: () => {
                reset();
                initializeDialog().then(() => {
                    if (onStateChanged) onStateChanged();
                });
            }
        });
    };
    
    const handleProductionReport = (quantity: number) => {
        // Update form data and submit
        setData({
            quantity_completed: quantity,
            quantity_scrapped: 0,
            scrap_reason: '',
            notes: '',
            time_spent: 0,
            mark_complete: false,
        });
        
        // Use form's post method
        handleSubmit();
    };
    
    // Return object with all needed properties
}
```

#### `useMOStepPhotoManagement.ts`

**Extracted lines:** 614-646 (photo management)

**Responsibilities:**
- Photo upload via Inertia
- Photo deletion via Inertia
- Photo state management
- **CRITICAL**: Sync photos with stepData.stepPhotos

**Interface:**
```typescript
interface UseMOStepPhotoManagementParams {
    stepData: UseMOStepDataReturn;
}

interface UseMOStepPhotoManagementReturn {
    photos: Media[];
    selectedPhotoIndex: number | null;
    showingStepPhotos: boolean;
    setSelectedPhotoIndex: (index: number | null) => void;
    setShowingStepPhotos: (show: boolean) => void;
    captureDialog: {
        isOpen: boolean;
        onClose: () => void;
        onPhotoAdded: (photo: File) => void;
    };
    handleDeletePhoto: (photo: Media) => void;
}

export function useMOStepPhotoManagement({
    stepData
}: UseMOStepPhotoManagementParams): UseMOStepPhotoManagementReturn {
    const { activeExecution, stepPhotos, setStepPhotos } = stepData;
    
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showingStepPhotos, setShowingStepPhotos] = useState(false);
    const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
    
    const handlePhotoAdded = (photo: File) => {
        if (!activeExecution) return;
        
        const formData = new FormData();
        formData.append('photo', photo);
        
        router.post(route('production.reporting.steps.upload-photo', { 
            execution: activeExecution.id 
        }), formData, {
            preserveUrl: true,
            onSuccess: (page) => {
                const pageProps = page.props as { newPhoto?: Media };
                if (pageProps.newPhoto) {
                    setStepPhotos([...stepPhotos, pageProps.newPhoto]);
                }
            }
        });
    };
    
    const handleDeletePhoto = (photo: Media) => {
        if (!activeExecution || !photo.id) return;
        
        if (confirm('Are you sure you want to delete this photo?')) {
            router.delete(route('production.reporting.steps.delete-photo', {
                execution: activeExecution.id,
                media: photo.id
            }), {
                preserveUrl: true,
                onSuccess: () => {
                    setStepPhotos(stepPhotos.filter(p => p.id !== photo.id));
                    setSelectedPhotoIndex(null);
                }
            });
        }
    };
    
    return {
        photos: stepPhotos,
        selectedPhotoIndex,
        showingStepPhotos,
        setSelectedPhotoIndex,
        setShowingStepPhotos,
        captureDialog: {
            isOpen: photoCaptureOpen,
            onClose: () => setPhotoCaptureOpen(false),
            onPhotoAdded: handlePhotoAdded
        },
        handleDeletePhoto
    };
}
```

### 3. UI Components

#### `MOStepDialogHeader.tsx`

**Extracted lines:** 891-913

**Props:**
```typescript
interface MOStepDialogHeaderProps {
    order: ManufacturingOrder;
    currentStep: ManufacturingStep | null;
}
```

#### `MOStepDialogContent.tsx`

**Extracted lines:** 915-1070 (main content wrapper)

**Props:**
```typescript
interface MOStepDialogContentProps {
    stepData: UseMOStepDataReturn;
    stateTransitions: UseMOStepStateTransitionsReturn;
    quantityReporting: UseMOStepQuantityReportingReturn;
    photoManagement: UseMOStepPhotoManagementReturn;
    order: ManufacturingOrder;
}
```

#### `MOStepStateContent.tsx`

**Extracted lines:** 793-881 (renderStateContent function)

**Responsibilities:**
- Render appropriate state component
- Handle loading overlay
- Route to correct state display

#### `MOStepProductionActions.tsx`

**Extracted lines:** 675-722 (production summary and report buttons)

**Props:**
```typescript
interface MOStepProductionActionsProps {
    order: ManufacturingOrder;
    currentStep: ManufacturingStep;
    quantityReporting: UseMOStepQuantityReportingReturn;
}
```

#### `MOStepActionButtons.tsx`

**Extracted lines:** 728-788 (action button grid)

**Props:**
```typescript
interface MOStepActionButtonsProps {
    onPrintLabels: () => void;
    onTakePhoto: () => void;
    onPutOnHold: () => void;
    onReportIssue: () => void;
    photoLimitReached: boolean;
}
```

#### `MOStepPictureSection.tsx`

**Extracted lines:** 924-1038

**Props:**
```typescript
interface MOStepPictureSectionProps {
    order: ManufacturingOrder;
    photos: Media[];
    selectedPhotoIndex: number | null;
    showingStepPhotos: boolean;
    onPhotoNavigate: (direction: 'prev' | 'next') => void;
    onPhotoSelect: (index: number) => void;
    onToggleStepPhotos: () => void;
}
```

#### `MOStepCurrentStepSection.tsx`

**Extracted lines:** 1044-1067

**Props:**
```typescript
interface MOStepCurrentStepSectionProps {
    currentStep: ManufacturingStep | null;
}
```

### 4. Utility Functions

#### `moStepHelpers.ts`

**Functions to extract:**
- `findActiveStep` (lines 170-220)
- `determineStepState` (lines 222-290)
- `getRemainingQuantity` (lines 519-525)

**Type-safe interfaces:**
```typescript
export interface ActiveStepResult {
    step: ManufacturingStep | null;
    execution: ManufacturingStepExecution | null;
}

export function findActiveStep(order: ManufacturingOrder): ActiveStepResult;
export function determineStepState(
    step: ManufacturingStep, 
    execution: ManufacturingStepExecution | null
): Promise<StepStateInfo>;
export function getRemainingQuantity(
    order: ManufacturingOrder,
    currentStep: ManufacturingStep | null,
    activeExecution: ManufacturingStepExecution | null
): number;
```

### 5. Dialog Components

#### `MOStepReasonDialog.tsx`

**Extracted lines:** 1075-1117

**Props:**
```typescript
interface MOStepReasonDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    pendingAction: StateTransitionAction | null;
    reason: string;
    onReasonChange: (reason: string) => void;
    onConfirm: () => void;
}
```

#### `MOStepLabelPrintDialog.tsx`

**Extracted lines:** 1149-1160

## Implementation Steps

### Phase 1: Setup (Day 1)
1. Create new directory structure
2. Rename current file to `MOStepActionDialogDEPRECATED.tsx`
3. Create all new empty files with proper imports
4. Set up TypeScript interfaces in `types/moStep.ts`

### Phase 2: Extract Utilities (Day 2)
1. Extract helper functions to `moStepHelpers.ts`
2. Add proper TypeScript types
3. Write unit tests for helpers
4. Update imports in deprecated file

### Phase 3: Extract Hooks (Days 3-4)
1. Extract `useMOStepData` hook
2. Extract `useMOStepStateTransitions` hook (ensure all Inertia calls are properly typed)
3. Extract `useMOStepQuantityReporting` hook
4. Extract `useMOStepPhotoManagement` hook
5. Test each hook independently

### Phase 4: Extract UI Components (Days 5-6)
1. Extract header and content wrapper components
2. Extract state-specific content components
3. Extract action button components
4. Extract picture and step display components
5. Ensure proper prop drilling and type safety

### Phase 5: Create Main Component (Day 7)
1. Build new `MOStepActionDialog.tsx` using all extracted pieces
2. Ensure all functionality works as before
3. Add error boundaries where appropriate

### Phase 6: Testing & Cleanup (Day 8)
1. Run comprehensive tests
2. Fix any type safety issues
3. Performance testing
4. Update component imports in parent components
5. Remove deprecated file after confirmation

## Type Safety Considerations

### Inertia Types
All Inertia router calls must be properly typed:

```typescript
import { router } from '@inertiajs/react';

// Example of typed Inertia call
router.post<{ execution?: ManufacturingStepExecution }>(
    route('production.reporting.steps.start'),
    {
        manufacturing_order_id: order.id,
        manufacturing_step_id: currentStep.id,
    },
    {
        preserveUrl: true,
        preserveScroll: true,
        onSuccess: (page) => {
            // Type-safe access to page.props
        }
    }
);
```

### Form Types
Ensure useForm is properly typed:

```typescript
const form = useForm<{
    quantity_completed: number;
    quantity_scrapped: number;
    scrap_reason: string;
    notes: string;
    time_spent: number;
    mark_complete: boolean;
}>({
    // Initial values
});
```

### Component Props
All component props must have explicit interfaces with no `any` types.

## Testing Strategy

1. **Unit Tests**: For all utility functions and custom hooks
2. **Integration Tests**: For main dialog functionality
3. **Type Tests**: Ensure no TypeScript errors
4. **Performance Tests**: Measure render times before/after

## Success Metrics

- [ ] No component exceeds 200 lines
- [ ] All Inertia calls are type-safe
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Performance improved or maintained
- [ ] Code coverage maintained or improved

## Rollback Plan

If issues arise:
1. Keep `MOStepActionDialogDEPRECATED.tsx` for 2 weeks
2. Easy switch back by updating imports
3. Document any issues found

## Critical Hook Dependencies and Data Flow

### Hook Dependency Graph
```
useMOStepData (root - manages core state)
    ├── useMOStepStateTransitions (needs state setters)
    ├── useMOStepQuantityReporting (needs state + refresh)
    └── useMOStepPhotoManagement (needs photos state)
```

### Key Architectural Decisions

1. **Centralized State in useMOStepData**
   - All core state (currentStep, activeExecution, stepStateInfo) lives here
   - Provides setters to other hooks that need to update state
   - Owns the `initializeDialog` function that refreshes all data

2. **Hook Communication Pattern**
   - Hooks receive `stepData` object containing both values and setters
   - This prevents prop drilling while maintaining clear data flow
   - Each hook can update relevant state through provided setters

3. **Inertia Success Handlers**
   - Option 1: Update local state optimistically if response contains data
   - Option 2: Call `initializeDialog()` to refresh all data from server
   - Always call `onStateChanged` callback after updates

### Potential Issues and Solutions

#### Issue 1: Circular Dependencies
**Problem**: Hooks depending on each other's return values
**Solution**: Pass `stepData` object down, not individual hook returns

#### Issue 2: State Synchronization
**Problem**: Multiple hooks updating same state could cause conflicts
**Solution**: All state updates go through `useMOStepData` setters

#### Issue 3: Form Data Isolation
**Problem**: useForm hook data needs to be accessible but isolated
**Solution**: Return form object with needed properties, not spreading

#### Issue 4: Re-render Performance
**Problem**: Any state change triggers all hook re-executions
**Solution**: Use `useCallback` and `useMemo` for expensive operations

#### Issue 5: Photo State Management
**Problem**: Photos array needs to sync with execution media
**Solution**: Store photos in `useMOStepData`, update via setters

### Testing Considerations

1. **Hook Testing**: Each hook should be testable in isolation
2. **Mock stepData**: Create factory for mock stepData objects
3. **Inertia Mocking**: Mock router.post/delete calls in tests

## Notes

- All backend communication MUST use Inertia
- Maintain existing functionality exactly
- Focus on type safety throughout
- Consider performance implications of prop drilling
- Add JSDoc comments for complex functions
- Use React.memo for expensive child components
- Consider using useCallback for event handlers passed to children
