# Manufacturing Order Step-Level Refactor Specification

## 1. Overview

This document specifies the refactoring of the Manufacturing Order (MO) Details Dialog to focus on step-level execution rather than overall MO progress. The refactor introduces step-level quantity reporting, scrap tracking, time tracking, and photo capture capabilities while maintaining a responsive UI that works across desktop and mobile devices.

### Key Changes
1. **Dialog Focus**: Transform from MO-centric to Step-centric view
2. **Step-Level Reporting**: Enable quantity, scrap, and time tracking per step
3. **Photo Integration**: Allow up to 3 photos per step execution
4. **Responsive Design**: Mobile-first approach with desktop optimization
5. **QR Code Integration**: Direct access to active step via existing QR infrastructure

## 2. User Interface Changes

### 2.1 Layout Structure

The new dialog will follow the mockup design with four main quadrants:

```
┌─────────────────────────────────────────────────────────────┐
│                     MO Step Execution Dialog                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   PRODUÇÃO/SCRAP    │    │    ITEM/PICTURE     │        │
│  │                     │    │                     │        │
│  │   [- 210 +]        │    │   [Item Image]      │        │
│  │                     │    │   or                │        │
│  └─────────────────────┘    │   [Step Photos]     │        │
│                             └─────────────────────┘        │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │      SUBMIT         │    │   CURRENT STEP      │        │
│  │  MARK COMPLETE      │    │   ─────────────     │        │
│  │  [Print QR] [Photo] │    │   GATE: ___         │        │
│  │                     │    │   NEXT STEP         │        │
│  └─────────────────────┘    └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Responsive Behavior

- **Desktop (>768px)**: 2x2 grid layout as shown
- **Mobile (<768px)**: Stack vertically in order:
  1. Current Step / Next Step
  2. Production/Scrap tabs
  3. Item/Picture display
  4. Action buttons

### 2.3 Component Details

#### 2.3.1 Production/Scrap Section
- **Tab Interface**: Toggle between Production and Scrap reporting
- **Quantity Input**: Large numeric display with +/- buttons
- **Unit Display**: Show unit of measure below quantity
- **Quick Buttons**: Preset quantities (10, 25, 50, 100) when applicable
- **Validation**: Cannot exceed remaining quantity for step

#### 2.3.2 Item/Picture Section
- **Default View**: Display item primary image
- **After Photos**: Show captured step photos (up to 3)
- **Carousel**: Navigate between multiple photos
- **Click to Enlarge**: Full-screen view on click

#### 2.3.3 Current Step/Next Step Section
- **Current Step**: 
  - Step name and number
  - Work cell assignment
  - Progress indicator
  - Gate quantity display
- **Next Step**: 
  - Preview of next step name
  - Required quantity to proceed
  - Lock icon if gate not met

#### 2.3.4 Action Section
- **Submit Button**: Report current quantities
- **Mark Complete**: Complete the step (when allowed)
- **Print QR Code**: Generate MO QR code PDF
- **Take Picture**: Capture step execution photo

## 3. Backend Architecture Changes

### 3.1 Database Schema Updates

#### 3.1.1 Manufacturing Step Executions Table Updates

```php
// Modify existing migration: 2025_01_10_000012_create_manufacturing_step_executions_table.php

Schema::create('manufacturing_step_executions', function (Blueprint $table) {
    // ... existing fields ...
    
    // Add new fields for enhanced tracking
    $table->text('production_notes')->nullable();
    $table->text('scrap_reason')->nullable();
    $table->integer('time_spent_minutes')->nullable();
    
    // Photo tracking
    $table->integer('photo_count')->default(0);
    $table->timestamp('last_photo_at')->nullable();
    
    // Add indexes for performance
    $table->index(['manufacturing_order_id', 'status']);
    $table->index(['manufacturing_step_id', 'status']);
});
```

### 3.2 Model Updates

#### 3.2.1 ManufacturingStepExecution Model

```php
// app/Models/Production/ManufacturingStepExecution.php

use App\Traits\HasMediaTrait;
use Spatie\MediaLibrary\HasMedia;

class ManufacturingStepExecution extends Model implements HasMedia
{
    use HasFactory, HasMediaTrait;
    
    protected $fillable = [
        // ... existing fields ...
        'production_notes',
        'scrap_reason',
        'time_spent_minutes',
        'photo_count',
        'last_photo_at',
    ];
    
    protected $casts = [
        // ... existing casts ...
        'time_spent_minutes' => 'integer',
        'photo_count' => 'integer',
        'last_photo_at' => 'datetime',
    ];
    
