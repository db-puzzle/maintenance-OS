# MOStepActionDialog Enhancement for External Steps - Design Proposal

**Date**: November 28, 2025  
**Component**: `resources/js/pages/production/reporting/components/MOStepActionDialog.tsx`  
**Goal**: Augment existing dialog to support External Manufacturing Steps

---

## 📋 CURRENT ARCHITECTURE ANALYSIS

### Hook-Based Architecture
The dialog uses a clean separation of concerns via custom hooks:

```typescript
1. useMOStepData - Data fetching and management
2. useMOStepStateTransitions - State change logic
3. useMOStepQuantityReporting - Production/scrap reporting
4. useMOStepPhotoManagement - Photo capture/viewing
```

### Component Hierarchy
```
MOStepActionDialog (Main)
├── MOStepDialogHeader (Header with MO info)
├── MOStepDialogContent (Main content area)
│   ├── MOStepStateContent (Renders different state views)
│   │   ├── PendingState
│   │   ├── QueuedState
│   │   ├── InProgressState (with progress tracking)
│   │   ├── OnHoldState
│   │   ├── AwaitingQualityState
│   │   ├── CompletedState
│   │   ├── SkippedState
│   │   └── CancelledState
│   ├── MOStepPictureSection (Right panel)
│   └── MOStepActionButtons (Bottom buttons)
└── Sub-dialogs
    ├── MOStepReasonDialog
    ├── MOStepLabelPrintDialog
    ├── QuantityReportDialog (Production)
    ├── QuantityReportDialog (Scrap)
    ├── StepPhotoCapture
    └── StepPhotoViewer
```

### State Flow for Internal Steps
```
pending → queued → in_progress → [awaiting_quality] → completed
            ↓
          skipped
```

---

## 🎯 DESIGN PROPOSAL FOR EXTERNAL STEPS

### Key Principle: Non-Breaking Augmentation
**The enhancement must NOT break existing internal step functionality.**

Strategy:
1. **Conditional Rendering**: Detect `execution_location === 'external'`
2. **Additional States**: Create new state components for external statuses
3. **New Hook**: Add `useMOStepExternalActions` for external-specific logic
4. **Parallel Actions**: Show external actions alongside or instead of internal ones

---

## 🏗️ PROPOSED IMPLEMENTATION

### Phase 1: Type Definitions

**Update `resources/js/types/production.ts`**:

```typescript
// Already exists in ManufacturingStep interface:
execution_location?: 'internal' | 'external';
manufacturer_id?: number | null;
manufacturer?: Manufacturer;
expected_lead_time_days?: number | null;
external_status?: 'awaiting_shipment' | 'at_manufacturer' | null;
total_quantity_shipped?: number;
total_quantity_received?: number;
last_shipped_date?: string;
last_received_date?: string;

// Add to ManufacturingStep (if missing):
shipment_items?: Array<{
    id: number;
    shipment_id: number;
    quantity_shipped: number;
    quantity_received: number;
    shipment?: {
        id: number;
        shipment_number: string;
        status: string;
    };
}>;
```

**Update `resources/js/types/production-states.ts`**:

```typescript
// Add new external actions
export type ExternalStepAction =
    | 'mark_as_shipped'
    | 'mark_as_in_process'
    | 'record_quantity_received'
    | 'view_shipments'
    | 'create_shipment';
```

---

### Phase 2: New State Components

#### 2A. ExternalAwaitingShipmentState

**File**: `resources/js/pages/production/reporting/components/states/ExternalAwaitingShipmentState.tsx`

