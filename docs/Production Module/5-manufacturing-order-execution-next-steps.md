# Manufacturing Order Execution - Next Steps Implementation Specification

## Overview

This document specifies the implementation details for the missing production execution features identified in the current system. These features are essential for operators to manage manufacturing orders after release, both with and without routing steps.

## Priority 1: Manual Production Reporting

### 1.1 Purpose
Enable direct production quantity reporting on manufacturing orders that don't have routes defined. This supports simple production scenarios where detailed step tracking isn't necessary.

### 1.2 User Interface Changes

#### Manufacturing Order Show Page Enhancement
**Location**: `/production/orders/{id}` (Overview tab)

Add a new section after the Progress section:

```
Production Reporting Section (only visible when):
- Order status is 'released' or 'in_progress'
- Order has no route OR route has no steps
- User has permission: production.orders.reportProduction

Components:
- Card with title "Direct Production Reporting"
- Button: "Report Production" (primary, icon: ClipboardCheck)
- Shows last reported: date/time and by whom (if any)
```

#### Report Production Dialog
**Triggered by**: "Report Production" button

```
Dialog Structure:
- Title: "Report Production - [Order Number]"
- Context bar: Item name, Order quantity, Current completed/scrapped

Form Fields:
1. Production Quantity
   - Label: "Quantity Completed"
   - Type: Number input
   - Validation: min=0, max=(order.quantity - order.quantity_completed)
   - Helper: "Remaining: X units"

2. Scrapped Quantity
   - Label: "Quantity Scrapped" 
   - Type: Number input
   - Validation: min=0
   - Helper: "Optional - report any defective units"

3. Production Notes
   - Label: "Notes"
   - Type: Textarea
   - Validation: max 500 chars
   - Placeholder: "Optional production notes..."

4. Mark as Complete
   - Type: Checkbox
   - Label: "Mark order as completed"
   - Visible when: quantity_completed + new_completed >= order.quantity
   - Default: checked if above condition is true

Actions:
- Cancel: Close dialog
- Submit: "Report Production" (primary)
```

### 1.3 Backend Implementation

#### New Route
```php
// routes/production.php
Route::post('/orders/{order}/report-production', [ManufacturingOrderController::class, 'reportProduction'])
    ->name('production.orders.report-production');
```

#### Controller Method
```php
// ManufacturingOrderController.php
public function reportProduction(Request $request, ManufacturingOrder $order)
{
    $this->authorize('reportProduction', $order);
    
    // Validate order can receive manual reports
    if ($order->status === 'completed' || $order->status === 'cancelled') {
        return back()->with('error', 'Cannot report production on completed or cancelled orders.');
    }
    
    // Validate no active route or allow manual reporting alongside route
    $hasActiveRoute = $order->manufacturingRoute && $order->manufacturingRoute->steps()->count() > 0;
    if ($hasActiveRoute && !config('production.allow_manual_with_route')) {
        return back()->with('error', 'This order has a route. Use step execution to report production.');
    }
    
    $validated = $request->validate([
        'quantity_completed' => 'required|integer|min:0',
        'quantity_scrapped' => 'nullable|integer|min:0',
        'notes' => 'nullable|string|max:500',
        'mark_complete' => 'boolean'
    ]);
    
    // Additional validation
    $maxCompletable = $order->quantity - $order->quantity_completed;
    if ($validated['quantity_completed'] > $maxCompletable) {
        return back()->withErrors(['quantity_completed' => 'Cannot complete more than remaining quantity.']);
    }
    
    DB::transaction(function () use ($order, $validated) {
        // Update quantities
        if ($validated['quantity_completed'] > 0) {
            $order->increment('quantity_completed', $validated['quantity_completed']);
        }
        
        if (($validated['quantity_scrapped'] ?? 0) > 0) {
            $order->increment('quantity_scrapped', $validated['quantity_scrapped']);
        }
        
        // Update status
        if ($order->status === 'released') {
            $order->update([
                'status' => 'in_progress',
                'actual_start_date' => $order->actual_start_date ?? now()
            ]);
        }
        
        if ($validated['mark_complete'] ?? false) {
            $order->update([
                'status' => 'completed',
                'actual_end_date' => now()
            ]);
            
            // Check parent auto-completion
            if ($order->parent) {
                $order->parent->checkAutoCompletion();
            }
        }
        
        // Create audit log
        activity()
            ->performedOn($order)
            ->causedBy(auth()->user())
            ->withProperties([
                'quantity_completed' => $validated['quantity_completed'],
                'quantity_scrapped' => $validated['quantity_scrapped'] ?? 0,
                'notes' => $validated['notes'] ?? null
            ])
            ->log('Manual production reported');
    });
    
    return back()->with('success', 'Production reported successfully.');
}
```