    /**
     * Register media collections.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('step_photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
            ->useDisk('public')
            ->singleFile(false); // Allow multiple files
    }
    
    /**
     * Custom media conversions for step photos.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        // Optimized display version (for laptop screen 1:1)
        $this->addMediaConversion('display')
            ->width(1920)
            ->height(1080)
            ->quality(85)
            ->optimize()
            ->nonQueued()
            ->performOnCollections('step_photos');
    }
    
    /**
     * Get step photos with metadata.
     */
    public function getStepPhotos()
    {
        return $this->getMedia('step_photos')->map(function ($media) {
            return [
                'id' => $media->id,
                'url' => $media->getUrl(),
                'display_url' => $media->getUrl('display'),
                'uploaded_by' => $media->getCustomProperty('uploaded_by'),
                'uploaded_at' => $media->getCustomProperty('uploaded_at'),
                'file_size' => $media->size,
                'mime_type' => $media->mime_type,
            ];
        });
    }
    
    /**
     * Check if can proceed to next step based on gate quantity.
     */
    public function canProceedToNextStep(): bool
    {
        $step = $this->manufacturingStep;
        $nextStep = $step->getNextStep();
        
        if (!$nextStep) {
            return false;
        }
        
        // Check gate quantity based on dependency configuration
        return $this->meetsGateRequirements($nextStep);
    }
    
    private function meetsGateRequirements($nextStep): bool
    {
        switch ($nextStep->dependency_start_condition) {
            case 'completed':
                return $this->status === 'completed';
                
            case 'quantity_based':
                return $this->quantity_completed >= $nextStep->dependency_minimum_quantity;
                
            case 'percentage_based':
                $percentComplete = ($this->quantity_completed / $this->manufacturingOrder->quantity) * 100;
                return $percentComplete >= $nextStep->dependency_minimum_percentage;
                
            case 'immediate':
                return $this->status !== 'pending';
                
            default:
                return false;
        }
    }
}
```

### 3.3 Service Layer Updates

#### 3.3.1 Manufacturing Step Execution Service

```php
// app/Services/Production/ManufacturingStepExecutionService.php

class ManufacturingStepExecutionService
{
    /**
     * Report progress on a step execution with photos.
     */
    public function reportProgress(
        ManufacturingStepExecution $execution,
        array $data,
        array $photos = []
    ): ManufacturingStepExecution {
        DB::transaction(function () use ($execution, $data, $photos) {
            // Update execution quantities and notes
            $execution->update([
                'quantity_completed' => $execution->quantity_completed + ($data['quantity_completed'] ?? 0),
                'quantity_scrapped' => $execution->quantity_scrapped + ($data['quantity_scrapped'] ?? 0),
                'production_notes' => $data['notes'] ?? null,
                'scrap_reason' => $data['scrap_reason'] ?? null,
                'time_spent_minutes' => $data['time_spent'] ?? null,
            ]);
            
            // Update cumulative quantities on the step
            $step = $execution->manufacturingStep;
            $step->update([
                'cumulative_quantity_completed' => $step->cumulative_quantity_completed + ($data['quantity_completed'] ?? 0),
                'cumulative_quantity_scrapped' => $step->cumulative_quantity_scrapped + ($data['quantity_scrapped'] ?? 0),
            ]);
            
            // Handle photo uploads (max 3)
            if (!empty($photos)) {
                $existingPhotos = $execution->getMedia('step_photos')->count();
                $photosToAdd = array_slice($photos, 0, max(0, 3 - $existingPhotos));
                
                foreach ($photosToAdd as $photo) {
                    $execution->addMediaWithDiskSelection($photo, 'step_photos');
                }
                
                $execution->update([
                    'photo_count' => $execution->getMedia('step_photos')->count(),
                    'last_photo_at' => now(),
                ]);
            }
            
            // Check if step should be marked complete
            if ($data['mark_complete'] ?? false) {
                $this->completeStepExecution($execution);
            }
            
            // Log activity
            activity()
                ->performedOn($execution)
                ->causedBy(auth()->user())
                ->withProperties([
                    'quantity_completed' => $data['quantity_completed'] ?? 0,
                    'quantity_scrapped' => $data['quantity_scrapped'] ?? 0,
                    'time_spent_minutes' => $data['time_spent'] ?? null,
                    'photos_added' => count($photos),
                ])
                ->log('Step progress reported');
        });
        
        return $execution->fresh();
    }
    