```typescript
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, Truck, MapPin, Calendar } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';
import { ManufacturingStep } from '@/types/production';
import { formatNumber } from '@/utils/number';

interface ExternalAwaitingShipmentStateProps {
    stateInfo: StepStateInfo;
    step: ManufacturingStep;
    onAction: (action: StateTransitionAction) => void;
}

export function ExternalAwaitingShipmentState({
    stateInfo: _stateInfo,
    step,
    onAction,
}: ExternalAwaitingShipmentStateProps) {
    const actions: StateTransitionAction[] = [
        {
            action: 'create_shipment',
            label: 'Create Shipment',
            icon: 'Truck',
            variant: 'default',
        },
        {
            action: 'mark_as_shipped',
            label: 'Mark as Shipped (Manual)',
            icon: 'PackageSearch',
            variant: 'outline',
            requiresReason: true,
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <PackageSearch className="h-16 w-16 text-orange-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Awaiting Shipment</h3>
                <p className="text-muted-foreground mb-6">
                    Ready to ship to external manufacturer
                </p>

                <Card className="p-6 w-full max-w-md">
                    <h4 className="text-lg font-semibold mb-4">{step.name}</h4>
                    
                    <div className="space-y-3">
                        {step.manufacturer && (
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">
                                        {step.manufacturer.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        External Manufacturer
                                    </div>
                                </div>
                            </div>
                        )}

                        {step.expected_lead_time_days && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Expected Lead Time
                                </span>
                                <span className="text-sm font-medium">
                                    {step.expected_lead_time_days} days
                                </span>
                            </div>
                        )}

                        {step.scheduled_start && (
                            <div className="flex items-start gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs text-muted-foreground">
                                        Scheduled Ship
                                    </div>
                                    <div className="text-sm font-medium">
                                        {new Date(step.scheduled_start).toLocaleDateString(
                                            'pt-BR'
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-6">
                <Button
                    className="w-full h-12 text-base font-semibold gap-2"
                    onClick={() => onAction(actions[0])}
                >
                    <Truck className="h-5 w-5" />
                    {actions[0].label}
                </Button>
                <Button
                    className="w-full h-10"
                    variant="outline"
                    onClick={() => onAction(actions[1])}
                >
                    <PackageSearch className="h-4 w-4 mr-2" />
                    {actions[1].label}
                </Button>
            </div>
        </div>
    );
}
```

#### 2B. ExternalAtManufacturerState

**File**: `resources/js/pages/production/reporting/components/states/ExternalAtManufacturerState.tsx`

```typescript
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, PackageCheck, Truck, MapPin, Package } from 'lucide-react';
import { StepStateInfo, StateTransitionAction } from '@/types/production-states';
import { ManufacturingStep } from '@/types/production';
import { formatNumber } from '@/utils/number';

interface ExternalAtManufacturerStateProps {
    stateInfo: StepStateInfo;
    step: ManufacturingStep;
    onAction: (action: StateTransitionAction) => void;
}

export function ExternalAtManufacturerState({
    stateInfo: _stateInfo,
    step,
    onAction,
}: ExternalAtManufacturerStateProps) {
    const quantityShipped = step.total_quantity_shipped || 0;
    const quantityReceived = step.total_quantity_received || 0;
    const quantityPending = quantityShipped - quantityReceived;

    const actions: StateTransitionAction[] = [
        {
            action: 'record_quantity_received',
            label: 'Record Receipt',
            icon: 'PackageCheck',
            variant: 'default',
        },
        {
            action: 'view_shipments',
            label: 'View Shipments',
            icon: 'Truck',
            variant: 'outline',
        },
    ];

    return (
        <div className="flex-1 flex flex-col">
            {/* State Icon and Title */}
            <div className="flex flex-col items-center justify-center flex-1">
                <Factory className="h-16 w-16 text-indigo-500 mb-4" />
                <h3 className="text-2xl font-semibold mb-2">At Manufacturer</h3>
                <p className="text-muted-foreground mb-6">
                    Items are being processed externally
                </p>

                <Card className="p-6 w-full max-w-md">
                    <h4 className="text-lg font-semibold mb-4">{step.name}</h4>

                    <div className="space-y-3">
                        {step.manufacturer && (
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">
                                        {step.manufacturer.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        External Manufacturer
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Shipment Info */}
                        {step.shipment_items && step.shipment_items.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                                <div className="text-xs font-medium text-muted-foreground">
                                    Shipments
                                </div>
                                {step.shipment_items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span>{item.shipment?.shipment_number}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {item.shipment?.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity Tracking */}
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Shipped
                                </span>
                                <span className="text-sm font-medium">
                                    {formatNumber(quantityShipped)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Received
                                </span>
                                <span className="text-sm font-medium">
                                    {formatNumber(quantityReceived)}
                                </span>
                            </div>
                            {quantityPending > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Pending
                                    </span>
                                    <span className="text-sm font-medium text-orange-600">
                                        {formatNumber(quantityPending)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {step.last_shipped_date && (
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                                Last shipped:{' '}
                                {new Date(step.last_shipped_date).toLocaleDateString('pt-BR')}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-6">
                <Button
                    className="w-full h-12 text-base font-semibold gap-2"
                    onClick={() => onAction(actions[0])}
                >
                    <PackageCheck className="h-5 w-5" />
                    {actions[0].label}
                </Button>
                <Button
                    className="w-full h-10"
                    variant="outline"
                    onClick={() => onAction(actions[1])}
                >
                    <Truck className="h-4 w-4 mr-2" />
                    {actions[1].label}
                </Button>
            </div>
        </div>
    );
}
```

