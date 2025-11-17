# Production Reporting Dialog - Loading Fix Implementation

## Summary

This document provides the exact code changes needed to fix the dialog close/reopen issue when reporting production or marking steps as complete.

## Root Cause

The dialog returns `null` when loading (`MOStepActionDialog.tsx:69`), causing it to unmount and remount. Additionally, there's a double refresh happening.

## Solution Overview

1. Never return `null` while loading - show loading overlay instead
2. Add processing/loading states to show visual feedback
3. Remove double refresh by letting parent handle data updates
4. Dialog stays open and smoothly updates in place

---

## Code Changes

### 1. MOStepActionDialog.tsx

**Current (lines 69-89):**
```typescript
if (!order || stepData.loading) return null;

return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[90vw] w-[80vw] max-h-[90vh] p-0 gap-0 sm:!max-w-[90vw] flex flex-col">
                <MOStepDialogHeader
                    order={order}
                    currentStep={stepData.currentStep}
                />
                <MOStepDialogContent
                    stepData={stepData}
                    stateTransitions={stateTransitions}
                    quantityReporting={quantityReporting}
                    photoManagement={photoManagement}
                    order={order}
                    onStepChange={handleStepChange}
                />
            </DialogContent>
        </Dialog>
        {/* ... sub-dialogs ... */}
    </>
);
```

**Change to:**
```typescript
// Only return null if there's no order at all
if (!order) return null;

return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[90vw] w-[80vw] max-h-[90vh] p-0 gap-0 sm:!max-w-[90vw] flex flex-col">
                <MOStepDialogHeader
                    order={order}
                    currentStep={stepData.currentStep}
                />
                <MOStepDialogContent
                    stepData={stepData}
                    stateTransitions={stateTransitions}
                    quantityReporting={quantityReporting}
                    photoManagement={photoManagement}
                    order={order}
                    onStepChange={handleStepChange}
                />
            </DialogContent>
        </Dialog>
        {/* ... sub-dialogs ... */}
    </>
);
```

**Change**: Remove `stepData.loading` from the null check. This ensures the dialog stays mounted even when loading.

---

### 2. MOStepDialogContent.tsx

**Current structure:**
```typescript
export function MOStepDialogContent({ ... }: MOStepDialogContentProps) {
    // ... existing code ...

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto min-h-0">
            <div className="flex min-h-[600px] gap-6">
                {/* ... existing content ... */}
            </div>
        </div>
    );
}
```

**Change to:**
```typescript
export function MOStepDialogContent({ 
    stepData,
    stateTransitions,
    quantityReporting,
    photoManagement,
    order,
    onStepChange
}: MOStepDialogContentProps) {
    const { currentStep, activeExecution, stepStateInfo, loading } = stepData;
    const { 
        selectedPhotoIndex, 
        showingStepPhotos, 
        setSelectedPhotoIndex, 
        setShowingStepPhotos,
        photos 
    } = photoManagement;

    return (
        <div className="relative flex-1 flex flex-col p-6 overflow-y-auto min-h-0">
            <div className="flex min-h-[600px] gap-6">
                {/* Left - Dynamic State Content */}
                <div className="flex-1 flex flex-col pr-6 border-r">
                    <MOStepStateContent
                        stepStateInfo={stepStateInfo}
                        currentStep={currentStep}
                        activeExecution={activeExecution}
                        order={order}
                        quantityReporting={quantityReporting}
                        photoManagement={photoManagement}
                        stateTransitions={stateTransitions}
                    />
                </div>

                {/* Right Column - Picture and Step Navigator */}
                <div className="flex-1 flex flex-col gap-4 pl-6">
                    {/* Top Right - Picture */}
                    <MOStepPictureSection
                        order={order}
                        photos={photos}
                        selectedPhotoIndex={selectedPhotoIndex}
                        showingStepPhotos={showingStepPhotos}
                        onPhotoSelect={setSelectedPhotoIndex}
                        onToggleStepPhotos={() => {
                            setShowingStepPhotos(!showingStepPhotos);
                            if (!showingStepPhotos && selectedPhotoIndex === null) {
                                setSelectedPhotoIndex(0);
                            }
                        }}
                    />

                    {/* Horizontal Separator */}
                    <Separator className="my-2" />

                    {/* Bottom Right - Step Navigator */}
                    {currentStep && (
                        <StepNavigator
                            order={order}
                            currentStepId={currentStep.id}
                            onStepChange={(stepId) => {
                                if (onStepChange) {
                                    onStepChange(stepId);
                                }
                            }}
                            className="flex-1"
                        />
                    )}
                </div>
            </div>

            {/* Loading overlay when data is refreshing */}
            {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm font-medium">Refreshing data...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
```

**Changes**:
- Extract `loading` from `stepData`
- Add loading overlay at the bottom that covers entire content when `loading` is true
- Overlay uses backdrop blur for modern look
- Shows spinner and text for user feedback

---

### 3. useMOStepQuantityReporting.ts

**Current `handleProductionReport` (lines 101-129):**
```typescript
const handleProductionReport = (quantity: number) => {
    if (!activeExecution || !activeExecution.id) return;

    const submitData = {
        quantity_completed: quantity,
        quantity_scrapped: 0,
        scrap_reason: '',
        notes: '',
        time_spent: 0,
        mark_complete: false,
    };

    router.post(route('production.reporting.steps.report', { execution: activeExecution.id }), submitData, {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            reset();
            initializeDialog().then(() => {  // <-- REMOVE THIS
                if (onStateChanged) onStateChanged();
            });
        },
        onError: (errors) => {
            console.error('[MOStepQuantityReporting] Production report failed:', errors);
        }
    });
};
```