    /**
     * Complete a step execution.
     */
    private function completeStepExecution(ManufacturingStepExecution $execution): void
    {
        $execution->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        
        // Update step status
        $step = $execution->manufacturingStep;
        $step->update([
            'status' => 'completed',
            'actual_end_time' => now(),
        ]);
        
        // Check and activate next step if gate requirements are met
        $this->checkAndActivateNextStep($execution);
    }
    
    /**
     * Check if next step can be activated based on gate requirements.
     */
    private function checkAndActivateNextStep(ManufacturingStepExecution $execution): void
    {
        $nextStep = $execution->manufacturingStep->getNextStep();
        
        if (!$nextStep || !$execution->canProceedToNextStep()) {
            return;
        }
        
        // Create execution for next step if it doesn't exist
        $nextExecution = ManufacturingStepExecution::firstOrCreate([
            'manufacturing_step_id' => $nextStep->id,
            'manufacturing_order_id' => $execution->manufacturing_order_id,
        ], [
            'status' => 'queued',
            'work_cell_id' => $nextStep->work_cell_id,
        ]);
        
        // Update next step status
        $nextStep->update(['status' => 'queued']);
    }
}
```

### 3.4 Controller Updates

#### 3.4.1 Step Execution Controller

```php
// app/Http/Controllers/Production/StepExecutionController.php

public function reportProgress(Request $request, ManufacturingStepExecution $execution)
{
    $this->authorize('update', $execution);
    
    $validated = $request->validate([
        'quantity_completed' => 'nullable|integer|min:0',
        'quantity_scrapped' => 'nullable|integer|min:0',
        'scrap_reason' => 'required_if:quantity_scrapped,>,0|nullable|string|max:500',
        'notes' => 'nullable|string|max:500',
        'time_spent' => 'nullable|integer|min:0',
        'mark_complete' => 'boolean',
        'photos' => 'nullable|array|max:3',
        'photos.*' => 'image|mimes:jpeg,jpg,png,webp,heic|max:10240', // 10MB max
    ]);
    
    // Validate quantities don't exceed limits
    $remainingQty = $execution->manufacturingOrder->quantity - 
                    $execution->manufacturingStep->cumulative_quantity_completed - 
                    $execution->manufacturingStep->cumulative_quantity_scrapped;
    
    $totalReported = ($validated['quantity_completed'] ?? 0) + ($validated['quantity_scrapped'] ?? 0);
    
    if ($totalReported > $remainingQty) {
        return back()->withErrors(['quantity' => 'Total reported exceeds remaining quantity.']);
    }
    
    $execution = $this->executionService->reportProgress(
        $execution,
        $validated,
        $request->file('photos', [])
    );
    
    // Return updated order data via Inertia
    return back()->with('success', 'Progress reported successfully.')
        ->with('activeExecution', $execution->load(['manufacturingStep', 'media']));
}

public function uploadPhoto(Request $request, ManufacturingStepExecution $execution)
{
    $this->authorize('update', $execution);
    
    $validated = $request->validate([
        'photo' => 'required|image|mimes:jpeg,jpg,png,webp,heic|max:10240',
    ]);
    
    // Check photo limit
    if ($execution->getMedia('step_photos')->count() >= 3) {
        return back()->withErrors(['photo' => 'Maximum of 3 photos allowed per step.']);
    }
    
    $media = $execution->addMediaWithDiskSelection($validated['photo'], 'step_photos');
    
    $execution->update([
        'photo_count' => $execution->getMedia('step_photos')->count(),
        'last_photo_at' => now(),
    ]);
    
    // Return with the new photo data
    return back()->with('newPhoto', [
        'id' => $media->id,
        'url' => $media->getUrl(),
        'display_url' => $media->getUrl('display'),
    ]);
}

public function deletePhoto(ManufacturingStepExecution $execution, Media $media)
{
    $this->authorize('update', $execution);
    
    // Verify media belongs to this execution
    if ($media->model_id !== $execution->id || $media->collection_name !== 'step_photos') {
        abort(403, 'Unauthorized');
    }
    
    $media->delete();
    
    $execution->update([
        'photo_count' => $execution->getMedia('step_photos')->count(),
    ]);
    
    return back()->with('success', 'Photo deleted successfully.');
}
```

#### 3.4.2 Production Reporting Controller Updates

```php
// app/Http/Controllers/Production/ProductionReportingController.php