#### Model Updates
```php
// ManufacturingOrder.php
public function canReportProduction(): bool
{
    return in_array($this->status, ['released', 'in_progress']) 
        && !$this->is_completed
        && !$this->is_cancelled;
}

public function hasActiveRoute(): bool
{
    return $this->manufacturingRoute 
        && $this->manufacturingRoute->steps()->count() > 0;
}
```

#### New Permission
```php
// ManufacturingOrderPolicy.php
public function reportProduction(User $user, ManufacturingOrder $order): bool
{
    return $user->hasPermissionTo('production.orders.reportProduction', $order);
}
```

### 1.4 Frontend Implementation

#### Report Production Dialog Component
```tsx
// resources/js/components/production/ReportProductionDialog.tsx
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ManufacturingOrder } from '@/types/production';

interface Props {
    order: ManufacturingOrder;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReportProductionDialog({ order, open, onOpenChange }: Props) {
    const remaining = order.quantity - order.quantity_completed;
    
    const form = useForm({
        quantity_completed: 0,
        quantity_scrapped: 0,
        notes: '',
        mark_complete: false
    });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        form.post(route('production.orders.report-production', order.id), {
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            }
        });
    };
    
    // Update mark_complete when quantity changes
    const handleQuantityChange = (value: number) => {
        form.setData('quantity_completed', value);
        if (value >= remaining) {
            form.setData('mark_complete', true);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Report Production - {order.order_number}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        {/* Context */}
                        <div className="text-sm text-muted-foreground">
                            <div>Item: {order.item?.name}</div>
                            <div>Order Quantity: {order.quantity}</div>
                            <div>Completed: {order.quantity_completed} | Scrapped: {order.quantity_scrapped}</div>
                        </div>
                        
                        {/* Quantity Completed */}
                        <div className="grid gap-2">
                            <Label htmlFor="quantity_completed">Quantity Completed</Label>
                            <Input
                                id="quantity_completed"
                                type="number"
                                min={0}
                                max={remaining}
                                value={form.data.quantity_completed}
                                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                                className={form.errors.quantity_completed ? 'border-destructive' : ''}
                            />
                            <p className="text-sm text-muted-foreground">Remaining: {remaining} units</p>
                            {form.errors.quantity_completed && (
                                <p className="text-sm text-destructive">{form.errors.quantity_completed}</p>
                            )}
                        </div>
                        
                        {/* Quantity Scrapped */}
                        <div className="grid gap-2">
                            <Label htmlFor="quantity_scrapped">Quantity Scrapped (Optional)</Label>
                            <Input
                                id="quantity_scrapped"
                                type="number"
                                min={0}
                                value={form.data.quantity_scrapped}
                                onChange={(e) => form.setData('quantity_scrapped', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        
                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Optional production notes..."
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                maxLength={500}
                            />
                        </div>
                        
                        {/* Mark Complete */}
                        {form.data.quantity_completed >= remaining && (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="mark_complete"
                                    checked={form.data.mark_complete}
                                    onCheckedChange={(checked) => form.setData('mark_complete', checked as boolean)}
                                />
                                <Label htmlFor="mark_complete">Mark order as completed</Label>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Report Production
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

## Priority 2: Routes & Steps Tab Enhancement

### 2.1 Purpose
Enhance the existing Routes & Steps tab to show executable steps with clear actions for operators to start/continue work.

### 2.2 User Interface Changes

#### Enhanced Steps Table
**Location**: `ManufacturingOrderRouteTab` component

Replace the current basic steps list with an interactive table:

```
Table Columns:
1. Step # - Visual step number badge
2. Step Name - Name with description tooltip
3. Type - Step type badge (Standard/Quality Check/etc)
4. Work Cell - Assigned work cell
5. Status - Status badge with icon
6. Assigned To - Current operator (if in progress)
7. Progress - Visual progress indicator
8. Actions - Context-aware action buttons

