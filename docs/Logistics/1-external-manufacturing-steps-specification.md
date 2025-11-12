# External Manufacturing Steps - Complete Specification

## Executive Summary

This specification details all modifications required to support external manufacturing steps - production steps executed by third-party manufacturers rather than internally. This feature enables tracking of outsourced work, partial shipments, and integrates with the Logistics Module for shipping and receiving workflows.

---

## Table of Contents

1. [Overview](#overview)
2. [State Management Architecture](#state-management-architecture)
3. [Database Schema Changes](#database-schema-changes)
4. [Model Updates](#model-updates)
5. [Backend Services](#backend-services)
6. [Backend Controllers & Routes](#backend-controllers--routes)
7. [Frontend Type Definitions](#frontend-type-definitions)
8. [Frontend UI Components](#frontend-ui-components)
9. [Scheduler Integration](#scheduler-integration)
10. [Testing Requirements](#testing-requirements)
11. [Migration Strategy](#migration-strategy)

---

## 1. Overview

### 1.1 Key Concepts

**Execution Location**: Steps can be executed either internally (at your facilities) or externally (at third-party manufacturer facilities).

**IMPORTANT - State Separation**: External steps use TWO separate state systems:

1. **Step Status** (universal for ALL steps - internal and external):
   ```
   pending → queued → in_progress → completed
   ```
   This tracks: "Is the manufacturing work done?"

2. **External Status** (only for external steps):
   ```
   awaiting_shipment → shipped → in_process
   ```
   This tracks: "What's happening at the manufacturer?"

3. **Shipment Status** (tracked in Logistics Module):
   ```
   planned → packed → shipped → in_transit → delivered → received
   ```
   This tracks: "Where are the physical items?"

**Key Principle**: 
- **Steps** (both internal and external) end with `status = 'completed'`
- **Shipments** (in Logistics Module) end with `status = 'received'`
- When a Shipment is marked as `received`, the related Step is marked as `completed`

**No Status Jumping**: Users cannot skip statuses - must follow the progression sequentially.

**Partial Shipments**: A single external step can have multiple shipment records, allowing progressive shipment and receipt of quantities.

**Quality Control**: External steps do NOT have built-in quality status. Instead, add a separate `quality_check` step after the external step to inspect received items.

### 1.2 User Workflow

```
1. Plan Route → Mark step as "External" → Assign Manufacturer (now or later)
2. Execute Route → Step reaches status='queued', external_status='awaiting_shipment'
3. Logistics Module → Create shipment(s) for the step
4. Ship Items → Shipment status='shipped', Step external_status='shipped', status='in_progress'
5. At Manufacturer → Step external_status='in_process'
6. Logistics Module → Mark shipment as 'received'
7. Step Completes → Step status='completed' (triggers next step)
8. Next Step → Continues with internal or external steps
```

### 1.3 State Integration Example

Here's how the states work together:

| Action | Step Status | External Status | Shipment Status | What It Means |
|--------|-------------|-----------------|-----------------|---------------|
| Step becomes ready | `queued` | `awaiting_shipment` | - | Ready to ship |
| Create shipment | `queued` | `awaiting_shipment` | `planned` | Shipment planned |
| Ship items | `in_progress` | `shipped` | `shipped` | Items in transit |
| Manufacturer starts work | `in_progress` | `in_process` | `in_transit` or `delivered` | Work happening |
| Items return | `completed` ✓ | `in_process` | `received` ✓ | Work done, next step can start |

**Notice**: Both Step and Shipment have their own "completed" states:
- Step: `status = 'completed'` (work is done)
- Shipment: `status = 'received'` (items are back)

---

## 2. State Management Architecture

### 2.1 The Three State Systems

External manufacturing introduces THREE separate state tracking systems that work together:

#### **System 1: Step Status (Universal - ALL Steps)**

This is the **primary** state for both internal AND external steps.

```php
status: pending → queued → in_progress → completed
```

**Purpose**: Tracks whether the manufacturing work is done  
**Owned By**: ManufacturingStep model  
**Applies To**: ALL steps (internal and external)  
**Completion**: `status = 'completed'`

**Key Point**: External steps do NOT have a different completion status. They complete with `status = 'completed'` just like internal steps.

#### **System 2: External Status (External Steps Only)**

This is a **supplementary** state only for external steps.

```php
external_status: awaiting_shipment → shipped → in_process
```

**Purpose**: Tracks what's happening at the manufacturer  
**Owned By**: ManufacturingStep model (but only populated for external steps)  
**Applies To**: Only external steps  
**Does NOT Track Completion**: This status does NOT indicate when work is done

**Key Point**: Even when a step is `completed`, the `external_status` may still show `in_process`. This is intentional - it's historical data about where the work happened.

#### **System 3: Shipment Status (Logistics Module)**

This tracks the physical movement of items.

```php
shipment.status: planned → packed → shipped → in_transit → delivered → received
```

**Purpose**: Tracks where physical items are  
**Owned By**: Shipment model (Logistics Module)  
**Applies To**: Any shipment (to manufacturers, customers, warehouses)  
**Completion**: `status = 'received'`

**Key Point**: When a Shipment is marked as `received`, the related Step is marked as `completed`.

---

### 2.2 Why Three Systems?

**Separation of Concerns:**

| Question | Answered By | Field |
|----------|-------------|-------|
| "Is the work done?" | Step Status | `step.status = 'completed'` |
| "Where was it processed?" | External Status | `step.external_status = 'in_process'` |
| "Where are the items now?" | Shipment Status | `shipment.status = 'received'` |

**Example Scenario:**

```
Day 1: Items ship to manufacturer
  ├─ step.status = 'in_progress'
  ├─ step.external_status = 'shipped'
  └─ shipment.status = 'shipped'

Day 5: Manufacturer starts work
  ├─ step.status = 'in_progress'
  ├─ step.external_status = 'in_process'  ← Updated
  └─ shipment.status = 'in_transit'

Day 10: Items return to facility
  ├─ step.status = 'completed'  ← DONE! Next step can start
  ├─ step.external_status = 'in_process'  ← Stays (historical)
  └─ shipment.status = 'received'  ← Physical receipt
```

---

### 2.3 State Transition Triggers

**Who Updates What:**

| Event | Triggered By | Updates |
|-------|--------------|---------|
| Step becomes ready | Production System | `step.status = 'queued'`<br>`step.external_status = 'awaiting_shipment'` |
| Create shipment | Logistics Module | `shipment.status = 'planned'` |
| Ship items | Logistics Module | `shipment.status = 'shipped'`<br>`step.status = 'in_progress'`<br>`step.external_status = 'shipped'` |
| Manufacturer starts | User (manual) | `step.external_status = 'in_process'` |
| Items received | **Logistics Module** | `shipment.status = 'received'`<br>`step.status = 'completed'` ✓ |

**Critical Integration Point**: The Logistics Module's `markAsReceived()` method calls `step.recordQuantityReceived()`, which marks the step as `completed`.

---

### 2.4 State Query Examples

**Finding steps that need shipping:**
```php
ManufacturingStep::where('execution_location', 'external')
    ->where('external_status', 'awaiting_shipment')
    ->get();
```

**Finding completed steps (internal OR external):**
```php
ManufacturingStep::where('status', 'completed')
    ->get();
// Works for ALL step types - consistent!
```

**Finding items in transit:**
```php
Shipment::whereIn('status', ['shipped', 'in_transit'])
    ->get();
```

**Finding active external work:**
```php
ManufacturingStep::where('execution_location', 'external')
    ->where('status', 'in_progress')
    ->whereIn('external_status', ['shipped', 'in_process'])
    ->get();
```

---

### 2.5 UI Display Recommendations

**Show BOTH statuses for external steps:**

```typescript
// Internal Step
<StepStatusBadge status={step.status} />  // "In Progress"

// External Step  
<StepStatusBadge status={step.status} />  // "In Progress" or "Completed"
<ExternalStepBadge status={step.external_status} />  // "Shipped" or "In Process"
```

**Example UI States:**

**External Step - In Transit:**
```
[In Progress] [Shipped]
Heat Treatment
Manufacturer: ABC Heat Treating
```

**External Step - At Manufacturer:**
```
[In Progress] [In Process]
Heat Treatment  
Manufacturer: ABC Heat Treating
```

**External Step - Complete:**
```
[Completed] [In Process]  ← Notice both states
Heat Treatment
Manufacturer: ABC Heat Treating
✓ All items received
```

The user sees `[Completed]` (work is done) and `[In Process]` (where it was done) - both pieces of information are valuable.

---

## 3. Database Schema Changes

### 3.1 Manufacturing Steps Table

```sql
-- Migration: YYYY_MM_DD_HHMMSS_add_external_execution_to_manufacturing_steps.php

ALTER TABLE manufacturing_steps 
ADD COLUMN execution_location ENUM('internal', 'external') DEFAULT 'internal' 
  AFTER step_type
  COMMENT 'Where the step is executed';

ALTER TABLE manufacturing_steps 
ADD COLUMN manufacturer_id BIGINT UNSIGNED NULL 
  AFTER execution_location
  COMMENT 'Third-party manufacturer (for external steps)';

ALTER TABLE manufacturing_steps 
ADD COLUMN expected_lead_time_days INT NULL 
  AFTER manufacturer_id
  COMMENT 'Expected turnaround time at manufacturer (days)';

-- External step status tracking
-- NOTE: 'received' is NOT included - that's tracked in Shipment.status
-- Steps complete with status='completed' just like internal steps
ALTER TABLE manufacturing_steps 
ADD COLUMN external_status ENUM('awaiting_shipment', 'shipped', 'in_process') NULL 
  AFTER expected_lead_time_days
  COMMENT 'External processing status - does not include received (use status=completed)';

ALTER TABLE manufacturing_steps 
ADD COLUMN shipped_date TIMESTAMP NULL 
  AFTER external_status
  COMMENT 'When items were shipped to manufacturer';

ALTER TABLE manufacturing_steps 
ADD COLUMN received_date TIMESTAMP NULL 
  AFTER shipped_date
  COMMENT 'When items were received from manufacturer';

ALTER TABLE manufacturing_steps 
ADD COLUMN quantity_shipped DECIMAL(10,2) DEFAULT 0 
  AFTER received_date
  COMMENT 'Total quantity shipped (sum of all shipments)';

ALTER TABLE manufacturing_steps 
ADD COLUMN quantity_received DECIMAL(10,2) DEFAULT 0 
  AFTER quantity_shipped
  COMMENT 'Total quantity received (sum of all receipts)';

-- Foreign key constraint
ALTER TABLE manufacturing_steps 
ADD CONSTRAINT fk_manufacturer 
FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) 
ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_execution_location ON manufacturing_steps(execution_location);
CREATE INDEX idx_external_status ON manufacturing_steps(external_status);
CREATE INDEX idx_manufacturer_id ON manufacturing_steps(manufacturer_id);
```

### 3.2 Validation Rules

**Database Constraints:**
- `execution_location` must be 'internal' or 'external'
- `manufacturer_id` can only be set if `execution_location` = 'external'
- `external_status` can only be set if `execution_location` = 'external'
- `expected_lead_time_days` must be > 0 if set
- `quantity_shipped` cannot exceed the MO total quantity
- `quantity_received` cannot exceed `quantity_shipped`

**Application-Level Validation:**
- External steps should have a manufacturer assigned before shipment
- Cannot ship if status is not 'awaiting_shipment'
- Cannot mark as 'in_process' if not 'shipped'
- Cannot mark as 'received' if not 'in_process'

---

## 4. Model Updates

### 4.1 ManufacturingStep Model

**File**: `app/Models/Production/ManufacturingStep.php`

#### 3.1.1 Add Constants

```php
public const EXECUTION_LOCATIONS = [
    'internal' => 'Internal',
    'external' => 'External',
];

public const EXTERNAL_STATUSES = [
    'awaiting_shipment' => 'Awaiting Shipment',
    'shipped' => 'Shipped',
    'in_process' => 'In Process at Manufacturer',
    // NOTE: No 'received' - steps complete with status='completed'
    // Physical receipt is tracked in Shipment.status='received'
];
```

#### 3.1.2 Update Fillable Array

```php
protected $fillable = [
    // ... existing fields
    'execution_location',
    'manufacturer_id',
    'expected_lead_time_days',
    'external_status',
    'shipped_date',
    'received_date',
    'quantity_shipped',
    'quantity_received',
];
```

#### 3.1.3 Update Casts Array

```php
protected $casts = [
    // ... existing casts
    'execution_location' => 'string',
    'external_status' => 'string',
    'shipped_date' => 'datetime',
    'received_date' => 'datetime',
    'quantity_shipped' => 'decimal:2',
    'quantity_received' => 'decimal:2',
];
```

#### 3.1.4 Add Relationship

```php
/**
 * Get the external manufacturer for this step.
 */
public function manufacturer(): BelongsTo
{
    return $this->belongsTo(\App\Models\Production\Manufacturer::class);
}

/**
 * Get the shipments for this external step.
 */
public function shipments(): HasMany
{
    return $this->hasMany(\App\Models\Logistics\Shipment::class, 'manufacturing_step_id');
}
```

#### 3.1.5 Add Scopes

```php
/**
 * Scope for external steps only.
 */
public function scopeExternal($query)
{
    return $query->where('execution_location', 'external');
}

/**
 * Scope for internal steps only.
 */
public function scopeInternal($query)
{
    return $query->where('execution_location', 'internal');
}

/**
 * Scope for steps awaiting shipment.
 */
public function scopeAwaitingShipment($query)
{
    return $query->where('execution_location', 'external')
                 ->where('external_status', 'awaiting_shipment');
}

/**
 * Scope for steps at manufacturer.
 */
public function scopeAtManufacturer($query)
{
    return $query->where('execution_location', 'external')
                 ->whereIn('external_status', ['shipped', 'in_process']);
}
```

#### 3.1.6 Add Helper Methods

```php
/**
 * Check if this is an external step.
 */
public function isExternal(): bool
{
    return $this->execution_location === 'external';
}

/**
 * Check if this is an internal step.
 */
public function isInternal(): bool
{
    return $this->execution_location === 'internal';
}

/**
 * Check if step can be shipped.
 */
public function canShip(): bool
{
    if (!$this->isExternal()) {
        return false;
    }

    if (!$this->manufacturer_id) {
        return false;
    }

    if ($this->external_status !== 'awaiting_shipment') {
        return false;
    }

    // Check if previous step is complete or allows progressive flow
    if (!$this->canStart()) {
        return false;
    }

    return true;
}

/**
 * Check if step can be marked as shipped.
 */
public function canMarkAsShipped(): bool
{
    return $this->isExternal() 
        && $this->external_status === 'awaiting_shipment'
        && $this->manufacturer_id !== null;
}

/**
 * Check if step can be marked as in process.
 */
public function canMarkAsInProcess(): bool
{
    return $this->isExternal() 
        && $this->external_status === 'shipped';
}

/**
 * Check if step can be completed (all quantities received).
 * For external steps, this is triggered by the Logistics Module.
 */
public function canComplete(): bool
{
    if ($this->isExternal()) {
        // External steps complete when all shipped quantity is received
        return $this->quantity_received >= $this->quantity_shipped;
    }
    
    // Internal steps use existing completion logic
    return $this->status === 'in_progress';
}

/**
 * Get the remaining quantity to ship.
 */
public function getRemainingQuantityToShipAttribute(): float
{
    $totalQuantity = $this->manufacturingRoute->manufacturingOrder->quantity;
    return max(0, $totalQuantity - $this->quantity_shipped);
}

/**
 * Get the remaining quantity to receive.
 */
public function getRemainingQuantityToReceiveAttribute(): float
{
    return max(0, $this->quantity_shipped - $this->quantity_received);
}

/**
 * Mark step as shipped.
 */
public function markAsShipped(float $quantity, ?string $notes = null): void
{
    if (!$this->canMarkAsShipped()) {
        throw new \Exception('Cannot mark step as shipped in current state');
    }

    $this->update([
        'external_status' => 'shipped',
        'shipped_date' => now(),
        'status' => 'in_progress', // Update main status too
        'actual_start_time' => $this->actual_start_time ?? now(),
    ]);

    $this->increment('quantity_shipped', $quantity);

    // Log activity
    activity()
        ->performedOn($this)
        ->causedBy(auth()->user())
        ->withProperties([
            'quantity' => $quantity,
            'notes' => $notes,
            'manufacturer_id' => $this->manufacturer_id,
        ])
        ->log('Step marked as shipped');
}

/**
 * Mark step as in process at manufacturer.
 */
public function markAsInProcess(?string $notes = null): void
{
    if (!$this->canMarkAsInProcess()) {
        throw new \Exception('Cannot mark step as in process in current state');
    }

    $this->update([
        'external_status' => 'in_process',
    ]);

    // Log activity
    activity()
        ->performedOn($this)
        ->causedBy(auth()->user())
        ->withProperties([
            'notes' => $notes,
            'manufacturer_id' => $this->manufacturer_id,
        ])
        ->log('Step marked as in process at manufacturer');
}

/**
 * Record quantity received from manufacturer.
 * Called by Logistics Module when shipment is received.
 * 
 * This increments quantity_received and marks step as completed when done.
 */
public function recordQuantityReceived(float $quantity, ?string $notes = null): void
{
    if (!$this->isExternal()) {
        throw new \Exception('Cannot record received quantity for non-external step');
    }

    $this->increment('quantity_received', $quantity);

    // Update received_date (timestamp of last receipt)
    $this->update(['received_date' => now()]);

    // If all shipped quantity is received, mark step as COMPLETED
    if ($this->quantity_received >= $this->quantity_shipped) {
        // Step is COMPLETE - same as internal steps
        $this->update([
            'status' => 'completed',
            'actual_end_time' => now(),
            // external_status stays 'in_process' (or we could clear it)
        ]);

        // Log completion
        activity()
            ->performedOn($this)
            ->causedBy(auth()->user())
            ->withProperties([
                'quantity_received' => $quantity,
                'total_received' => $this->quantity_received,
                'notes' => $notes,
            ])
            ->log('External step completed - all quantities received');

        // Check if next step can be activated
        $this->checkNextStepActivation();
    } else {
        // Partial receipt - log but don't complete
        activity()
            ->performedOn($this)
            ->causedBy(auth()->user())
            ->withProperties([
                'quantity_received' => $quantity,
                'total_received' => $this->quantity_received,
                'remaining' => $this->quantity_shipped - $this->quantity_received,
                'notes' => $notes,
            ])
            ->log('Partial receipt recorded for external step');
    }
}

/**
 * Get estimated duration for external steps.
 * Uses lead time instead of setup/cycle time.
 */
public function getEstimatedDuration(): int
{
    if ($this->isExternal() && $this->expected_lead_time_days) {
        return $this->expected_lead_time_days * 24 * 60 * 60; // Convert days to seconds
    }

    return parent::getEstimatedDuration();
}
```

#### 3.1.7 Update Boot Method

```php
protected static function boot()
{
    parent::boot();

    static::saving(function ($step) {
        // Existing template handling...

        // External step validation
        if ($step->execution_location === 'external') {
            // Initialize external status for new external steps
            if (!$step->external_status && $step->status === 'pending') {
                $step->external_status = 'awaiting_shipment';
            }
        } else {
            // Clear external fields for internal steps
            $step->manufacturer_id = null;
            $step->expected_lead_time_days = null;
            $step->external_status = null;
            $step->shipped_date = null;
            $step->received_date = null;
            $step->quantity_shipped = 0;
            $step->quantity_received = 0;
        }
    });
}
```

### 3.2 Manufacturer Model Updates

**File**: `app/Models/Production/Manufacturer.php`

```php
/**
 * Get all manufacturing steps assigned to this manufacturer.
 */
public function manufacturingSteps(): HasMany
{
    return $this->hasMany(\App\Models\Production\ManufacturingStep::class);
}

/**
 * Get active steps at this manufacturer.
 */
public function activeSteps()
{
    return $this->manufacturingSteps()
        ->whereIn('external_status', ['shipped', 'in_process'])
        ->with(['manufacturingRoute.manufacturingOrder']);
}

/**
 * Get steps awaiting shipment to this manufacturer.
 */
public function stepsAwaitingShipment()
{
    return $this->manufacturingSteps()
        ->where('external_status', 'awaiting_shipment')
        ->with(['manufacturingRoute.manufacturingOrder']);
}
```

---

## 4. Backend Services

### 4.1 ExternalStepService

**File**: `app/Services/Production/ExternalStepService.php`

```php
<?php

namespace App\Services\Production;

use App\Models\Production\ManufacturingStep;
use Illuminate\Support\Facades\DB;

class ExternalStepService
{
    /**
     * Mark a step as shipped with quantity.
     */
    public function markAsShipped(
        ManufacturingStep $step, 
        float $quantity,
        ?string $notes = null,
        array $photos = []
    ): ManufacturingStep {
        if (!$step->canMarkAsShipped()) {
            throw new \Exception('Step cannot be marked as shipped in current state');
        }

        DB::transaction(function () use ($step, $quantity, $notes, $photos) {
            $step->markAsShipped($quantity, $notes);

            // Handle photos if provided
            if (!empty($photos)) {
                foreach ($photos as $photo) {
                    $step->addMedia($photo)
                        ->withCustomProperties(['type' => 'shipment'])
                        ->toMediaCollection('external_step_photos');
                }
            }
        });

        return $step->fresh(['manufacturer', 'manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Mark a step as in process at manufacturer.
     */
    public function markAsInProcess(
        ManufacturingStep $step,
        ?string $notes = null
    ): ManufacturingStep {
        if (!$step->canMarkAsInProcess()) {
            throw new \Exception('Step cannot be marked as in process in current state');
        }

        $step->markAsInProcess($notes);

        return $step->fresh(['manufacturer', 'manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Record quantity received for a step.
     * 
     * NOTE: This is typically called by the Logistics Module when a shipment
     * is marked as received. Direct calls to this service are for cases where
     * items are received without formal shipment tracking.
     */
    public function recordQuantityReceived(
        ManufacturingStep $step,
        float $quantity,
        ?string $notes = null,
        array $photos = []
    ): ManufacturingStep {
        if (!$step->isExternal()) {
            throw new \Exception('Can only record received quantity for external steps');
        }

        DB::transaction(function () use ($step, $quantity, $notes, $photos) {
            $step->recordQuantityReceived($quantity, $notes);

            // Handle photos if provided (these go on the step, not the shipment)
            if (!empty($photos)) {
                foreach ($photos as $photo) {
                    $step->addMedia($photo)
                        ->withCustomProperties(['type' => 'receipt'])
                        ->toMediaCollection('external_step_photos');
                }
            }
        });

        return $step->fresh(['manufacturer', 'manufacturingRoute.manufacturingOrder']);
    }

    /**
     * Get all steps awaiting shipment.
     */
    public function getStepsAwaitingShipment()
    {
        return ManufacturingStep::awaitingShipment()
            ->with([
                'manufacturer',
                'manufacturingRoute.manufacturingOrder.item',
                'workCell'
            ])
            ->orderBy('scheduled_start')
            ->get();
    }

    /**
     * Get all steps currently at manufacturers.
     */
    public function getStepsAtManufacturers()
    {
        return ManufacturingStep::atManufacturer()
            ->with([
                'manufacturer',
                'manufacturingRoute.manufacturingOrder.item',
                'workCell'
            ])
            ->orderBy('shipped_date')
            ->get();
    }

    /**
     * Get steps by manufacturer.
     */
    public function getStepsByManufacturer(int $manufacturerId)
    {
        return ManufacturingStep::external()
            ->where('manufacturer_id', $manufacturerId)
            ->whereNotIn('external_status', ['received'])
            ->with([
                'manufacturingRoute.manufacturingOrder.item',
                'workCell'
            ])
            ->orderBy('external_status')
            ->orderBy('scheduled_start')
            ->get();
    }

    /**
     * Validate if step can transition to external.
     */
    public function validateExternalTransition(ManufacturingStep $step): array
    {
        $issues = [];

        // Check if step is already started
        if (in_array($step->status, ['in_progress', 'completed'])) {
            $issues[] = 'Cannot convert to external: step is already in progress or completed';
        }

        // Check if there are any completed executions
        if ($step->executions()->where('status', 'completed')->exists()) {
            $issues[] = 'Cannot convert to external: step has completed executions';
        }

        return $issues;
    }

    /**
     * Convert an internal step to external.
     */
    public function convertToExternal(
        ManufacturingStep $step,
        int $manufacturerId,
        ?int $expectedLeadTimeDays = null
    ): ManufacturingStep {
        $issues = $this->validateExternalTransition($step);

        if (!empty($issues)) {
            throw new \Exception('Cannot convert to external: ' . implode('; ', $issues));
        }

        $step->update([
            'execution_location' => 'external',
            'manufacturer_id' => $manufacturerId,
            'expected_lead_time_days' => $expectedLeadTimeDays,
            'external_status' => 'awaiting_shipment',
            // Clear internal-specific times if using lead time
            'setup_time_seconds' => 0,
            'cycle_time_seconds' => 0,
            'use_workcell_throughput' => false,
        ]);

        activity()
            ->performedOn($step)
            ->causedBy(auth()->user())
            ->withProperties([
                'manufacturer_id' => $manufacturerId,
                'expected_lead_time_days' => $expectedLeadTimeDays,
            ])
            ->log('Step converted to external execution');

        return $step->fresh(['manufacturer']);
    }
}
```

---

## 5. Backend Controllers & Routes

### 5.1 ExternalStepController

**File**: `app/Http/Controllers/Production/ExternalStepController.php`

```php
<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Manufacturer;
use App\Services\Production\ExternalStepService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExternalStepController extends Controller
{
    public function __construct(
        protected ExternalStepService $externalStepService
    ) {}

    /**
     * Display external steps dashboard.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', ManufacturingStep::class);

        $awaitingShipment = $this->externalStepService->getStepsAwaitingShipment();
        $atManufacturers = $this->externalStepService->getStepsAtManufacturers();

        return Inertia::render('production/external-steps/index', [
            'awaitingShipment' => $awaitingShipment,
            'atManufacturers' => $atManufacturers,
            'manufacturers' => Manufacturer::select('id', 'name')->get(),
        ]);
    }

    /**
     * Mark step as shipped.
     */
    public function markAsShipped(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
            'photos' => 'nullable|array|max:5',
            'photos.*' => 'image|max:10240', // 10MB max per photo
        ]);

        try {
            $step = $this->externalStepService->markAsShipped(
                $step,
                $validated['quantity'],
                $validated['notes'] ?? null,
                $request->file('photos') ?? []
            );

            return back()->with('success', 'Step marked as shipped successfully');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Mark step as in process.
     */
    public function markAsInProcess(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $step = $this->externalStepService->markAsInProcess(
                $step,
                $validated['notes'] ?? null
            );

            return back()->with('success', 'Step marked as in process');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Record quantity received (typically called from Logistics Module).
     * 
     * This endpoint exists for direct receipt recording without formal shipment,
     * but normally the Logistics Module handles this automatically.
     */
    public function recordQuantityReceived(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
            'photos' => 'nullable|array|max:5',
            'photos.*' => 'image|max:10240', // 10MB max per photo
        ]);

        try {
            $step = $this->externalStepService->recordQuantityReceived(
                $step,
                $validated['quantity'],
                $validated['notes'] ?? null,
                $request->file('photos') ?? []
            );

            $message = $step->status === 'completed' 
                ? 'Step completed - all quantities received'
                : 'Quantity received - awaiting remaining items';

            return back()->with('success', $message);
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Convert step to external.
     */
    public function convertToExternal(Request $request, ManufacturingStep $step)
    {
        $this->authorize('update', $step);

        $validated = $request->validate([
            'manufacturer_id' => 'required|exists:manufacturers,id',
            'expected_lead_time_days' => 'nullable|integer|min:1',
        ]);

        try {
            $step = $this->externalStepService->convertToExternal(
                $step,
                $validated['manufacturer_id'],
                $validated['expected_lead_time_days'] ?? null
            );

            return back()->with('success', 'Step converted to external execution');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
```

### 5.2 Routes

**File**: `routes/production.php` (or wherever production routes are defined)

```php
use App\Http\Controllers\Production\ExternalStepController;

Route::middleware(['auth', 'tenant'])->group(function () {
    // External steps dashboard
    Route::get('/external-steps', [ExternalStepController::class, 'index'])
        ->name('production.external-steps.index');

    // External step actions
    Route::post('/steps/{step}/mark-as-shipped', [ExternalStepController::class, 'markAsShipped'])
        ->name('production.steps.mark-as-shipped');

    Route::post('/steps/{step}/mark-as-in-process', [ExternalStepController::class, 'markAsInProcess'])
        ->name('production.steps.mark-as-in-process');

    Route::post('/steps/{step}/record-quantity-received', [ExternalStepController::class, 'recordQuantityReceived'])
        ->name('production.steps.record-quantity-received');

    Route::post('/steps/{step}/convert-to-external', [ExternalStepController::class, 'convertToExternal'])
        ->name('production.steps.convert-to-external');
});
```

---

## 6. Frontend Type Definitions

### 6.1 Production Types

**File**: `resources/js/types/production.ts`

```typescript
export type ExecutionLocation = 'internal' | 'external';

export type ExternalStatus = 
    | 'awaiting_shipment' 
    | 'shipped' 
    | 'in_process';
    // NOTE: No 'received' - external steps complete with status='completed'
    // Physical receipt is tracked separately in Shipment.status

export interface ManufacturingStep {
    // ... existing fields
    
    // External execution fields
    execution_location: ExecutionLocation;
    manufacturer_id: number | null;
    manufacturer?: Manufacturer;
    expected_lead_time_days: number | null;
    external_status: ExternalStatus | null;
    shipped_date: string | null;
    received_date: string | null;
    quantity_shipped: number;
    quantity_received: number;
    
    // Computed attributes
    remaining_quantity_to_ship?: number;
    remaining_quantity_to_receive?: number;
}

export interface Manufacturer {
    id: number;
    name: string;
    code?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ExternalStepStatusUpdate {
    step_id: number;
    quantity: number;
    notes?: string;
    photos?: File[];
}
```

### 6.2 Constants

**File**: `resources/js/constants/production.ts`

```typescript
export const EXECUTION_LOCATIONS = {
    internal: 'Internal',
    external: 'External',
} as const;

export const EXTERNAL_STATUSES = {
    awaiting_shipment: 'Awaiting Shipment',
    shipped: 'Shipped',
    in_process: 'In Process at Manufacturer',
} as const;

export const EXTERNAL_STATUS_COLORS = {
    awaiting_shipment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_process: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
} as const;

// For step completion status (same for internal and external steps)
export const STEP_STATUSES = {
    pending: 'Pending',
    queued: 'Queued',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    awaiting_quality: 'Awaiting Quality',
    completed: 'Completed',
    skipped: 'Skipped',
    cancelled: 'Cancelled',
} as const;
```

---

## 7. Frontend UI Components

### 7.1 ExternalStepBadge Component

**File**: `resources/js/components/production/ExternalStepBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { ExternalStatus } from '@/types/production';
import { EXTERNAL_STATUSES, EXTERNAL_STATUS_COLORS } from '@/constants/production';
import { cn } from '@/lib/utils';

interface ExternalStepBadgeProps {
    status: ExternalStatus;
    className?: string;
}

export function ExternalStepBadge({ status, className }: ExternalStepBadgeProps) {
    return (
        <Badge 
            className={cn(
                EXTERNAL_STATUS_COLORS[status],
                className
            )}
        >
            {EXTERNAL_STATUSES[status]}
        </Badge>
    );
}
```

### 7.2 Update StepPropertiesPanel

**File**: `resources/js/components/production/StepPropertiesPanel.tsx`

Add new section for external execution:

```typescript
// Add to imports
import { ItemSelect } from '@/components/ItemSelect';
import { Manufacturer } from '@/types/production';
import { Truck } from 'lucide-react';

// Add to Props interface
interface Props {
    // ... existing props
    manufacturers?: Manufacturer[];
}

// Add to component body (after Time Settings section)

{/* Execution Location */}
<div className="space-y-4">
    <h3 className="text-lg font-medium">Local de Execução</h3>
    <div className="space-y-3">
        <StateButton
            icon={Building}
            title="Execução Interna"
            description="Executado nas suas instalações"
            selected={stepForm.data.execution_location === 'internal'}
            onClick={() => {
                stepForm.setData('execution_location', 'internal');
                if (displayStep) {
                    onLocalStepUpdate(displayStep.id, { 
                        execution_location: 'internal',
                        manufacturer_id: null,
                        expected_lead_time_days: null,
                    });
                }
            }}
            disabled={isSaving || viewMode}
        />

        <StateButton
            icon={Truck}
            title="Execução Externa"
            description="Executado por fabricante terceirizado"
            selected={stepForm.data.execution_location === 'external'}
            onClick={() => {
                stepForm.setData('execution_location', 'external');
                if (displayStep) {
                    onLocalStepUpdate(displayStep.id, { 
                        execution_location: 'external' 
                    });
                }
            }}
            disabled={isSaving || viewMode}
        />

        {stepForm.data.execution_location === 'external' && (
            <div className="border-l border-gray-200">
                <div className="ml-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Fabricante</Label>
                        <ItemSelect
                            items={manufacturers?.map(m => ({
                                id: m.id,
                                name: m.name,
                            })) || []}
                            value={stepForm.data.manufacturer_id?.toString() || ''}
                            onValueChange={(value) => {
                                stepForm.setData('manufacturer_id', value ? parseInt(value) : null);
                                if (displayStep) {
                                    const selectedManufacturer = value 
                                        ? manufacturers?.find(m => m.id === parseInt(value))
                                        : undefined;
                                    onLocalStepUpdate(displayStep.id, {
                                        manufacturer_id: value ? parseInt(value) : null,
                                        manufacturer: selectedManufacturer
                                    });
                                }
                            }}
                            placeholder="Selecione um fabricante..."
                            disabled={viewMode}
                            canClear={!viewMode}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Lead Time Esperado (dias)</Label>
                        <Input
                            type="number"
                            min="1"
                            value={stepForm.data.expected_lead_time_days || ''}
                            onChange={(e) => {
                                const value = parseInt(e.target.value) || null;
                                stepForm.setData('expected_lead_time_days', value);
                                if (displayStep) {
                                    onLocalStepUpdate(displayStep.id, { 
                                        expected_lead_time_days: value 
                                    });
                                }
                            }}
                            disabled={viewMode}
                            placeholder="Ex: 10"
                        />
                        <p className="text-xs text-muted-foreground">
                            Tempo estimado para o fabricante processar e retornar os itens
                        </p>
                    </div>

                    {stepForm.data.manufacturer_id && (
                        <div className="bg-muted rounded-lg p-3">
                            <p className="text-sm">
                                <span className="text-muted-foreground">Fabricante:</span>{' '}
                                <span className="font-medium">
                                    {manufacturers?.find(m => m.id === parseInt(stepForm.data.manufacturer_id))?.name}
                                </span>
                            </p>
                            {stepForm.data.expected_lead_time_days && (
                                <p className="text-sm mt-1">
                                    <span className="text-muted-foreground">Lead Time:</span>{' '}
                                    <span className="font-medium">
                                        {stepForm.data.expected_lead_time_days} dias
                                    </span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
</div>
```

### 7.3 StepCard Updates

**File**: `resources/js/components/production/StepCard.tsx`

Update to show external step information:

```typescript
import { ExternalStepBadge } from './ExternalStepBadge';
import { StepStatusBadge } from './StepStatusBadge';
import { Truck } from 'lucide-react';

// In the card body, show BOTH main status and external status
<div className="flex items-center gap-2">
    <StepStatusBadge status={step.status} />  {/* completed, in_progress, etc. */}
    {step.execution_location === 'external' && step.external_status && (
        <ExternalStepBadge status={step.external_status} />  {/* shipped, in_process */}
    )}
</div>

// Additional external step info
{step.execution_location === 'external' && (
    <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Truck className="h-3 w-3" />
            <span>{step.manufacturer?.name || 'Fabricante não atribuído'}</span>
        </div>
        {step.expected_lead_time_days && (
            <div className="text-xs text-muted-foreground">
                Lead time: {step.expected_lead_time_days} dias
            </div>
        )}
        {/* Show shipment tracking */}
        {step.quantity_shipped > 0 && (
            <div className="text-xs">
                Enviado: {step.quantity_shipped} | Recebido: {step.quantity_received}
            </div>
        )}
    </div>
)}
```

**Example Displays:**

**Internal Step:**
```
[In Progress]
Assembly
Work Cell: Cell A
```

**External Step (In Transit):**
```
[In Progress] [Shipped]
Heat Treatment
Manufacturer: ABC Heat Treating
Enviado: 100 | Recebido: 0
```

**External Step (Completed):**
```
[Completed] [In Process]  ← Notice: Step is complete, but external_status stays
Heat Treatment
Manufacturer: ABC Heat Treating
Enviado: 100 | Recebido: 100
```

### 7.4 External Step Status Update Dialog

**File**: `resources/js/components/production/ExternalStepStatusDialog.tsx`

**IMPORTANT NOTE**: The "receive" action is typically handled by the Logistics Module
when marking a shipment as received. This dialog is for direct updates when not using
formal shipment tracking.

```typescript
import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ManufacturingStep, ExternalStatus } from '@/types/production';
import { Upload, X } from 'lucide-react';

interface ExternalStepStatusDialogProps {
    step: ManufacturingStep;
    action: 'ship' | 'in-process' | 'record-receipt';  // Changed 'receive' to 'record-receipt'
    isOpen: boolean;
    onClose: () => void;
}

export function ExternalStepStatusDialog({
    step,
    action,
    isOpen,
    onClose,
}: ExternalStepStatusDialogProps) {
    const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        quantity: action === 'ship' 
            ? step.remaining_quantity_to_ship 
            : action === 'receive' 
                ? step.remaining_quantity_to_receive 
                : 0,
        notes: '',
        photos: [] as File[],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const routeName = {
            ship: 'production.steps.mark-as-shipped',
            'in-process': 'production.steps.mark-as-in-process',
            'record-receipt': 'production.steps.record-quantity-received',  // Updated route name
        }[action];

        post(route(routeName, step.id), {
            onSuccess: () => {
                onClose();
                setSelectedPhotos([]);
            },
        });
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newPhotos = [...selectedPhotos, ...files].slice(0, 5);
        setSelectedPhotos(newPhotos);
        setData('photos', newPhotos);
    };

    const removePhoto = (index: number) => {
        const newPhotos = selectedPhotos.filter((_, i) => i !== index);
        setSelectedPhotos(newPhotos);
        setData('photos', newPhotos);
    };

    const getTitle = () => {
        switch (action) {
            case 'ship': return 'Marcar como Enviado';
            case 'in-process': return 'Marcar como Em Processamento';
            case 'record-receipt': return 'Registrar Recebimento';
        }
    };

    const showQuantity = action === 'ship' || action === 'record-receipt';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Quantity Input (for ship/receive) */}
                    {showQuantity && (
                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={action === 'ship' 
                                    ? step.remaining_quantity_to_ship 
                                    : step.remaining_quantity_to_receive}
                                value={data.quantity}
                                onChange={(e) => setData('quantity', parseFloat(e.target.value))}
                                required
                            />
                            {errors.quantity && (
                                <p className="text-sm text-destructive">{errors.quantity}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {action === 'ship' 
                                    ? `Restante para enviar: ${step.remaining_quantity_to_ship}` 
                                    : `Restante para receber: ${step.remaining_quantity_to_receive}`}
                            </p>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notas (opcional)</Label>
                        <Textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Adicione informações relevantes..."
                        />
                        {errors.notes && (
                            <p className="text-sm text-destructive">{errors.notes}</p>
                        )}
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-2">
                        <Label>Fotos (opcional, máx. 5)</Label>
                        <div className="border-2 border-dashed rounded-lg p-4">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoSelect}
                                className="hidden"
                                id="photo-upload"
                                disabled={selectedPhotos.length >= 5}
                            />
                            <label
                                htmlFor="photo-upload"
                                className="flex flex-col items-center gap-2 cursor-pointer"
                            >
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Clique para selecionar fotos
                                </span>
                            </label>
                        </div>

                        {/* Photo Preview */}
                        {selectedPhotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {selectedPhotos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={URL.createObjectURL(photo)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-20 object-cover rounded"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {errors.photos && (
                            <p className="text-sm text-destructive">{errors.photos}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Salvando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

### 7.5 External Steps Dashboard Page

**File**: `resources/js/pages/production/external-steps/index.tsx`

```typescript
import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { ManufacturingStep, Manufacturer } from '@/types/production';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalStepBadge } from '@/components/production/ExternalStepBadge';
import { ExternalStepStatusDialog } from '@/components/production/ExternalStepStatusDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, Factory } from 'lucide-react';

interface Props {
    awaitingShipment: ManufacturingStep[];
    atManufacturers: ManufacturingStep[];
    manufacturers: Manufacturer[];
}

export default function ExternalStepsIndex({
    awaitingShipment,
    atManufacturers,
    manufacturers,
}: Props) {
    const [selectedStep, setSelectedStep] = useState<ManufacturingStep | null>(null);
    const [dialogAction, setDialogAction] = useState<'ship' | 'in-process' | 'receive' | null>(null);

    const openDialog = (step: ManufacturingStep, action: typeof dialogAction) => {
        setSelectedStep(step);
        setDialogAction(action);
    };

    const closeDialog = () => {
        setSelectedStep(null);
        setDialogAction(null);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Etapas Externas" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Etapas Externas</h1>
                </div>

                <Tabs defaultValue="awaiting" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="awaiting" className="gap-2">
                            <Package className="h-4 w-4" />
                            Aguardando Envio ({awaitingShipment.length})
                        </TabsTrigger>
                        <TabsTrigger value="at-manufacturer" className="gap-2">
                            <Factory className="h-4 w-4" />
                            No Fabricante ({atManufacturers.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="awaiting" className="space-y-4">
                        {awaitingShipment.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Nenhuma etapa aguardando envio
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            awaitingShipment.map((step) => (
                                <Card key={step.id}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {step.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-sm text-muted-foreground">
                                                        OM: {step.manufacturing_route?.manufacturing_order?.order_number}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Item: {step.manufacturing_route?.manufacturing_order?.item?.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <ExternalStepBadge status={step.external_status!} />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Fabricante:</span>
                                                    <p className="font-medium">
                                                        {step.manufacturer?.name || 'Não atribuído'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Quantidade:</span>
                                                    <p className="font-medium">
                                                        {step.remaining_quantity_to_ship} unidades
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={() => openDialog(step, 'ship')}
                                                    disabled={!step.manufacturer_id}
                                                >
                                                    <Truck className="h-4 w-4 mr-2" />
                                                    Marcar como Enviado
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="at-manufacturer" className="space-y-4">
                        {atManufacturers.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Factory className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Nenhuma etapa no fabricante
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            atManufacturers.map((step) => (
                                <Card key={step.id}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {step.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-sm text-muted-foreground">
                                                        OM: {step.manufacturing_route?.manufacturing_order?.order_number}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Item: {step.manufacturing_route?.manufacturing_order?.item?.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <ExternalStepBadge status={step.external_status!} />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Fabricante:</span>
                                                    <p className="font-medium">{step.manufacturer?.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Enviado em:</span>
                                                    <p className="font-medium">
                                                        {step.shipped_date 
                                                            ? new Date(step.shipped_date).toLocaleDateString('pt-BR')
                                                            : '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Aguardando recebimento:</span>
                                                    <p className="font-medium">
                                                        {step.remaining_quantity_to_receive} unidades
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                {step.external_status === 'shipped' && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => openDialog(step, 'in-process')}
                                                    >
                                                        Marcar Em Processamento
                                                    </Button>
                                                )}
                                {step.external_status === 'in_process' && (
                                    <>
                                        <Button
                                            onClick={() => openDialog(step, 'record-receipt')}
                                            variant="outline"
                                        >
                                            <Package className="h-4 w-4 mr-2" />
                                            Registrar Recebimento Direto
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Normalmente, use o Módulo de Logística para registrar recebimentos
                                        </p>
                                    </>
                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Status Update Dialog */}
            {selectedStep && dialogAction && (
                <ExternalStepStatusDialog
                    step={selectedStep}
                    action={dialogAction}
                    isOpen={!!dialogAction}
                    onClose={closeDialog}
                />
            )}
        </AuthenticatedLayout>
    );
}
```

---

## 8. State Management

No specific Zustand stores needed initially. Standard Inertia state management is sufficient.

If you need real-time updates for external steps, consider adding:

**File**: `resources/js/stores/useExternalStepsStore.ts`

```typescript
import { create } from 'zustand';
import { ManufacturingStep } from '@/types/production';

interface ExternalStepsStore {
    awaitingShipment: ManufacturingStep[];
    atManufacturers: ManufacturingStep[];
    setAwaitingShipment: (steps: ManufacturingStep[]) => void;
    setAtManufacturers: (steps: ManufacturingStep[]) => void;
    updateStepStatus: (stepId: number, updates: Partial<ManufacturingStep>) => void;
}

export const useExternalStepsStore = create<ExternalStepsStore>((set) => ({
    awaitingShipment: [],
    atManufacturers: [],
    
    setAwaitingShipment: (steps) => set({ awaitingShipment: steps }),
    
    setAtManufacturers: (steps) => set({ atManufacturers: steps }),
    
    updateStepStatus: (stepId, updates) => set((state) => ({
        awaitingShipment: state.awaitingShipment.map(step =>
            step.id === stepId ? { ...step, ...updates } : step
        ),
        atManufacturers: state.atManufacturers.map(step =>
            step.id === stepId ? { ...step, ...updates } : step
        ),
    })),
}));
```

---

## 9. Scheduler Integration

The scheduler module should use external step data as follows:

### 9.1 Time Calculations

```php
// In ProductionSchedulingService or similar

protected function calculateStepDuration(ManufacturingStep $step): int
{
    if ($step->execution_location === 'external') {
        // Use lead time for external steps (in seconds)
        if ($step->expected_lead_time_days) {
            return $step->expected_lead_time_days * 24 * 60 * 60;
        }
        // Default to 7 days if not specified
        return 7 * 24 * 60 * 60;
    }
    
    // Internal step - use setup + cycle time
    $quantity = $step->manufacturingRoute->manufacturingOrder->quantity;
    return $step->setup_time_seconds + ($step->cycle_time_seconds * $quantity);
}

protected function calculateStepStartDate(ManufacturingStep $step): Carbon
{
    // If step has been shipped, use shipped_date as actual start
    if ($step->shipped_date) {
        return Carbon::parse($step->shipped_date);
    }
    
    // Otherwise calculate based on dependencies
    // ... existing dependency logic
}

protected function calculateStepEndDate(ManufacturingStep $step): Carbon
{
    // If external and received, use received_date as actual end
    if ($step->execution_location === 'external' && $step->received_date) {
        return Carbon::parse($step->received_date);
    }
    
    $startDate = $this->calculateStepStartDate($step);
    $duration = $this->calculateStepDuration($step);
    
    return $startDate->addSeconds($duration);
}
```

### 9.2 Capacity Planning

External steps don't consume internal work cell capacity, so exclude them:

```php
protected function getWorkCellCapacity(WorkCell $workCell, Carbon $date): float
{
    // Get all steps scheduled for this work cell on this date
    $steps = ManufacturingStep::where('work_cell_id', $workCell->id)
        ->where('execution_location', 'internal') // Exclude external steps
        ->whereDate('scheduled_start', '<=', $date)
        ->whereDate('scheduled_end', '>=', $date)
        ->get();
    
    // ... capacity calculation
}
```

---

## 10. Testing Requirements

### 10.1 Unit Tests

**File**: `tests/Unit/Production/ManufacturingStepTest.php`

```php
<?php

namespace Tests\Unit\Production;

use Tests\TestCase;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Manufacturer;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ManufacturingStepTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function external_step_initializes_with_awaiting_shipment_status()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'status' => 'pending',
        ]);

        $this->assertEquals('awaiting_shipment', $step->external_status);
    }

    /** @test */
    public function internal_step_clears_external_fields()
    {
        $manufacturer = Manufacturer::factory()->create();
        
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'manufacturer_id' => $manufacturer->id,
            'expected_lead_time_days' => 10,
        ]);

        $step->update(['execution_location' => 'internal']);

        $this->assertNull($step->manufacturer_id);
        $this->assertNull($step->expected_lead_time_days);
        $this->assertNull($step->external_status);
    }

    /** @test */
    public function can_mark_external_step_as_shipped()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => Manufacturer::factory()->create()->id,
        ]);

        $step->markAsShipped(50, 'Shipped via UPS');

        $this->assertEquals('shipped', $step->external_status);
        $this->assertEquals(50, $step->quantity_shipped);
        $this->assertNotNull($step->shipped_date);
    }

    /** @test */
    public function cannot_skip_external_status_progression()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => Manufacturer::factory()->create()->id,
        ]);

        $this->expectException(\Exception::class);
        $step->markAsReceived(50);
    }

    /** @test */
    public function calculates_remaining_quantity_to_ship_correctly()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'quantity_shipped' => 30,
        ]);

        $step->manufacturingRoute->manufacturingOrder->update(['quantity' => 100]);

        $this->assertEquals(70, $step->remaining_quantity_to_ship);
    }

    /** @test */
    public function external_step_uses_lead_time_for_duration()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'expected_lead_time_days' => 5,
        ]);

        $expectedDuration = 5 * 24 * 60 * 60; // 5 days in seconds
        $this->assertEquals($expectedDuration, $step->getEstimatedDuration());
    }
}
```

### 10.2 Feature Tests

**File**: `tests/Feature/Production/ExternalStepWorkflowTest.php`

```php
<?php

namespace Tests\Feature\Production;

use Tests\TestCase;
use App\Models\User;
use App\Models\Production\ManufacturingStep;
use App\Models\Production\Manufacturer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ExternalStepWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function user_can_view_external_steps_dashboard()
    {
        $this->actingAs($this->user)
            ->get(route('production.external-steps.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('production/external-steps/index')
                ->has('awaitingShipment')
                ->has('atManufacturers')
            );
    }

    /** @test */
    public function user_can_mark_step_as_shipped_with_photos()
    {
        Storage::fake('public');

        $manufacturer = Manufacturer::factory()->create();
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => $manufacturer->id,
        ]);

        $photo = UploadedFile::fake()->image('shipment.jpg');

        $this->actingAs($this->user)
            ->post(route('production.steps.mark-as-shipped', $step), [
                'quantity' => 50,
                'notes' => 'Shipped today',
                'photos' => [$photo],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $step->refresh();
        $this->assertEquals('shipped', $step->external_status);
        $this->assertEquals(50, $step->quantity_shipped);
        $this->assertCount(1, $step->getMedia('external_step_photos'));
    }

    /** @test */
    public function user_cannot_skip_status_progression()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'awaiting_shipment',
            'manufacturer_id' => Manufacturer::factory()->create()->id,
        ]);

        $this->actingAs($this->user)
            ->post(route('production.steps.mark-as-received', $step), [
                'quantity' => 50,
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $step->refresh();
        $this->assertEquals('awaiting_shipment', $step->external_status);
    }

    /** @test */
    public function step_completes_when_all_quantity_received()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'in_process',
            'status' => 'in_progress',
            'quantity_shipped' => 100,
        ]);

        $step->manufacturingRoute->manufacturingOrder->update(['quantity' => 100]);

        // This would typically be called by ShipmentService::markAsReceived()
        $step->recordQuantityReceived(100, 'All items returned from manufacturer');

        $step->refresh();
        // external_status stays 'in_process' (or could be cleared)
        $this->assertEquals('in_process', $step->external_status);
        // Main status is COMPLETED - same as internal steps
        $this->assertEquals('completed', $step->status);
        $this->assertNotNull($step->actual_end_time);
    }
    
    /** @test */
    public function partial_receipt_does_not_complete_step()
    {
        $step = ManufacturingStep::factory()->create([
            'execution_location' => 'external',
            'external_status' => 'in_process',
            'status' => 'in_progress',
            'quantity_shipped' => 100,
            'quantity_received' => 0,
        ]);

        // Receive only 50 out of 100
        $step->recordQuantityReceived(50, 'First batch returned');

        $step->refresh();
        $this->assertEquals('in_process', $step->external_status);
        $this->assertEquals('in_progress', $step->status);  // Still in progress!
        $this->assertEquals(50, $step->quantity_received);
        $this->assertNull($step->actual_end_time);
    }
}
```

---

## 11. Migration Strategy

### 11.1 Fresh Installations

Simply run the migration:

```bash
php artisan migrate
```

### 11.2 Existing Data

For tenants with existing manufacturing steps:

**File**: `database/migrations/tenant/YYYY_MM_DD_HHMMSS_add_external_execution_to_manufacturing_steps.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manufacturing_steps', function (Blueprint $table) {
            // Execution location
            $table->enum('execution_location', ['internal', 'external'])
                ->default('internal')
                ->after('step_type')
                ->comment('Where the step is executed');

            // External manufacturer
            $table->foreignId('manufacturer_id')
                ->nullable()
                ->after('execution_location')
                ->constrained('manufacturers')
                ->nullOnDelete()
                ->comment('Third-party manufacturer (for external steps)');

            // Lead time
            $table->integer('expected_lead_time_days')
                ->nullable()
                ->after('manufacturer_id')
                ->comment('Expected turnaround time at manufacturer (days)');

            // External status
            $table->enum('external_status', [
                'awaiting_shipment', 
                'shipped', 
                'in_process', 
                'received'
            ])
                ->nullable()
                ->after('expected_lead_time_days')
                ->comment('Status for external steps only');

            // Shipping dates
            $table->timestamp('shipped_date')
                ->nullable()
                ->after('external_status')
                ->comment('When items were shipped to manufacturer');

            $table->timestamp('received_date')
                ->nullable()
                ->after('shipped_date')
                ->comment('When items were received from manufacturer');

            // Quantity tracking
            $table->decimal('quantity_shipped', 10, 2)
                ->default(0)
                ->after('received_date')
                ->comment('Total quantity shipped (sum of all shipments)');

            $table->decimal('quantity_received', 10, 2)
                ->default(0)
                ->after('quantity_shipped')
                ->comment('Total quantity received (sum of all receipts)');

            // Indexes
            $table->index('execution_location');
            $table->index('external_status');
            $table->index('manufacturer_id');
        });
    }

    public function down(): void
    {
        Schema::table('manufacturing_steps', function (Blueprint $table) {
            $table->dropForeign(['manufacturer_id']);
            $table->dropIndex(['execution_location']);
            $table->dropIndex(['external_status']);
            $table->dropIndex(['manufacturer_id']);
            
            $table->dropColumn([
                'execution_location',
                'manufacturer_id',
                'expected_lead_time_days',
                'external_status',
                'shipped_date',
                'received_date',
                'quantity_shipped',
                'quantity_received',
            ]);
        });
    }
};
```

### 11.3 Rollback Plan

If issues arise:

1. External steps will become internal automatically (default value)
2. No data loss - external fields simply nulled
3. Can re-run migration after fixing issues

---

## 12. Implementation Checklist

### Backend
- [ ] Create migration file
- [ ] Run migration on test database
- [ ] Update `ManufacturingStep` model (constants, fillable, casts, relationships)
- [ ] Add helper methods to `ManufacturingStep` model
- [ ] Create `ExternalStepService`
- [ ] Create `ExternalStepController`
- [ ] Add routes
- [ ] Update `Manufacturer` model with relationships
- [ ] Update scheduler integration
- [ ] Write unit tests
- [ ] Write feature tests

### Frontend
- [ ] Update TypeScript types
- [ ] Create constants file
- [ ] Create `ExternalStepBadge` component
- [ ] Update `StepPropertiesPanel` component
- [ ] Update `StepCard` component
- [ ] Create `ExternalStepStatusDialog` component
- [ ] Create external steps dashboard page
- [ ] Update route visualization
- [ ] Test all workflows

### Documentation
- [ ] Update user documentation
- [ ] Create training materials
- [ ] Document API endpoints
- [ ] Update technical diagrams

---

## 13. Future Enhancements

### Phase 2 Considerations:

1. **Manufacturer Portal**: Allow manufacturers to log in and update status themselves
2. **API Integration**: Connect with manufacturer ERPs
3. **Automated Notifications**: Alert when items are overdue at manufacturer
4. **Cost Tracking**: Add external processing costs
5. **Performance Metrics**: Track manufacturer on-time delivery rates
6. **Batch Shipments**: Group multiple steps to same manufacturer
7. **Return Material Authorization (RMA)**: Handle quality failures from external steps

---

## Conclusion

This specification provides the complete foundation for external manufacturing step support. The implementation is designed to integrate seamlessly with existing architecture while providing the flexibility needed for complex outsourced workflows.

Next step: Review and approve this specification, then proceed with implementation following the checklist above.