public function index(Request $request)
{
    // ... existing code ...
    
    // If specific MO and step requested (from QR scan)
    if ($request->has('selected_mo') && $request->has('active_step')) {
        $selectedOrder = ManufacturingOrder::with([
            'item',
            'manufacturingRoute.steps.executions' => function ($query) {
                $query->with('media');
            }
        ])->find($request->selected_mo);
        
        $activeExecution = ManufacturingStepExecution::where('manufacturing_order_id', $selectedOrder->id)
            ->where('manufacturing_step_id', $request->active_step)
            ->with(['manufacturingStep', 'media'])
            ->first();
        
        return Inertia::render('production/reporting/index', [
            // ... existing props ...
            'selectedMO' => $selectedOrder,
            'activeExecution' => $activeExecution,
            'openDialog' => true, // Signal to open the dialog automatically
        ]);
    }
    
    // ... rest of existing code ...
}

#### 3.4.3 QR Code Controller Updates

```php
// app/Http/Controllers/Production/QrCodeController.php

public function handleOrderScan(Request $request, string $orderNumber)
{
    $order = ManufacturingOrder::where('order_number', $orderNumber)
        ->with(['item', 'manufacturingRoute.steps', 'children'])
        ->firstOrFail();
    
    // Log the scan
    $this->logScan($request, 'order', $orderNumber);
    
    // Get current active step execution
    $activeExecution = ManufacturingStepExecution::where('manufacturing_order_id', $order->id)
        ->whereIn('status', ['in_progress', 'queued'])
        ->with(['manufacturingStep', 'media'])
        ->orderBy('manufacturing_step_id')
        ->first();
    
    // Always redirect to production reporting with the specific MO and step
    return redirect()->route('production.reporting.index', [
        'selected_mo' => $order->id,
        'active_step' => $activeExecution?->manufacturing_step_id
    ]);
}
```

## 4. Frontend Implementation

### 4.0 Inertia Data Flow

The refactored implementation uses Inertia.js for all server-client communication:

1. **Initial Load**: When opening the dialog, step execution data is passed as props from the controller
2. **Photo Upload**: Uses `router.post()` with FormData, returns updated data via session flash
3. **Progress Reporting**: Uses form helper's `post()` method, returns updated execution in props
4. **Photo Delete**: Uses `router.delete()`, updates UI optimistically
5. **QR Scan**: Redirects to production reporting page with query params to auto-open dialog

No JSON API calls or axios requests are used - all interactions follow the Inertia pattern of page visits and redirects.

### 4.1 Refactored MODetailsDialog Component

