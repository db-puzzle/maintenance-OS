# MOStepActionDialog Enhancement Plan for External Steps

## 📋 Current Architecture Analysis

### Component Structure (Hook-based)
```
MOStepActionDialog (main component)
├── useMOStepData (fetches step data)
├── useMOStepStateTransitions (handles state changes)
├── useMOStepQuantityReporting (production/scrap reporting)
└── useMOStepPhotoManagement (photo capture/viewing)
```

### State Components (Per Step Status)
- `PendingState.tsx` - Step not ready
- `QueuedState.tsx` - Ready to start, shows "Start Execution" button
- `InProgressState.tsx` - Active execution with quantity reporting
- `AwaitingQualityState.tsx` - Quality check actions
- `OnHoldState.tsx` - Resume/cancel actions
- `CompletedState.tsx` - Finished step
- `SkippedState.tsx` - Bypassed step
- `CancelledState.tsx` - Cancelled step

---

## 🎯 PROPOSED ENHANCEMENT DESIGN

### Strategy: **Conditional Augmentation**

Instead of duplicating the dialog, we'll **augment existing states** with external step logic:
- Detect if `step.execution_location === 'external'`
- Show additional information and actions for external steps
- Keep all internal step functionality intact

---

## 📦 IMPLEMENTATION PLAN

### Phase 1: Type Definitions

**Add to `resources/js/types/production.ts`:**

```typescript
// Add to ManufacturingStep interface
export interface ManufacturingStep {
    // ... existing fields ...
    
    // External execution fields
    execution_location?: 'internal' | 'external';
    manufacturer_id?: number | null;
    manufacturer?: Manufacturer;
    expected_lead_time_days?: number | null;
    external_status?: 'awaiting_shipment' | 'at_manufacturer' | null;
    
    // Quantity tracking for external steps
    quantity_shipped?: number;
    quantity_received?: number;
    shipped_date?: string | null;
    received_date?: string | null;
    
    // Related shipments
    shipment_items?: ShipmentItem[];
}
```

**Add new action types:**

```typescript
// Add to StateTransitionAction type
export type StateTransitionAction = {
    action: 
        | 'start_execution'
        | 'skip_step'
        | 'put_on_hold'
        | 'resume'
        | 'quality_pass'
        | 'quality_fail_scrap'
        | 'quality_fail_rework'
        // NEW: External step actions
        | 'create_shipment'
        | 'view_shipment'
        | 'mark_in_process'
        | 'record_quantity_received';
    // ... rest of properties
};
```

---

### Phase 2: Enhanced State Components

#### Option A: Augment Existing States (RECOMMENDED)

Modify existing state components to conditionally show external step information:

**1. Enhanced QueuedState for External Steps**

```typescript
// resources/js/pages/production/reporting/components/states/QueuedState.tsx

export function QueuedState({
    stateInfo,
    stepName,
    stepDescription,
    workCell,
    estimatedDuration,
    queuePosition,
    onAction,
}: QueuedStateProps) {
    // NEW: Detect external step
    const isExternal = stateInfo.step?.execution_location === 'external';
    const externalStatus = stateInfo.step?.external_status;
    
    // NEW: Different actions for external steps
    const actions: StateTransitionAction[] = isExternal
        ? [
            // External step awaiting shipment
            {
                action: 'create_shipment',
                label: 'Create Shipment',
                icon: 'Package',
                variant: 'default',
                description: 'Create a shipment to send items to manufacturer'
            },
            {
                action: 'skip_step',
                label: 'Skip This Step',
                icon: 'SkipForward',
                variant: 'outline',
                requiresPermission: 'skip_steps',
                requiresReason: true,
            },
        ]
        : [
            // Internal step - original actions
            {
                action: 'start_execution',
                label: 'Start Step Execution',
                icon: 'Play',
                variant: 'default',
            },
            // ... rest of internal actions
        ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                {isExternal ? (
                    <Package className="h-16 w-16 text-orange-500 mb-4" />
                ) : (
                    <Play className="h-16 w-16 text-blue-500 mb-4" />
                )}
                
                <h3 className="text-2xl font-semibold mb-2">
                    {isExternal ? 'Awaiting Shipment' : 'Ready to Start'}
                </h3>

                {/* NEW: External Step Information Card */}
                {isExternal && (
                    <Card className="p-6 w-full max-w-md mb-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <ExternalStepBadge status={externalStatus} />
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Manufacturer</span>
                                    <span className="font-medium">
                                        {stateInfo.step?.manufacturer?.name || 'Not assigned'}
                                    </span>
                                </div>
                                
                                {stateInfo.step?.expected_lead_time_days && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Lead Time</span>
                                        <span className="font-medium">
                                            {stateInfo.step.expected_lead_time_days} days
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Original internal step card */}
                {!isExternal && stepName && (
                    // ... existing internal step card
                )}
            </div>

            {/* Actions - conditional based on execution location */}
            <div className="space-y-2 mt-6">
                {/* Primary action */}
                <Button
                    className="w-full h-12 text-base font-semibold gap-2"
                    onClick={() => onAction(actions[0])}
                >
                    {isExternal ? <Package className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    {actions[0].label}
                </Button>
                
                {/* Secondary actions grid */}
                <div className="grid grid-cols-3 gap-2">
                    {actions.slice(1).map((action, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => onAction(action)}
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

**2. Enhanced InProgressState for External Steps**

```typescript
// resources/js/pages/production/reporting/components/states/InProgressState.tsx