---

### Phase 3: New Hook - useMOStepExternalActions

**File**: `resources/js/pages/production/reporting/components/hooks/useMOStepExternalActions.ts`

```typescript
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ManufacturingStep } from '@/types/production';
import { StateTransitionAction } from '@/types/production-states';
import { UseMOStepDataReturn } from './useMOStepData';
import { toast } from 'sonner';

interface UseMOStepExternalActionsParams {
    stepData: UseMOStepDataReturn;
    onStateChanged?: () => void;
}

export interface UseMOStepExternalActionsReturn {
    // Loading states
    externalActionLoading: boolean;

    // External action handlers
    handleExternalAction: (action: StateTransitionAction) => void;

    // Dialog states
    markAsShippedDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        onSubmit: (data: { quantity_shipped: number; notes?: string }) => void;
    };

    recordReceiptDialog: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
        onSubmit: (data: {
            quantity_received: number;
            notes?: string;
        }) => void;
        maxQuantity: number;
    };

    // Utility
    isExternal: boolean;
    canManuallyShip: boolean;
    canRecordReceipt: boolean;
}

export function useMOStepExternalActions({
    stepData,
    onStateChanged
}: UseMOStepExternalActionsParams): UseMOStepExternalActionsReturn {
    const { currentStep } = stepData;
    
    const [externalActionLoading, setExternalActionLoading] = useState(false);
    const [showMarkAsShippedDialog, setShowMarkAsShippedDialog] = useState(false);
    const [showRecordReceiptDialog, setShowRecordReceiptDialog] = useState(false);

    // Check if step is external
    const isExternal = currentStep?.execution_location === 'external';
    const canManuallyShip = isExternal && currentStep?.external_status === 'awaiting_shipment';
    const canRecordReceipt = isExternal && currentStep?.external_status === 'at_manufacturer';

    /**
     * Handle external action requests.
     */
    const handleExternalAction = (action: StateTransitionAction) => {
        if (!currentStep) return;

        switch (action.action) {
            case 'create_shipment':
                // Navigate to shipment creation with this step pre-selected
                router.visit(route('logistics.shipments.create'), {
                    data: {
                        pre_selected_step_id: currentStep.id,
                    },
                });
                break;

            case 'mark_as_shipped':
                setShowMarkAsShippedDialog(true);
                break;

            case 'record_quantity_received':
                setShowRecordReceiptDialog(true);
                break;

            case 'view_shipments':
                // Navigate to shipments filtered by this step
                router.visit(route('logistics.shipments.index'), {
                    data: {
                        step_id: currentStep.id,
                    },
                });
                break;

            default:
                console.warn('External action not implemented:', action.action);
        }
    };

    /**
     * Submit mark as shipped.
     */
    const handleMarkAsShipped = (data: { quantity_shipped: number; notes?: string }) => {
        if (!currentStep) return;

        setExternalActionLoading(true);

        router.post(
            route('production.steps.mark-as-shipped', currentStep.id),
            {
                quantity_shipped: data.quantity_shipped,
                notes: data.notes,
            },
            {
                onSuccess: () => {
                    toast.success('Step marked as shipped!');
                    setShowMarkAsShippedDialog(false);
                    onStateChanged?.();
                },
                onError: () => {
                    toast.error('Failed to mark as shipped');
                },
                onFinish: () => {
                    setExternalActionLoading(false);
                },
            }
        );
    };

    /**
     * Submit record receipt.
     */
    const handleRecordReceipt = (data: { quantity_received: number; notes?: string }) => {
        if (!currentStep) return;

        setExternalActionLoading(true);

        router.post(
            route('production.steps.record-quantity-received', currentStep.id),
            {
                quantity_received: data.quantity_received,
                notes: data.notes,
            },
            {
                onSuccess: () => {
                    toast.success('Receipt recorded successfully!');
                    setShowRecordReceiptDialog(false);
                    onStateChanged?.();
                },
                onError: () => {
                    toast.error('Failed to record receipt');
                },
                onFinish: () => {
                    setExternalActionLoading(false);
                },
            }
        );
    };

    return {
        externalActionLoading,
        handleExternalAction,
        markAsShippedDialog: {
            isOpen: showMarkAsShippedDialog,
            onOpenChange: setShowMarkAsShippedDialog,
            onSubmit: handleMarkAsShipped,
        },
        recordReceiptDialog: {
            isOpen: showRecordReceiptDialog,
            onOpenChange: setShowRecordReceiptDialog,
            onSubmit: handleRecordReceipt,
            maxQuantity: (currentStep?.total_quantity_shipped || 0) - (currentStep?.total_quantity_received || 0),
        },
        isExternal,
        canManuallyShip,
        canRecordReceipt,
    };
}
```