```tsx
// resources/js/pages/production/reporting/components/MODetailsDialog.tsx

import React, { useState, useEffect } from 'react';
import { ManufacturingOrder, ManufacturingStepExecution } from '@/types/production';
import { useForm, router } from '@inertiajs/react';
import { createFormAdapter } from '@/utils/form-adapters';
import { formatNumber } from '@/utils/number';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextArea } from '@/components/TextArea';
import { 
    Plus, Minus, Camera, Printer, Check, 
    ChevronLeft, ChevronRight, AlertCircle,
    Package, Clock, Zap
} from 'lucide-react';
import { StepPhotoCapture } from './StepPhotoCapture';
import { StepPhotoViewer } from './StepPhotoViewer';
import { cn } from '@/lib/utils';

interface MODetailsDialogProps {
    order: ManufacturingOrder | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeStepId?: number;
}

export function MODetailsDialog({ 
    order, 
    isOpen, 
    onOpenChange,
    activeStepId 
}: MODetailsDialogProps) {
    const [activeTab, setActiveTab] = useState<'production' | 'scrap'>('production');
    const [activeExecution, setActiveExecution] = useState<ManufacturingStepExecution | null>(null);
    const [stepPhotos, setStepPhotos] = useState<any[]>([]);
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const { data, setData, post, processing, errors, clearErrors, reset } = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        scrap_reason: '',
        time_spent: 0,
        notes: '',
        mark_complete: false,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    // Initialize from props
    useEffect(() => {
        if (order && isOpen) {
            // If we have activeExecution passed from controller, use it
            const execution = order.activeExecution || findActiveExecution(order);
            setActiveExecution(execution);
            setStepPhotos(execution?.media || []);
        }
    }, [order, isOpen]);

    const findActiveExecution = (order: ManufacturingOrder) => {
        if (!order.manufacturingRoute?.steps) return null;
        
        // Find first step with in_progress or queued execution
        for (const step of order.manufacturingRoute.steps) {
            const execution = step.executions?.find(
                e => ['in_progress', 'queued'].includes(e.status)
            );
            if (execution) return execution;
        }
        return null;
    };

    const handleQuantityChange = (field: 'quantity_completed' | 'quantity_scrapped', delta: number) => {
        const newValue = Math.max(0, data[field] + delta);
        const maxRemaining = getRemainingQuantity();
        
        if (field === 'quantity_completed') {
            setData(field, Math.min(newValue, maxRemaining - data.quantity_scrapped));
        } else {
            setData(field, Math.min(newValue, maxRemaining - data.quantity_completed));
        }
    };

    const getRemainingQuantity = () => {
        if (!order || !activeExecution) return 0;
        
        return order.quantity - 
               activeExecution.manufacturingStep.cumulative_quantity_completed -
               activeExecution.manufacturingStep.cumulative_quantity_scrapped;
    };

    const handleSubmit = () => {
        if (!activeExecution) return;

        post(route('production.reporting.steps.report', activeExecution.id), {
            preserveScroll: true,
            onSuccess: (page) => {
                reset();
                // Update execution from page props
                if (page.props.activeExecution) {
                    setActiveExecution(page.props.activeExecution);
                    setStepPhotos(page.props.activeExecution.media || []);
                }
            },
        });
    };

    const handlePhotoCapture = (photoBlob: Blob) => {
        if (!activeExecution || stepPhotos.length >= 3) return;

        const formData = new FormData();
        formData.append('photo', photoBlob, `step-${activeExecution.id}-${Date.now()}.jpg`);

        router.post(route('production.reporting.steps.upload-photo', activeExecution.id), formData, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                if (page.props.newPhoto) {
                    setStepPhotos([...stepPhotos, page.props.newPhoto]);
                    setShowPhotoCapture(false);
                }
            },
            onError: (errors) => {
                console.error('Failed to upload photo:', errors);
            }
        });
    };

    const handlePhotoDelete = (photoId: number) => {
        if (!activeExecution) return;

        router.delete(route('production.reporting.steps.delete-photo', {
            execution: activeExecution.id,
            media: photoId
        }), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setStepPhotos(stepPhotos.filter(p => p.id !== photoId));
            }
        });
    };

    const handlePrintQR = () => {
        if (!order) return;
        
        router.post(route('production.qr-tags.order', order.id), {}, {
            onSuccess: (page) => {
                if (page.props.qrTag?.pdf_url) {
                    window.open(page.props.qrTag.pdf_url, '_blank');
                }
            }
        });
    };

    const getGateQuantity = () => {
        if (!activeExecution) return 0;
        
        const nextStep = activeExecution.manufacturingStep.next_step;
        if (!nextStep) return order?.quantity || 0;
        
        switch (nextStep.dependency_start_condition) {
            case 'quantity_based':
                return nextStep.dependency_minimum_quantity || 0;
            case 'percentage_based':
                return Math.ceil((order?.quantity || 0) * (nextStep.dependency_minimum_percentage || 0) / 100);
            default:
                return order?.quantity || 0;
        }
    };

    if (!order || !activeExecution || loading) {
        return null;
    }

    const currentStep = activeExecution.manufacturingStep;
    const nextStep = currentStep.next_step;
    const gateQuantity = getGateQuantity();
    const totalCompleted = currentStep.cumulative_quantity_completed + data.quantity_completed;
    const canProceed = totalCompleted >= gateQuantity;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
                    <div className="p-6 h-full flex flex-col">
                        {/* Header */}
                        <div className="mb-4">
                            <h2 className="text-2xl font-semibold">
                                {order.order_number} - Step Execution
                            </h2>
                            <p className="text-muted-foreground">
                                {order.item?.name} ({formatNumber(order.quantity)} {order.unit_of_measure})
                            </p>
                        </div>

                        {/* Main Grid */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Top Left - Production/Scrap */}
                            <Card className="p-4">
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="production">Produção</TabsTrigger>
                                        <TabsTrigger value="scrap">Scrap</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="production" className="mt-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-12 w-12"
                                                onClick={() => handleQuantityChange('quantity_completed', -1)}
                                                disabled={data.quantity_completed <= 0}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>

                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={data.quantity_completed}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setData('quantity_completed', val);
                                                    }}
                                                    className="w-32 h-16 text-3xl font-bold text-center border rounded"
                                                    min="0"
                                                    max={getRemainingQuantity()}
                                                />
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {order.unit_of_measure}
                                                </p>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-12 w-12"
                                                onClick={() => handleQuantityChange('quantity_completed', 1)}
                                                disabled={data.quantity_completed >= getRemainingQuantity()}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <TextArea
                                            form={formAdapter}
                                            name="notes"
                                            label="Production Notes"
                                            className="mt-4"
                                            rows={3}
                                        />
                                    </TabsContent>

                                    <TabsContent value="scrap" className="mt-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-12 w-12"
                                                onClick={() => handleQuantityChange('quantity_scrapped', -1)}
                                                disabled={data.quantity_scrapped <= 0}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>

                                            <div className="text-center">
                                                <input
                                                    type="number"
                                                    value={data.quantity_scrapped}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setData('quantity_scrapped', val);
                                                    }}
                                                    className="w-32 h-16 text-3xl font-bold text-center border rounded text-red-600"
                                                    min="0"
                                                    max={getRemainingQuantity() - data.quantity_completed}
                                                />
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {order.unit_of_measure}
                                                </p>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-12 w-12"
                                                onClick={() => handleQuantityChange('quantity_scrapped', 1)}
                                                disabled={data.quantity_scrapped >= getRemainingQuantity() - data.quantity_completed}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <TextArea
                                            form={formAdapter}
                                            name="scrap_reason"
                                            label="Scrap Reason"
                                            className="mt-4"
                                            rows={3}
                                            required={data.quantity_scrapped > 0}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </Card>

                            {/* Top Right - Item/Picture */}
                            <Card className="p-4">
                                <div className="h-full flex flex-col">
                                    <h3 className="font-semibold mb-2">Item / Picture</h3>
                                    
                                    <div className="flex-1 relative">
                                        {stepPhotos.length > 0 ? (
                                            <StepPhotoViewer
                                                photos={stepPhotos}
                                                selectedIndex={selectedPhotoIndex}
                                                onIndexChange={setSelectedPhotoIndex}
                                                onDelete={handlePhotoDelete}
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center bg-gray-50 rounded">
                                                {order.item?.primary_image_url ? (
                                                    <img
                                                        src={order.item.primary_image_url}
                                                        alt={order.item.name}
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="text-center text-gray-400">
                                                        <Package className="w-16 h-16 mx-auto mb-2" />
                                                        <p>No image available</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Bottom Left - Actions */}
                            <Card className="p-4">
                                <div className="space-y-4">
                                    <Button
                                        className="w-full h-12"
                                        onClick={handleSubmit}
                                        disabled={processing || (data.quantity_completed === 0 && data.quantity_scrapped === 0)}
                                    >
                                        Submit
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        className="w-full h-12"
                                        onClick={() => setData('mark_complete', true)}
                                        disabled={!canProceed}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark Complete
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handlePrintQR}
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Print QR Code
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={() => setShowPhotoCapture(true)}
                                            disabled={stepPhotos.length >= 3}
                                        >
                                            <Camera className="w-4 h-4 mr-2" />
                                            Take Picture
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Bottom Right - Current/Next Step */}
                            <Card className="p-4">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Current Step</h3>
                                        <div className="space-y-2">
                                            <p className="font-medium">{currentStep.name}</p>
                                            {currentStep.work_cell && (
                                                <Badge variant="outline">{currentStep.work_cell.name}</Badge>
                                            )}
                                            <div className="flex items-center gap-2 text-sm">
                                                <span>Gate:</span>
                                                <span className={cn(
                                                    "font-medium",
                                                    canProceed ? "text-green-600" : "text-orange-600"
                                                )}>
                                                    {formatNumber(totalCompleted)} / {formatNumber(gateQuantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-2">Next Step</h3>
                                        {nextStep ? (
                                            <div className="space-y-2">
                                                <p className="font-medium">{nextStep.name}</p>
                                                {!canProceed && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Complete {formatNumber(gateQuantity - totalCompleted)} more to proceed
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">Final step</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Photo Capture Modal */}
            {showPhotoCapture && (
                <StepPhotoCapture
                    isOpen={showPhotoCapture}
                    onClose={() => setShowPhotoCapture(false)}
                    onCapture={handlePhotoCapture}
                    maxPhotos={3}
                    currentPhotoCount={stepPhotos.length}
                />
            )}
        </>
    );
}
```