export function InProgressState({
    stateInfo,
    currentStep,
    activeExecution,
    order,
    quantityReporting,
    onAction
}: InProgressStateProps) {
    // NEW: Detect external step
    const isExternal = currentStep?.execution_location === 'external';
    const externalStatus = currentStep?.external_status;
    const hasShipment = (currentStep?.shipment_items?.length || 0) > 0;
    const latestShipment = currentStep?.shipment_items?.[0]?.shipment;

    // NEW: Different rendering for external steps
    if (isExternal) {
        return (
            <div className="flex-1 flex flex-col">
                {/* External Step At Manufacturer View */}
                <div className="flex flex-col items-center justify-center flex-1">
                    <Truck className="h-16 w-16 text-indigo-500 mb-4" />
                    <h3 className="text-2xl font-semibold mb-2">At Manufacturer</h3>

                    {/* Shipment Information */}
                    {latestShipment && (
                        <Card className="p-6 w-full max-w-md mb-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Shipment
                                    </span>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => onAction({
                                            action: 'view_shipment',
                                            label: 'View Shipment',
                                            icon: 'ExternalLink',
                                            variant: 'ghost',
                                        })}
                                    >
                                        {latestShipment.shipment_number}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Shipped
                                    </span>
                                    <span className="font-medium">
                                        {formatNumber(currentStep.quantity_shipped || 0)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Received
                                    </span>
                                    <span className="font-medium">
                                        {formatNumber(currentStep.quantity_received || 0)}
                                    </span>
                                </div>

                                {latestShipment.shipped_date && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Shipped Date
                                        </span>
                                        <span className="text-sm">
                                            {new Date(latestShipment.shipped_date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* External Status Badge */}
                    <ExternalStepBadge status={externalStatus} />
                </div>

                {/* External Step Actions */}
                <div className="space-y-2 mt-6">
                    {externalStatus === 'at_manufacturer' && (
                        <>
                            {/* Shipment is received via shipments module */}
                            <Button
                                className="w-full h-12 text-base font-semibold gap-2"
                                variant="outline"
                                onClick={() => onAction({
                                    action: 'view_shipment',
                                    label: 'View Shipment',
                                    icon: 'Package',
                                    variant: 'default',
                                })}
                            >
                                <Package className="h-5 w-5" />
                                Go to Shipment
                            </Button>

                            <p className="text-sm text-muted-foreground text-center">
                                Mark shipment as received to complete this step
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Original internal step rendering
    return (
        // ... existing internal step InProgressState content
    );
}
```

---

### Phase 3: Enhanced State Transitions Hook

**Add to `useMOStepStateTransitions.ts`:**

```typescript
// Add new action handlers
const executeStateTransition = (action: StateTransitionAction, reason?: string) => {
    if (!currentStep) return;

    setTransitionLoading(true);

    switch (action.action) {
        // ... existing actions ...

        // NEW: External step actions
        case 'create_shipment':
            createShipmentForStep();
            break;

        case 'view_shipment':
            viewShipment();
            break;

        case 'mark_in_process':
            markAsInProcess();
            break;

        case 'record_quantity_received':
            openReceiptDialog();
            break;

        default:
            setTransitionLoading(false);
    }

    // Clear dialog states
    setShowReasonDialog(false);
    setPendingAction(null);
    setActionReason('');
};

// NEW: Create shipment for external step
const createShipmentForStep = () => {
    if (!currentStep || !order) return;

    // Redirect to shipments create page with pre-selected MO
    router.visit(route('logistics.shipments.create', {
        mo_id: order.id,
        step_id: currentStep.id
    }));
};

// NEW: View related shipment
const viewShipment = () => {
    if (!currentStep?.shipment_items?.[0]?.shipment) return;

    const shipment = currentStep.shipment_items[0].shipment;
    router.visit(route('logistics.shipments.show', shipment.id));
};

// NEW: Mark step as in process at manufacturer
const markAsInProcess = () => {
    if (!currentStep) return;

    router.post(
        route('production.steps.mark-as-in-process', currentStep.id),
        {},
        {
            preserveScroll: true,
            onSuccess: () => {
                initializeDialog();
                onStateChanged?.();
            },
            onFinish: () => setTransitionLoading(false)
        }
    );
};
```

---

### Phase 4: Visual Indicators

**Add External Step Badge to Header:**

```typescript
// resources/js/pages/production/reporting/components/components/MOStepDialogHeader.tsx

export function MOStepDialogHeader({ order, currentStep }: MOStepDialogHeaderProps) {
    const isExternal = currentStep?.execution_location === 'external';

    return (
        <div className="p-6 border-b">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{currentStep?.name}</h2>
                    
                    {/* NEW: External step indicator */}
                    {isExternal && (
                        <Badge variant="outline" className="gap-1">
                            <Factory className="h-3 w-3" />
                            External
                        </Badge>
                    )}
                    
                    {isExternal && currentStep?.external_status && (
                        <ExternalStepBadge status={currentStep.external_status} />
                    )}
                </div>
                
                {/* NEW: Manufacturer info */}
                {isExternal && currentStep?.manufacturer && (
                    <div className="text-sm text-muted-foreground">
                        {currentStep.manufacturer.name}
                    </div>
                )}
            </div>
        </div>
    );
}
```

---

## 🎨 UI/UX DESIGN SPECIFICATIONS

### 1. Visual Hierarchy

**For External Steps, Show:**
- 🏭 External badge (always visible in header)
- 📍 External status badge (awaiting_shipment | at_manufacturer)
- 🏢 Manufacturer name
- 📦 Shipment information (when exists)
- 📊 Quantity tracking (shipped vs received)
- 🔗 Quick link to shipment details

### 2. Action Button Logic

| Step Status | External Status | Primary Action | Secondary Actions |
|-------------|----------------|----------------|-------------------|
| `queued` | `awaiting_shipment` | ➕ Create Shipment | • Skip Step |
| `in_progress` | `at_manufacturer` (no shipment) | ➕ Create Shipment | • View Instructions |
| `in_progress` | `at_manufacturer` (has shipment) | 📦 View Shipment | • (None - managed via shipment) |
| `completed` | any | ✅ Completed | • View Shipment (if exists) |

### 3. Information Display

**External Step Card (when in queued/awaiting_shipment):**
```
┌─────────────────────────────────────┐
│  [External] [Awaiting Shipment]    │
│                                     │
│  Manufacturer: ABC Heat Treating   │
│  Lead Time: 5 days                 │
│                                     │
│  ⚠️ Items must be shipped before   │
│     work can begin                 │
│                                     │
│  [Create Shipment] [Skip Step]     │
└─────────────────────────────────────┘
```

**External Step Card (when in_progress/at_manufacturer):**
```
┌─────────────────────────────────────┐
│  [External] [At Manufacturer]      │
│                                     │
│  Shipment: SHIP-20241128-0001      │
│  Manufacturer: ABC Heat Treating   │
│                                     │
│  Shipped: 100 units                │
│  Received: 0 units                 │
│  Shipped Date: Nov 15, 2024        │
│                                     │
│  ℹ️ Receive items via Shipment     │
│     module to complete step        │
│                                     │
│  [Go to Shipment]                  │
└─────────────────────────────────────┘
```

---

## 💻 IMPLEMENTATION FILES TO MODIFY

### Files to Modify (6 files)

1. **`resources/js/types/production.ts`**
   - Add external step fields to ManufacturingStep interface
   - Add new action types

2. **`resources/js/pages/production/reporting/components/states/QueuedState.tsx`**
   - Add isExternal detection
   - Conditional actions array
   - External step information card
   - Create shipment button

3. **`resources/js/pages/production/reporting/components/states/InProgressState.tsx`**
   - Add external step rendering path
   - Show shipment information
   - Link to shipment details

4. **`resources/js/pages/production/reporting/components/states/CompletedState.tsx`**
   - Add "View Shipment" action for completed external steps

5. **`resources/js/pages/production/reporting/components/hooks/useMOStepStateTransitions.ts`**
   - Add handlers for new action types
   - createShipmentForStep()
   - viewShipment()

6. **`resources/js/pages/production/reporting/components/components/MOStepDialogHeader.tsx`**
   - Add external step badge
   - Show manufacturer name

### New Components Needed (2 files)

7. **`resources/js/components/production/external-step-info-card.tsx`**
   - Reusable card showing external step details
   - Manufacturer info
   - Shipment status
   - Quantity tracking

8. **`resources/js/components/production/external-step-actions.tsx`**
   - Reusable action buttons for external steps
   - Create shipment
   - View shipment
   - Status updates (if needed)

---

## 🔄 STATE FLOW EXAMPLE

### Scenario: Heat Treatment External Step

**Step 1: Queued State**
```
Status: queued
External Status: awaiting_shipment
Display: "Ready to Ship" with "Create Shipment" button
Action: Click → Redirects to /logistics/shipments/create?mo_id=123&step_id=456
```

**Step 2: After Shipment Created**
```
Status: in_progress (updated when shipment marked as shipped)
External Status: at_manufacturer
Display: Shipment info with "View Shipment" button
Action: Click → Redirects to /logistics/shipments/show/789
```

**Step 3: After Receipt**
```
Status: completed (updated when shipment received)
External Status: at_manufacturer (stays for historical context)
Display: "Completed" with shipment link
Action: Next step activates automatically
```

---

## 🎯 INTEGRATION POINTS

### 1. Create Shipment Flow
```
MOStepActionDialog (QueuedState)
  → Click "Create Shipment"
    → router.visit(/logistics/shipments/create?mo_id=X&step_id=Y)
      → Pre-populate form with MO
        → User completes shipment creation
```

### 2. View Shipment Flow
```
MOStepActionDialog (InProgressState)
  → Click "Go to Shipment"
    → router.visit(/logistics/shipments/show/Z)
      → User marks as received
        → Step auto-completes
```

### 3. Data Flow
```
Backend provides:
- step.execution_location
- step.external_status
- step.manufacturer (relationship)
- step.shipment_items (relationship)
  - shipment_items[0].shipment (nested)
```

---

## 📝 BENEFITS OF THIS APPROACH

### ✅ Advantages

1. **No Duplication**: Reuses existing dialog infrastructure
2. **Minimal Changes**: Only modifies specific state components
3. **Consistent UX**: Maintains familiar dialog structure
4. **Type Safe**: Leverages existing type system
5. **Maintainable**: Changes localized to relevant files
6. **Backward Compatible**: Internal steps unchanged
7. **Clear Separation**: External logic clearly marked with conditionals

### ✅ Follows Project Patterns

- Uses same hook architecture
- Follows state component pattern
- Uses Inertia navigation (no AJAX)
- Leverages existing components (Badge, Card, Button)
- Maintains visual consistency

---

## 🚀 IMPLEMENTATION EFFORT

### Estimated Time: 2-3 hours

**Breakdown:**
- Add types: 15 minutes
- Modify QueuedState: 30 minutes
- Modify InProgressState: 45 minutes
- Modify CompletedState: 15 minutes
- Enhance header: 15 minutes
- Update state transitions hook: 30 minutes
- Testing: 30 minutes

### Risk Level: LOW
- Clear separation of concerns
- No architectural changes
- Well-defined integration points
- Existing patterns to follow

---

## 🧪 TESTING CHECKLIST

After implementation, verify:

- [ ] Internal steps still work normally (no regression)
- [ ] External step shows "Awaiting Shipment" in queued state
- [ ] "Create Shipment" button redirects correctly
- [ ] External step shows "At Manufacturer" when in progress
- [ ] Shipment information displays correctly
- [ ] "View Shipment" button opens shipment details
- [ ] External step badge shows in header
- [ ] Manufacturer name displays
- [ ] Completed external steps show shipment history

---

## 📌 ALTERNATIVE APPROACH: Separate Dialog

**Not Recommended**, but included for completeness:

Create `ExternalStepActionDialog.tsx` as a separate component.

**Pros:**
- Complete separation
- No risk of breaking internal steps

**Cons:**
- Code duplication (~1000 lines)
- Two dialogs to maintain
- Inconsistent UX
- More complexity in calling code

**Verdict**: The augmentation approach is superior.

---

## 🎊 CONCLUSION

The **conditional augmentation strategy** is the optimal approach:

1. **Minimal code changes** (6 files modified, 2 new helper components)
2. **Maintains consistency** with existing dialog
3. **Type-safe** with clear external step detection
4. **User-friendly** - familiar interface for operators
5. **Maintainable** - all external logic clearly marked

The implementation seamlessly integrates external step management into the existing production dialog while maintaining full backward compatibility with internal steps.

---

## 📞 NEXT STEPS

1. **Review and approve** this design document
2. **Clarify any questions** about the approach
3. **Implement the changes** (2-3 hours)
4. **Test thoroughly** (internal and external steps)
5. **Deploy** with confidence

Would you like me to proceed with this implementation?


