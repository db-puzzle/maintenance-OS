# Production Reporting Dialog - Loading State Fix

## Problem Analysis

When reporting production or marking a step as complete, the `MOStepActionDialog` closes and reopens instead of smoothly updating. This creates a jarring user experience.

### Root Cause

The issue occurs in the following sequence:

1. **User Action** (e.g., report production) triggers:
   - `useMOStepQuantityReporting.ts` (lines 121-123) calls `initializeDialog()` → sets `loading = true`
   - Then calls `onStateChanged()` callback

2. **Parent Component** (`mo-viewer.tsx` lines 1077-1155):
   - Makes API call to refresh hierarchy
   - Updates `selectedMOForDialog` state

3. **Dialog Component** (`MOStepActionDialog.tsx` line 69):
   ```typescript
   if (!order || stepData.loading) return null;
   ```
   **Returns `null` when loading**, causing the `<Dialog>` to unmount completely!

4. **Reopening**: Once loading completes, component renders again

### Problems Identified

1. **Returning `null` unmounts the entire Dialog component** - causes close/reopen effect
2. **Double refresh**: Hook calls `initializeDialog()` AND parent calls `onStateChanged()`
3. **No visual feedback** during the operation
4. **Poor UX**: User doesn't know if their action succeeded until dialog reopens

## Proposed Solution

An elegant React/Inertia solution that:
- ✅ Keeps dialog open during loading
- ✅ Shows visual feedback during operations
- ✅ Eliminates double refresh
- ✅ Maintains single source of truth for data updates

### Implementation Strategy

#### 1. Never Return Null - Show Loading Overlay Instead

**File: `MOStepActionDialog.tsx`**

Instead of:
```typescript
if (!order || stepData.loading) return null;
```

Render the dialog with a loading overlay:
```typescript
if (!order) return null; // Only return null if no order

// Render dialog with loading state
```

#### 2. Add Loading Overlay to Dialog Content

**File: `MOStepDialogContent.tsx`**

Wrap content with loading overlay when data is refreshing:
```typescript
<div className="relative flex-1 flex flex-col p-6 overflow-y-auto min-h-0">
    {/* Existing content */}
    <div className="flex min-h-[600px] gap-6">
        {/* ... existing content ... */}
    </div>
    
    {/* Loading overlay when data is refreshing */}
    {stepData.loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium">Refreshing data...</p>
            </div>
        </div>
    )}
</div>
```

#### 3. Add Processing State to Quantity Reporting Hook

**File: `useMOStepQuantityReporting.ts`**

Add local processing state to show immediate feedback:

```typescript
export function useMOStepQuantityReporting({
    stepData,
    order,
    onStateChanged
}: UseMOStepQuantityReportingParams): UseMOStepQuantityReportingReturn {
    const { currentStep, activeExecution, initializeDialog } = stepData;
    
    const [showProductionDialog, setShowProductionDialog] = useState(false);
    const [showScrapDialog, setShowScrapDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); // NEW
    
    // Handle production report
    const handleProductionReport = (quantity: number) => {
        if (!activeExecution || !activeExecution.id) return;

        setIsProcessing(true); // Show immediate feedback

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
                // Don't call initializeDialog here - let parent handle it
                // This eliminates the double refresh
                if (onStateChanged) {
                    onStateChanged();
                }
            },
            onError: (errors) => {
                console.error('[MOStepQuantityReporting] Production report failed:', errors);
                setIsProcessing(false);
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };
    
    // Similar updates for handleScrapReport and handleComplete
    
    return {
        // ... existing return values
        isProcessing // Export processing state
    };
}
```

#### 4. Modify Parent Update Logic

**File: `mo-viewer.tsx`**

The parent should handle the refresh and update the dialog's order prop, which will trigger the hook to reinitialize with fresh data:

```typescript
<MOStepActionDialog
    order={selectedMOForDialog as ManufacturingOrder | null}
    isOpen={showMODetailsDialog}
    onOpenChange={setShowMODetailsDialog}
    activeStepId={selectedStepId}
    onStateChanged={() => {
        if (selectedMOId) {
            // Make the API call but DON'T set loading state during it
            axios.get(route('production.tracking.mo-viewer.hierarchy', { orderId: selectedMOId }))
                .then(response => {
                    if (response.data.order) {
                        setMOHierarchy([response.data.order]);
                        
                        // Update the dialog order if it's still open
                        if (showMODetailsDialog && selectedMOForDialog) {
                            const updatedDialogOrder = findOrderInHierarchy(
                                response.data.order, 
                                selectedMOForDialog.id
                            );
                            
                            if (updatedDialogOrder) {
                                setSelectedMOForDialog(/* updated order */);
                            }
                        }
                    }
                })
                .catch(() => {
                    // Handle silently
                });
        }
    }}
/>
```

#### 5. Update Hook to React to Order Changes

**File: `useMOStepData.ts`**

The hook should reinitialize when the order prop changes (it already does via the useEffect on line 117-121), but ensure it happens smoothly:

```typescript
// Auto-initialize when dialog opens OR when order data changes
useEffect(() => {
    if (order && isOpen) {
        initializeDialog();
    }
}, [order?.id, isOpen, activeStepId, initializeDialog]);
```

Key: When parent updates the `order` prop with fresh data, this effect will trigger `initializeDialog()`, which will:
- Set `loading = true` 
- Parse the new data
- Update states
- Set `loading = false`

But the dialog stays open because we removed the `return null` when loading!

### Benefits of This Approach

1. **Smooth UX**: Dialog stays open, content updates in place
2. **Visual Feedback**: Loading overlay shows operation is in progress
3. **Single Refresh**: Parent handles data refresh, dialog consumes updated prop
4. **Standard React Pattern**: Props flow down, callbacks flow up
5. **No Inertia Hacks**: Uses standard Inertia patterns with `preserveState` and `preserveScroll`

### Files to Modify

1. ✏️ `MOStepActionDialog.tsx` - Remove `return null` when loading
2. ✏️ `MOStepDialogContent.tsx` - Add loading overlay
3. ✏️ `useMOStepQuantityReporting.ts` - Remove double refresh, add processing state
4. ✏️ `useMOStepStateTransitions.ts` - Remove double refresh (similar changes)
5. ℹ️ `mo-viewer.tsx` - Already correct (parent handles refresh)

### Expected User Experience

1. User clicks "Report Production" → Dialog opens for quantity input
2. User enters quantity and submits
3. **Immediate feedback**: Processing spinner appears
4. **Dialog stays open**: Content becomes slightly dimmed with overlay
5. **Backend processes**: Server validates and saves data
6. **Smooth update**: Fresh data loads, overlay fades out
7. **Updated view**: New quantities appear without dialog closing

### Testing Checklist

- [ ] Report production - dialog stays open, quantities update
- [ ] Report scrap - dialog stays open, quantities update  
- [ ] Mark step complete - dialog stays open, state changes to completed
- [ ] Start execution - dialog stays open, state changes to in_progress
- [ ] Put on hold - dialog stays open, state changes to on_hold
- [ ] Skip step - dialog stays open, state changes to skipped
- [ ] Navigate between steps - loading overlay appears briefly
- [ ] Network error - error shows, dialog stays open

## Implementation Notes

- The key insight is **separating concerns**: hooks manage local state, parent manages data fetching
- **Loading overlay** is already implemented for `transitionLoading` in `MOStepStateContent.tsx` - we need similar for data loading
- Use **optimistic updates** where possible (update local state immediately, refresh from server)
- Maintain **accessibility**: Loading overlays should have proper ARIA labels