### 4.2 Supporting Components

#### 4.2.1 Step Photo Capture Component

```tsx
// resources/js/pages/production/reporting/components/StepPhotoCapture.tsx

import React, { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StepPhotoCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (photo: Blob) => void;
    maxPhotos: number;
    currentPhotoCount: number;
}

export function StepPhotoCapture({
    isOpen,
    onClose,
    onCapture,
    maxPhotos,
    currentPhotoCount
}: StepPhotoCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    }, [facingMode]);

    React.useEffect(() => {
        if (isOpen) {
            startCamera();
        }
        
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, startCamera]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setCapturedImage(dataUrl);
            }
        }
    };

    const confirmPhoto = () => {
        if (canvasRef.current) {
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    onCapture(blob);
                }
            }, 'image/jpeg', 0.85);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const photosRemaining = maxPhotos - currentPhotoCount;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Capture Step Photo</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert>
                        <AlertDescription>
                            {photosRemaining} photo{photosRemaining !== 1 ? 's' : ''} remaining for this step
                        </AlertDescription>
                    </Alert>

                    <div className="relative aspect-video bg-black rounded overflow-hidden">
                        {!capturedImage ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-4 right-4"
                                    onClick={toggleCamera}
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <img
                                src={capturedImage}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-2">
                        {!capturedImage ? (
                            <>
                                <Button
                                    className="flex-1"
                                    onClick={capturePhoto}
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Capture
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    className="flex-1"
                                    onClick={confirmPhoto}
                                >
                                    Use Photo
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={retakePhoto}
                                >
                                    Retake
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
```