Row States:
- Disabled (gray) - Dependencies not met
- Ready (blue highlight) - Can be started
- In Progress (animated) - Being executed
- On Hold (yellow) - Paused
- Completed (green) - Finished
- Failed (red) - Quality check failed

Action Buttons (based on state and permissions):
- "Start" - For queued steps
- "Continue" - For in progress/on hold steps  
- "View Details" - For completed steps
- Disabled with tooltip for pending steps
```

#### Quick Status Cards
Add summary cards above the steps table:

```
Status Cards (horizontal layout):
1. Ready to Start: X steps
2. In Progress: Y steps
3. On Hold: Z steps
4. Completed: A of B steps
```

### 2.3 Component Updates

```tsx
// Update ManufacturingOrderRouteTab.tsx
import { StepStatusBadge } from '@/components/production/StepStatusBadge';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Play, Pause, Eye, Lock } from 'lucide-react';

// Add to the component
const getStepActions = (step: ManufacturingStep) => {
    const canExecute = user.permissions?.includes('production.steps.execute');
    
    switch (step.status) {
        case 'queued':
            return canExecute ? (
                <Button
                    size="sm"
                    onClick={() => router.visit(route('production.steps.execute', step.id))}
                >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                </Button>
            ) : null;
            
        case 'in_progress':
        case 'on_hold':
            return canExecute ? (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.visit(route('production.steps.execute', step.id))}
                >
                    <Pause className="h-4 w-4 mr-1" />
                    Continue
                </Button>
            ) : null;
            
        case 'completed':
            return (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.visit(route('production.steps.show', step.id))}
                >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                </Button>
            );
            
        case 'pending':
            return (
                <Tooltip>
                    <TooltipTrigger>
                        <Button size="sm" variant="ghost" disabled>
                            <Lock className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Dependencies not met
                    </TooltipContent>
                </Tooltip>
            );
            
        default:
            return null;
    }
};
```

## Priority 3: Production Tracking Dashboard

### 3.1 Purpose
Create a centralized dashboard for operators to see available work and track production progress.

### 3.2 Page Structure

#### Route
```
/production/tracking
```

#### Page Layout
```
Header:
- Title: "Production Tracking"
- Quick filters: My Work | All Work | By Work Cell
- Search bar for order/item lookup

Main Content (3 sections):

1. My Work Queue (if operator has work cell assignment)
   - Steps assigned to my work cells
   - Grouped by status
   - One-click access to execution

2. Ready to Start
   - All queued steps across the facility
   - Filterable by work cell, priority
   - Shows order details

3. In Progress Work
   - All active step executions
   - Shows operator, start time, progress
   - Quick access to continue/monitor
```

### 3.3 Implementation

#### Controller
```php
// ProductionTrackingController.php
public function index(Request $request)
{
    $user = auth()->user();
    $myWorkCells = $user->workCells->pluck('id');
    
    // My work queue
    $myWork = ManufacturingStep::whereIn('work_cell_id', $myWorkCells)
        ->whereIn('status', ['queued', 'in_progress', 'on_hold'])
        ->with(['manufacturingRoute.manufacturingOrder.item', 'workCell', 'currentExecution.executedBy'])
        ->orderBy('status')
        ->orderBy('step_number')
        ->get();
    
    // Ready to start (facility-wide)
    $readyToStart = ManufacturingStep::where('status', 'queued')
        ->with(['manufacturingRoute.manufacturingOrder.item', 'workCell'])
        ->orderBy('created_at')
        ->limit(20)
        ->get();
    
    // In progress work
    $inProgress = ManufacturingStep::where('status', 'in_progress')
        ->with(['manufacturingRoute.manufacturingOrder.item', 'workCell', 'currentExecution.executedBy'])
        ->orderBy('actual_start_time', 'desc')
        ->get();
    
    return Inertia::render('production/tracking/index', [
        'myWork' => $myWork,
        'readyToStart' => $readyToStart,
        'inProgress' => $inProgress,
        'workCells' => WorkCell::all(),
    ]);
}
```

#### Frontend Page
```tsx
// resources/js/pages/production/tracking/index.tsx
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import { Play, Clock, User } from 'lucide-react';

interface Props {
    myWork: ManufacturingStep[];
    readyToStart: ManufacturingStep[];
    inProgress: ManufacturingStep[];
    workCells: WorkCell[];
}