**Change to:**
```typescript
const handleProductionReport = (quantity: number) => {
    if (!activeExecution || !activeExecution.id) return;

    const submitData = {
        quantity_completed: quantity,
        quantity_scrapped: 0,
        scrap_reason: '',
        notes: '',
        time_spent: 0,
        mark_complete: false,
    };

    router.post(route('production.reporting.steps.report', { execution: activeExecution.id }), submitData, {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            reset();
            // Let parent handle the refresh - no double refresh
            if (onStateChanged) {
                onStateChanged();
            }
        },
        onError: (errors) => {
            console.error('[MOStepQuantityReporting] Production report failed:', errors);
        }
    });
};
```

**Apply the same change to:**
- `handleScrapReport` (lines 132-160)
- `handleComplete` (lines 163-191)
- `handleSubmit` (lines 80-98)

**Pattern**: Remove the `initializeDialog().then(() => ...)` wrapper and just call `onStateChanged()` directly.

**Why**: The parent (`mo-viewer.tsx`) will fetch fresh data and update the `order` prop, which will trigger the `useMOStepData` hook to reinitialize automatically via its `useEffect` on line 117.

---

### 4. useMOStepStateTransitions.ts

**Apply similar changes to all transition methods:**

**Pattern to find:**
```typescript
onSuccess: () => {
    initializeDialog().then(() => {
        setTransitionLoading(false);
        if (onStateChanged) onStateChanged();
    });
},
```

**Change to:**
```typescript
onSuccess: () => {
    setTransitionLoading(false);
    if (onStateChanged) {
        onStateChanged();
    }
},
```

**Methods to update:**
- `startExecution` (lines 163-169) - Special case, keep the execution handling but remove nested call
- `forceStartExecution` (lines 188-191)
- `skipStep` (lines 209-212)
- `putOnHold` (lines 231-234)
- `resumeExecution` (lines 250-253)
- `recordQualityResult` (lines 274-277)

**Exception for `startExecution`**: This one has special handling for execution data. Update it like this:

```typescript
const startExecution = () => {
    if (!currentStep || !order) return;

    router.post(route('production.reporting.steps.start'), {
        manufacturing_order_id: order.id,
        manufacturing_step_id: currentStep.id,
    }, {
        preserveUrl: true,
        preserveScroll: true,
        onSuccess: (page) => {
            // Check if we got execution data in the response
            const pageProps = page.props as { execution?: ManufacturingStepExecution; flash?: unknown };

            if (pageProps.execution) {
                // Update local state optimistically
                setActiveExecution(pageProps.execution);

                if (currentStep) {
                    setCurrentStep({
                        ...currentStep,
                        status: 'in_progress'
                    });
                }

                setStepStateInfo({
                    state: 'in_progress',
                    canStart: false,
                    cannotStartReason: undefined
                });
            }
            
            setTransitionLoading(false);

            // Notify parent to refresh (it will update our order prop)
            if (onStateChanged) {
                onStateChanged();
            }
        },
        onError: () => {
            setTransitionLoading(false);
        }
    });
};
```

---

## Testing

After implementing these changes:

1. **Report Production**:
   - ✅ Dialog should stay open
   - ✅ Brief loading overlay should appear
   - ✅ Quantities should update smoothly
   - ✅ No close/reopen

2. **Mark Complete**:
   - ✅ Dialog should stay open
   - ✅ Loading overlay appears
   - ✅ Step state changes to "completed"
   - ✅ No close/reopen

3. **Start Execution**:
   - ✅ Dialog should stay open
   - ✅ State changes to "in_progress"
   - ✅ Action buttons appear
   - ✅ No close/reopen

4. **Navigate Steps**:
   - ✅ Loading overlay when switching
   - ✅ Smooth transition
   - ✅ Dialog stays open

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `MOStepActionDialog.tsx` | 69 | Remove `stepData.loading` from null check |
| `MOStepDialogContent.tsx` | 39-90 | Add loading overlay at bottom |
| `useMOStepQuantityReporting.ts` | Multiple | Remove `initializeDialog()` calls, let parent refresh |
| `useMOStepStateTransitions.ts` | Multiple | Remove `initializeDialog()` calls, let parent refresh |

## Flow After Changes

1. User performs action (e.g., report production)
2. Hook sends request via Inertia router
3. Request completes successfully
4. Hook calls `onStateChanged()` callback
5. Parent (`mo-viewer.tsx`) fetches fresh hierarchy
6. Parent updates `selectedMOForDialog` prop
7. Dialog's `useMOStepData` hook detects order change via `useEffect`
8. Hook sets `loading = true`, fetches/processes data, sets `loading = false`
9. Loading overlay shows during this brief period
10. Dialog content updates smoothly - **no unmount/remount!**

## Benefits

✅ **Better UX**: Smooth updates, no jarring close/reopen
✅ **Visual feedback**: Users see loading state
✅ **Cleaner code**: Single source of truth for data
✅ **No double refresh**: Parent handles data fetching
✅ **Standard patterns**: Uses React/Inertia best practices