#### 4.2.2 Step Photo Viewer Component

```tsx
// resources/js/pages/production/reporting/components/StepPhotoViewer.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepPhotoViewerProps {
    photos: any[];
    selectedIndex: number;
    onIndexChange: (index: number) => void;
    onDelete?: (photoId: number) => void;
    onExpand?: (photoUrl: string) => void;
}

export function StepPhotoViewer({
    photos,
    selectedIndex,
    onIndexChange,
    onDelete,
    onExpand
}: StepPhotoViewerProps) {
    const currentPhoto = photos[selectedIndex];

    const handlePrevious = () => {
        onIndexChange(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1);
    };

    const handleNext = () => {
        onIndexChange(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0);
    };

    if (!currentPhoto) return null;

    return (
        <div className="relative h-full flex flex-col">
            {/* Main Image */}
            <div className="flex-1 relative bg-gray-50 rounded overflow-hidden">
                <img
                    src={currentPhoto.display_url || currentPhoto.url}
                    alt={`Step photo ${selectedIndex + 1}`}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => onExpand?.(currentPhoto.url)}
                />

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2"
                            onClick={handlePrevious}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={handleNext}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-2">
                    {onExpand && (
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onExpand(currentPhoto.url)}
                        >
                            <Expand className="h-4 w-4" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onDelete(currentPhoto.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
                <div className="flex gap-2 mt-2 justify-center">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            className={cn(
                                "w-16 h-16 rounded overflow-hidden border-2 transition-colors",
                                index === selectedIndex
                                    ? "border-primary"
                                    : "border-transparent hover:border-gray-300"
                            )}
                            onClick={() => onIndexChange(index)}
                        >
                            <img
                                src={photo.display_url || photo.url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Photo Info */}
            <div className="text-xs text-muted-foreground text-center mt-2">
                Photo {selectedIndex + 1} of {photos.length}
                {currentPhoto.uploaded_at && (
                    <span> • {new Date(currentPhoto.uploaded_at).toLocaleString()}</span>
                )}
            </div>
        </div>
    );
}
```

## 5. Routes

### 5.1 New Routes

```php
// routes/production.php

// Step execution endpoints (Inertia routes)
Route::prefix('reporting/steps')->group(function () {
    Route::post('/{execution}/report', [StepExecutionController::class, 'reportProgress'])
        ->name('production.reporting.steps.report');
    
    Route::post('/{execution}/upload-photo', [StepExecutionController::class, 'uploadPhoto'])
        ->name('production.reporting.steps.upload-photo');
    
    Route::delete('/{execution}/photo/{media}', [StepExecutionController::class, 'deletePhoto'])
        ->name('production.reporting.steps.delete-photo');
});
```

## 6. Testing Strategy

### 6.1 Feature Tests

```php
// tests/Feature/Production/StepExecutionPhotoTest.php

class StepExecutionPhotoTest extends TestCase
{
    /** @test */
    public function operator_can_upload_step_photos()
    {
        $execution = ManufacturingStepExecution::factory()->create();
        $user = User::factory()->withPermission('production.steps.execute')->create();
        
        $response = $this->actingAs($user)
            ->post(route('production.reporting.steps.upload-photo', $execution), [
                'photo' => UploadedFile::fake()->image('step-photo.jpg', 1920, 1080)
            ]);
        
        $response->assertRedirect()
            ->assertSessionHas('newPhoto');
        
        expect($execution->fresh()->photo_count)->toBe(1);
        expect($execution->getMedia('step_photos'))->toHaveCount(1);
    }
    
    /** @test */
    public function step_photos_are_limited_to_three()
    {
        $execution = ManufacturingStepExecution::factory()->create();
        $user = User::factory()->withPermission('production.steps.execute')->create();
        
        // Upload 3 photos
        for ($i = 0; $i < 3; $i++) {
            $execution->addMedia(
                UploadedFile::fake()->image("photo-{$i}.jpg")
            )->toMediaCollection('step_photos');
        }
        
        $this->actingAs($user)
            ->post(route('production.reporting.steps.upload-photo', $execution), [
                'photo' => UploadedFile::fake()->image('extra-photo.jpg')
            ])
            ->assertRedirect()
            ->assertSessionHasErrors(['photo' => 'Maximum of 3 photos allowed per step.']);
    }
    
    /** @test */
    public function step_reporting_with_quantities_updates_cumulative_totals()
    {
        $execution = ManufacturingStepExecution::factory()->create();
        $user = User::factory()->withPermission('production.steps.execute')->create();
        
        $this->actingAs($user)
            ->post(route('production.reporting.steps.report', $execution), [
                'quantity_completed' => 10,
                'quantity_scrapped' => 2,
                'scrap_reason' => 'Material defect',
                'notes' => 'First batch complete'
            ])
            ->assertRedirect()
            ->assertSessionHas('success');
        
        $step = $execution->fresh()->manufacturingStep;
        expect($step->cumulative_quantity_completed)->toBe(10);
        expect($step->cumulative_quantity_scrapped)->toBe(2);
    }
}
```