---

### Phase 4: New Dialogs for External Actions

#### 4A. ExternalMarkAsShippedDialog

**File**: `resources/js/pages/production/reporting/components/dialogs/ExternalMarkAsShippedDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface ExternalMarkAsShippedDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { quantity_shipped: number; notes?: string }) => void;
    maxQuantity?: number;
}

export function ExternalMarkAsShippedDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    maxQuantity,
}: ExternalMarkAsShippedDialogProps) {
    const [quantity, setQuantity] = useState(maxQuantity || 0);
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (quantity <= 0) {
            return;
        }

        onSubmit({ quantity_shipped: quantity, notes });
        
        // Reset form
        setQuantity(maxQuantity || 0);
        setNotes('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mark as Shipped</DialogTitle>
                    <DialogDescription>
                        Record manual shipment to external manufacturer
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity Shipped *</Label>
                        <Input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            max={maxQuantity}
                        />
                        {maxQuantity && (
                            <p className="text-xs text-muted-foreground">
                                Maximum: {maxQuantity}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Tracking number, carrier, or other notes..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={quantity <= 0}>
                        Confirm Shipment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

#### 4B. ExternalRecordReceiptDialog

**File**: `resources/js/pages/production/reporting/components/dialogs/ExternalRecordReceiptDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PackageCheck } from 'lucide-react';

interface ExternalRecordReceiptDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { quantity_received: number; notes?: string }) => void;
    maxQuantity: number;
    currentQuantity: number;
}