export default function ProductionTracking({ myWork, readyToStart, inProgress, workCells }: Props) {
    const breadcrumbs = [
        { title: 'Production', href: '/production' },
        { title: 'Tracking', href: '/production/tracking' }
    ];
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Tracking" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Production Tracking</h1>
                    <div className="flex gap-2">
                        {/* Quick filters */}
                    </div>
                </div>
                
                {/* My Work Queue */}
                {myWork.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>My Work Queue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {myWork.map((step) => (
                                    <div key={step.id} className="flex items-center justify-between p-3 border rounded">
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {step.manufacturing_route.manufacturing_order.order_number} - {step.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {step.manufacturing_route.manufacturing_order.item?.name}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge>{step.status}</Badge>
                                            <Button
                                                size="sm"
                                                onClick={() => router.visit(route('production.steps.execute', step.id))}
                                            >
                                                <Play className="h-4 w-4 mr-1" />
                                                {step.status === 'queued' ? 'Start' : 'Continue'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {/* Ready to Start */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ready to Start</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Similar layout for ready steps */}
                    </CardContent>
                </Card>
                
                {/* In Progress */}
                <Card>
                    <CardHeader>
                        <CardTitle>In Progress Work</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Similar layout with operator info and duration */}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
```

## Priority 4: QR Code Integration

### 4.1 Purpose
Complete the QR scanning workflow to enable quick access to orders and steps via QR codes.

### 4.2 Implementation

#### Update QR Scan Handler
```php
// QrTrackingController.php
public function handleScan(Request $request)
{
    $validated = $request->validate([
        'code' => 'required|string',
        'scan_mode' => 'required|in:item,order,step',
    ]);
    
    // Decode QR data
    $qrData = $this->decodeQrCode($validated['code']);
    
    switch ($qrData['type']) {
        case 'manufacturing_order':
            return redirect()->route('production.orders.show', $qrData['id'])
                ->with('flash', ['fromQrScan' => true]);
                
        case 'manufacturing_step':
            $step = ManufacturingStep::find($qrData['id']);
            if ($step && in_array($step->status, ['queued', 'in_progress', 'on_hold'])) {
                return redirect()->route('production.steps.execute', $qrData['id']);
            }
            return redirect()->route('production.steps.show', $qrData['id']);
            
        case 'item':
            return redirect()->route('production.items.show', $qrData['id']);
            
        default:
            return back()->with('error', 'Unknown QR code type');
    }
}
```

#### Update Manufacturing Order Show Page
Add QR scan indicator:

```tsx
// In manufacturing-orders/show.tsx
{flash?.fromQrScan && (
    <Alert className="mb-4">
        <QrCode className="h-4 w-4" />
        <AlertDescription>
            Scanned via QR code. 
            {order.has_route && order.manufacturing_route?.current_active_step && (
                <Link 
                    href={route('production.steps.execute', order.manufacturing_route.current_active_step.id)}
                    className="ml-2 underline"
                >
                    Go to current step
                </Link>
            )}
        </AlertDescription>
    </Alert>
)}
```

## Priority 5: Work Cell Dashboard

### 5.1 Purpose
Provide a comprehensive dashboard for work cell operators and supervisors to:
- Execute available manufacturing steps
- View completed work history (backward-looking)
- See upcoming work in the pipeline (forward-looking)
- Monitor work cell performance and utilization

### 5.2 User Interface Design

#### Route
```
/production/work-cells/{workCellId}/dashboard
```

#### Dashboard Layout
```
Header Section:
- Work Cell Name and Code
- Current Status (Active/Inactive)
- Current Operator Count
- Utilization Rate (real-time)
- Quick Actions: Switch View | Export Data | Settings

Main Content (Tab-based):

1. Current Work Queue (Default Tab)
   - Active steps ready for execution
   - In-progress work
   - On-hold items
   
2. Completed Work (Backward View)
   - Recently completed steps
   - Performance metrics
   - Quality results
   
3. Incoming Work (Forward View)
   - Steps pending in previous work cells
   - Estimated arrival times
   - Priority indicators
   
4. Analytics
   - Work cell performance metrics
   - Efficiency trends
   - Quality statistics
```

### 5.3 Implementation

#### Controller
```php
// WorkCellDashboardController.php
namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\WorkCell;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\ManufacturingStepExecution;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class WorkCellDashboardController extends Controller
{
    public function show(Request $request, WorkCell $workCell)
    {
        $this->authorize('viewDashboard', $workCell);
        
        // Get current user's permissions
        $canExecute = auth()->user()->can('production.steps.execute');
        
        // Date range for historical data (default: last 7 days)
        $startDate = $request->input('start_date', Carbon::now()->subDays(7)->startOfDay());
        $endDate = $request->input('end_date', Carbon::now()->endOfDay());
        
        // Current Work Queue
        $currentWork = $this->getCurrentWork($workCell);
        
        // Completed Work (Backward View)
        $completedWork = $this->getCompletedWork($workCell, $startDate, $endDate);
        
        // Incoming Work (Forward View)
        $incomingWork = $this->getIncomingWork($workCell);
        
        // Work Cell Statistics
        $statistics = $this->getWorkCellStatistics($workCell, $startDate, $endDate);
        
        // Current operators
        $activeOperators = $this->getActiveOperators($workCell);
        
        return Inertia::render('production/work-cells/dashboard', [
            'workCell' => $workCell,
            'currentWork' => $currentWork,
            'completedWork' => $completedWork,
            'incomingWork' => $incomingWork,
            'statistics' => $statistics,
            'activeOperators' => $activeOperators,
            'canExecute' => $canExecute,
            'dateRange' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }
    
    // Additional methods continue in implementation details document
}
```

**See full implementation details in**: [5a-work-cell-dashboard-implementation-details.md](./5a-work-cell-dashboard-implementation-details.md)

### 5.4 Key Features

#### 1. Real-time Production Visibility
- **Current Work Queue**: Shows all steps ready for execution with priority scoring
- **Live Status Updates**: Auto-refresh every 30 seconds with manual override
- **One-Click Execution**: Direct access to step execution from dashboard

#### 2. Backward-Looking View (Completed Work)
- **Order-Based Grouping**: Completed steps grouped by manufacturing order
- **Performance Metrics**: Duration, quality pass rates, and completion times
- **Date Range Filtering**: Analyze historical performance over custom periods
- **Export Capability**: Download completed work data for analysis

#### 3. Forward-Looking View (Incoming Work)
- **Pipeline Visibility**: See work progressing through previous work cells
- **Estimated Arrival Times**: Smart calculation based on current progress
- **Time-Based Grouping**: Next hour, today, tomorrow, and later
- **Priority Indicators**: Highlight urgent incoming work

#### 4. Comprehensive Analytics
- **OEE Calculation**: Overall Equipment Effectiveness with component breakdown
- **Utilization Tracking**: Real-time capacity usage vs. maximum
- **Quality Metrics**: Pass/fail rates for quality check steps
- **Performance Trends**: Historical comparison with trend indicators

#### 5. Operator Management
- **Active Operator Display**: Shows who's currently working in the cell
- **Workload Distribution**: Visual indication of operator assignments
- **Permission-Based Actions**: Execute buttons only for authorized users

## Testing Requirements

### 1. Manual Production Reporting
- Test quantity validation (cannot exceed order quantity)
- Test status transitions (released → in_progress → completed)
- Test parent order auto-completion
- Test permission checks
- Test audit logging

### 2. Step Execution Flow
- Test step dependency enforcement
- Test state transitions
- Test concurrent execution prevention
- Test work cell assignment validation

### 3. Dashboard Performance
- Test with 100+ active steps
- Test real-time updates
- Test filtering performance
- Test mobile responsiveness

### 4. QR Code Scanning
- Test all QR code types
- Test invalid QR codes
- Test permission-based redirects
- Test mobile camera integration

## Migration Considerations

### 1. Permissions
Add new permissions to seeder:
- `production.orders.reportProduction`
- `production.tracking.view`
- `production.work-cells.viewQueue`

### 2. Configuration
Add to `config/production.php`:
```php
'allow_manual_with_route' => env('PRODUCTION_ALLOW_MANUAL_WITH_ROUTE', false),
'tracking_dashboard_refresh_seconds' => env('PRODUCTION_TRACKING_REFRESH', 30),
```

### 3. Database Indexes
Consider adding indexes for performance:
- `manufacturing_steps.status` + `work_cell_id`
- `manufacturing_orders.status` + `actual_start_date`

## Success Metrics

1. **Adoption Rate**: % of orders using production reporting
2. **Execution Time**: Average time from step queued to started
3. **Dashboard Usage**: Daily active users on tracking dashboard
4. **QR Scan Volume**: Scans per day by type
5. **Error Rate**: Failed production reports or invalid state transitions