## 7. Migration Guide

### 7.1 Database Migration

1. Update the `manufacturing_step_executions` migration with new fields
2. Run `php artisan migrate:fresh --seed` (since we're modifying existing migrations)

### 7.2 Frontend Updates

1. Replace existing `MODetailsDialog` component
2. Add new photo capture and viewer components
3. Update production reporting page to pass active step ID

### 7.3 Permission Updates

#### 7.3.1 Permission and Policy Implementation Status ✅

**IMPORTANT**: The required permission and policy have already been implemented and are ready to use:

1. **Permission Added** ✅
   - `production.steps.photos` - "Take photos during step execution"
   - Added to both `PermissionSeeder.php` and `ProductionPermissionSeeder.php`

2. **Policy Created** ✅
   - `ManufacturingStepExecutionPolicy` has been created at `app/Policies/Production/ManufacturingStepExecutionPolicy.php`
   - Policy is registered in `AuthServiceProvider.php`
   - Methods implemented:
     - `view()` - Uses existing `production.steps.view` permission
     - `update()` - Uses existing `production.steps.execute` permission  
     - `takePhotos()` - Uses new `production.steps.photos` permission
     - `deletePhotos()` - Uses new `production.steps.photos` permission
     - `reportProduction()` - Uses existing `production.steps.execute` permission

3. **Roles Updated** ✅
   - Production Manager - Has the permission
   - Production Supervisor - Has the permission
   - Machine Operator - Has the permission

#### 7.3.2 Implementation Notes

When implementing the controllers:
- Use `$this->authorize('update', $execution)` for general step execution updates
- Use `$this->authorize('takePhotos', $execution)` specifically for photo upload endpoints
- Use `$this->authorize('deletePhotos', $execution)` for photo deletion endpoints

The policy automatically handles:
- Work cell assignment checks for technicians
- Preventing updates to completed executions
- Photo deletion restrictions based on user role

#### 7.3.3 Existing Permissions Used
- `production.steps.view` - View step details
- `production.steps.execute` - Execute manufacturing steps and report progress
- `production.orders.view` - View manufacturing orders
- `production.orders.reportProduction` - Report production on orders

## 8. Performance Considerations

### 8.1 Image Optimization
- Resize images to max 1920x1080 for display version
- Use 85% JPEG quality for balance of size and quality
- Store on public disk for direct serving
- Consider CDN for production environments

### 8.2 Query Optimization
- Eager load step executions with media
- Index on (manufacturing_order_id, status) for active execution queries
- Cache gate calculations per step

## 9. Security Considerations

### 9.1 Photo Upload Security
- Validate file types (JPEG, PNG, WebP, HEIC)
- Limit file size to 10MB
- Sanitize file names
- Store with UUID-based names

### 9.2 Access Control
- Verify user permissions for all operations
- Ensure media belongs to correct execution
- Validate quantity limits

## 10. Future Enhancements

### 10.1 Phase 2 Features
- Video capture for complex procedures
- Annotation tools for photos
- Quality check integration with photo requirements
- Barcode/QR scanning within steps
- Time-lapse capture for long operations

### 10.2 Analytics
- Step execution time analytics
- Photo capture patterns
- Scrap reason analysis by step
- Bottleneck identification

## 11. Conclusion

This refactor transforms the MO Details Dialog into a powerful step-level execution interface that provides operators with clear visibility into their current work, requirements for proceeding, and the ability to document their progress with photos. The responsive design ensures usability across all devices while maintaining the existing QR code infrastructure for quick access.