export function ExternalRecordReceiptDialog({
    isOpen,
    onOpenChange,
    onSubmit,
    maxQuantity,
    currentQuantity,
}: ExternalRecordReceiptDialogProps) {
    const [quantity, setQuantity] = useState(maxQuantity);
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (quantity <= 0 || quantity > maxQuantity) {
            return;
        }

        onSubmit({ quantity_received: quantity, notes });

        // Reset form
        setQuantity(maxQuantity);
        setNotes('');
    };

    const willComplete = currentQuantity + quantity >= maxQuantity;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5" />
                        Record Receipt
                    </DialogTitle>
                    <DialogDescription>
                        Record items received from external manufacturer
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {willComplete && (
                        <Alert>
                            <AlertDescription>
                                This will complete the step and activate the next step in the route.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity Received *</Label>
                        <Input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            max={maxQuantity}
                        />
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>Pending receipt: {maxQuantity}</div>
                            <div>Already received: {currentQuantity}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Receiving Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Condition of items, quality observations, etc..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={quantity <= 0 || quantity > maxQuantity}>
                        {willComplete ? 'Complete Step' : 'Record Receipt'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

---

### Phase 5: Update MOStepStateContent

**Modify**: `resources/js/pages/production/reporting/components/components/MOStepStateContent.tsx`

Add to the switch statement:

```typescript
// Add at the beginning of the component
import { ExternalAwaitingShipmentState } from '../states/ExternalAwaitingShipmentState';
import { ExternalAtManufacturerState } from '../states/ExternalAtManufacturerState';

// In the switch statement (line ~92), add BEFORE existing cases:
const content = (() => {
    // EXTERNAL STEP STATES (Check first)
    if (currentStep?.execution_location === 'external') {
        switch (currentStep.external_status) {
            case 'awaiting_shipment':
                return (
                    <ExternalAwaitingShipmentState
                        stateInfo={stepStateInfo}
                        step={currentStep}
                        onAction={externalActions.handleExternalAction}
                    />
                );

            case 'at_manufacturer':
                return (
                    <ExternalAtManufacturerState
                        stateInfo={stepStateInfo}
                        step={currentStep}
                        onAction={externalActions.handleExternalAction}
                    />
                );
        }
    }

    // INTERNAL STEP STATES (Existing)
    switch (stepStateInfo.state) {
        case 'pending':
            return <PendingState .../>;
        // ... rest of existing cases
    }
})();
```

---

### Phase 6: Update Main MOStepActionDialog

**Modify**: `resources/js/pages/production/reporting/components/MOStepActionDialog.tsx`

```typescript
// Add import
import { useMOStepExternalActions } from './hooks/useMOStepExternalActions';
import { ExternalMarkAsShippedDialog } from './dialogs/ExternalMarkAsShippedDialog';
import { ExternalRecordReceiptDialog } from './dialogs/ExternalRecordReceiptDialog';

// In component, add new hook (line ~67, after photoManagement):
const externalActions = useMOStepExternalActions({
    stepData,
    onStateChanged
});

// Pass to MOStepDialogContent (line ~80):
<MOStepDialogContent
    stepData={stepData}
    stateTransitions={stateTransitions}
    quantityReporting={quantityReporting}
    photoManagement={photoManagement}
    externalActions={externalActions}  // ADD THIS
    order={order}
    onStepChange={handleStepChange}
/>

// Add external dialogs at the end (line ~145+):
{/* External Step Dialogs */}
<ExternalMarkAsShippedDialog
    isOpen={externalActions.markAsShippedDialog.isOpen}
    onOpenChange={externalActions.markAsShippedDialog.onOpenChange}
    onSubmit={externalActions.markAsShippedDialog.onSubmit}
    maxQuantity={order?.quantity_to_produce || order?.quantity}
/>

<ExternalRecordReceiptDialog
    isOpen={externalActions.recordReceiptDialog.isOpen}
    onOpenChange={externalActions.recordReceiptDialog.onOpenChange}
    onSubmit={externalActions.recordReceiptDialog.onSubmit}
    maxQuantity={externalActions.recordReceiptDialog.maxQuantity}
    currentQuantity={stepData.currentStep?.total_quantity_received || 0}
/>
```

---

### Phase 7: Update MOStepDialogContent Interface

**Modify**: `resources/js/pages/production/reporting/components/components/MOStepDialogContent.tsx`

```typescript
// Add import
import { UseMOStepExternalActionsReturn } from '../hooks/useMOStepExternalActions';

// Update interface (line ~13):
interface MOStepDialogContentProps {
    stepData: UseMOStepDataReturn;
    stateTransitions: UseMOStepStateTransitionsReturn;
    quantityReporting: UseMOStepQuantityReportingReturn;
    photoManagement: UseMOStepPhotoManagementReturn;
    externalActions: UseMOStepExternalActionsReturn;  // ADD THIS
    order: ManufacturingOrder;
    onStepChange?: (stepId: number) => void;
}

// Pass to MOStepStateContent (line ~47):
<MOStepStateContent
    stepStateInfo={stepStateInfo}
    currentStep={currentStep}
    activeExecution={activeExecution}
    order={order}
    quantityReporting={quantityReporting}
    photoManagement={photoManagement}
    stateTransitions={stateTransitions}
    externalActions={externalActions}  // ADD THIS
/>
```

---

### Phase 8: Enhanced Header Display

**Modify**: `resources/js/pages/production/reporting/components/components/MOStepDialogHeader.tsx`

Add external step badge display:

```typescript
// Add import
import { ExternalStepBadge } from '@/components/production/external-step-badge';

// In the header (after step status badge):
{currentStep?.execution_location === 'external' && currentStep.external_status && (
    <ExternalStepBadge status={currentStep.external_status} />
)}

{currentStep?.manufacturer && (
    <Badge variant="outline" className="gap-1">
        <MapPin className="h-3 w-3" />
        {currentStep.manufacturer.name}
    </Badge>
)}
```

---

## 📊 COMPONENT STRUCTURE AFTER ENHANCEMENT

```
MOStepActionDialog (Main)
├── MOStepDialogHeader (+ External badges)
├── MOStepDialogContent
│   ├── MOStepStateContent (+ External state routing)
│   │   ├── EXTERNAL STATES (NEW)
│   │   │   ├── ExternalAwaitingShipmentState
│   │   │   └── ExternalAtManufacturerState
│   │   └── INTERNAL STATES (Existing)
│   │       ├── PendingState
│   │       ├── QueuedState
│   │       └── ... etc
│   ├── MOStepPictureSection
│   └── MOStepActionButtons
└── Sub-dialogs
    ├── INTERNAL DIALOGS (Existing)
    │   ├── MOStepReasonDialog
    │   ├── MOStepLabelPrintDialog
    │   ├── QuantityReportDialog (Production)
    │   └── QuantityReportDialog (Scrap)
    └── EXTERNAL DIALOGS (NEW)
        ├── ExternalMarkAsShippedDialog
        └── ExternalRecordReceiptDialog
```

---

## 🎯 USER EXPERIENCE FLOW

### For External Steps - Awaiting Shipment

**Display**:
- Orange PackageSearch icon
- "Awaiting Shipment" title
- Manufacturer name and details
- Expected lead time
- Scheduled ship date

**Actions**:
1. **Create Shipment** (Primary) - Navigate to `/logistics/shipments/create`
2. **Mark as Shipped (Manual)** - For cases where shipment created outside system

**Result**: Opens dialog, records quantity, updates to `at_manufacturer` status

---

### For External Steps - At Manufacturer

**Display**:
- Indigo Factory icon
- "At Manufacturer" title
- Manufacturer name
- Linked shipment numbers with statuses
- Quantity tracking:
  - Shipped: X
  - Received: Y
  - Pending: X - Y

**Actions**:
1. **Record Receipt** (Primary) - Record items received
2. **View Shipments** - Navigate to shipments list filtered for this step

**Result**: 
- Records quantities
- **Auto-completes step when all quantities received**
- **Activates next step automatically**

---

## 🔧 INTEGRATION POINTS

### 1. State Detection Logic

```typescript
// In MOStepStateContent, check external first:
if (currentStep?.execution_location === 'external') {
    // Route to external states based on external_status
    switch (currentStep.external_status) {
        case 'awaiting_shipment': return <ExternalAwaitingShipmentState />;
        case 'at_manufacturer': return <ExternalAtManufacturerState />;
    }
}

// Then fall back to universal step status for internal steps
switch (stepStateInfo.state) {
    case 'pending': return <PendingState />;
    // ... etc
}
```

### 2. Action Routing

```typescript
// External actions go through new hook
externalActions.handleExternalAction(action)

// Internal actions go through existing hook
stateTransitions.handleStateAction(action)
```

### 3. Badge Display Priority

```
Step Status Badge (Universal - Always Show)
    + External Status Badge (If external)
    + Manufacturer Badge (If external)
```

---

## ✅ BENEFITS OF THIS DESIGN

1. **Non-Breaking**: Internal steps work exactly as before
2. **Consistent UX**: Follows same patterns (states, actions, dialogs)
3. **Clear Separation**: External logic isolated in new hook and components
4. **Maintainable**: Each concern in its own file
5. **Type-Safe**: Full TypeScript coverage
6. **Extensible**: Easy to add more external actions later

---

## 📝 IMPLEMENTATION CHECKLIST

### Required New Files (6)
- [ ] `states/ExternalAwaitingShipmentState.tsx`
- [ ] `states/ExternalAtManufacturerState.tsx`
- [ ] `hooks/useMOStepExternalActions.ts`
- [ ] `dialogs/ExternalMarkAsShippedDialog.tsx`
- [ ] `dialogs/ExternalRecordReceiptDialog.tsx`
- [ ] `utils/externalStepHelpers.ts` (optional utilities)

### Modified Files (4)
- [ ] `MOStepActionDialog.tsx` - Add hook and dialogs
- [ ] `components/MOStepDialogContent.tsx` - Pass external actions
- [ ] `components/MOStepStateContent.tsx` - Add external state routing
- [ ] `components/MOStepDialogHeader.tsx` - Add external badges

### Total: 10 files (6 new, 4 modified)
### Estimated Lines: ~800 lines of code

---

## 🎨 VISUAL MOCKUP

### External Awaiting Shipment State
```
┌─────────────────────────────────────────────┐
│   📦 (Orange)                               │
│   Awaiting Shipment                         │
│   Ready to ship to external manufacturer    │
│                                              │
│   ┌─────────────────────────────────────┐   │
│   │ Heat Treatment                      │   │
│   │                                      │   │
│   │ 📍 ABC Heat Treating                │   │
│   │    External Manufacturer            │   │
│   │                                      │   │
│   │ Expected Lead Time: 7 days          │   │
│   │ Scheduled Ship: Nov 30, 2025        │   │
│   └─────────────────────────────────────┘   │
│                                              │
│   [🚚 Create Shipment]  (Primary)          │
│   [📦 Mark as Shipped (Manual)] (Outline)  │
└─────────────────────────────────────────────┘
```

### External At Manufacturer State
```
┌─────────────────────────────────────────────┐
│   🏭 (Indigo)                               │
│   At Manufacturer                            │
│   Items are being processed externally       │
│                                              │
│   ┌─────────────────────────────────────┐   │
│   │ Heat Treatment                      │   │
│   │                                      │   │
│   │ 📍 ABC Heat Treating                │   │
│   │                                      │   │
│   │ Shipments:                          │   │
│   │  SHIP-20251128-0001    [shipped]   │   │
│   │                                      │   │
│   │ Shipped:   100                      │   │
│   │ Received:   50                      │   │
│   │ Pending:    50 (orange)             │   │
│   │                                      │   │
│   │ Last shipped: Nov 28, 2025          │   │
│   └─────────────────────────────────────┘   │
│                                              │
│   [📥 Record Receipt]  (Primary)            │
│   [🚚 View Shipments]  (Outline)            │
└─────────────────────────────────────────────┘
```

---

## 💡 ALTERNATIVE APPROACHES CONSIDERED

### Option A: Separate External Dialog (REJECTED)
- Create entirely separate dialog for external steps
- **Cons**: Code duplication, inconsistent UX, double maintenance
- **Why rejected**: Breaks UX consistency

### Option B: Toggle Mode in Same Dialog (REJECTED)
- Add toggle button to switch between internal/external views
- **Cons**: Confusing, unnecessary complexity
- **Why rejected**: Steps are either internal OR external, not both

### Option C: Augmented State-Based Routing (SELECTED ✅)
- Detect step type and route to appropriate states
- Reuse all existing infrastructure
- **Pros**: Clean, maintainable, consistent, non-breaking
- **Why selected**: Best of all worlds

---

## 🚀 RECOMMENDATION

**Implement the proposed design in phases:**

**Phase 1** (Critical - 2 hours):
- Create 2 new state components
- Create new hook for external actions
- Update state routing in MOStepStateContent

**Phase 2** (Important - 1.5 hours):
- Create 2 new dialogs
- Integrate dialogs with main component
- Update header to show external badges

**Phase 3** (Polish - 30 min):
- Add external step utilities
- Test all workflows
- Fix any edge cases

**Total Time: ~4 hours**

---

## 📌 QUESTIONS FOR CLARIFICATION

1. **Manual Shipment Recording**: Should "Mark as Shipped (Manual)" be available, or should ALL shipments go through the logistics module?
   - **Recommendation**: Keep it for flexibility (shipments created externally)

2. **Photo Upload**: Should external step actions also support photo upload like internal steps?
   - **Recommendation**: Yes, reuse existing photo capture system

3. **Shipment Creation**: Should "Create Shipment" button:
   - A) Navigate to `/logistics/shipments/create` with step pre-selected
   - B) Open an inline shipment creation form
   - **Recommendation**: Option A for consistency

4. **Quantity Validation**: Should recording receipt validate against shipment quantities?
   - **Recommendation**: Yes, show warning if mismatch detected

---

## ✨ SUMMARY

This design seamlessly integrates external step management into the existing MOStepActionDialog by:

1. **Detecting** step execution location
2. **Routing** to appropriate state components
3. **Providing** external-specific actions
4. **Reusing** all existing infrastructure (hooks, patterns, components)
5. **Maintaining** complete backward compatibility

The result is a unified, consistent user experience whether working with internal or external manufacturing steps.

**Ready to implement?** Let me know if you approve this design or want any modifications!

