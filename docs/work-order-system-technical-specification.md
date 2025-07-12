# Work Order System Technical Specification

## Executive Summary

This specification defines a unified Work Order Management System that serves as the single execution model for all maintenance activities in the CMMS. By eliminating the separate `FormExecution` and `RoutineExecution` entities, we create a simpler, more powerful system where all maintenance work flows through a consistent work order lifecycle.

**Key Principle**: In a CMMS, everything is work - whether preventive maintenance, corrective repairs, inspections, or projects. This system reflects that reality with a single, unified execution model.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Data Models](#data-models)
4. [Business Logic](#business-logic)
5. [API Design](#api-design)
6. [Frontend Implementation](#frontend-implementation)
7. [Implementation Plan](#implementation-plan)
8. [Technical Considerations](#technical-considerations)

## Architecture Overview

### Core Concepts

1. **Unified Execution Model**
   - All maintenance activities create work orders
   - Single execution tracking system
   - Consistent lifecycle management
   - Unified reporting and analytics

2. **Work Order Categories**
   - **Preventive**: Scheduled maintenance from routines
   - **Corrective**: Repairs and breakdowns
   - **Inspection**: Inspection activities
   - **Project**: Multi-task projects

3. **Form Integration**
   - Forms serve as task templates
   - Work orders can use form templates or custom tasks
   - Task responses link directly to work order executions

4. **Automation**
   - Routines automatically generate work orders
   - Runtime-based scheduling
   - Auto-approval for routine work

### System Flow

```
Triggers                Work Order              Execution              Completion
--------                ----------              ---------              ----------
Routine      ────→      Create WO    ────→     Execute Tasks  ────→   Close WO
Manual Request ──→      with Tasks             Record Responses       Update Metrics
Inspection ──────→      Schedule               Track Time             Generate Reports
Sensor Alert ────→      Assign Tech            Use Parts              Trigger Follow-ups
```

## Database Schema

### Modified Existing Tables

#### Update `routines` table migration
```php
// In existing create_routines_table migration
Schema::create('routines', function (Blueprint $table) {
    $table->id();
    $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->integer('trigger_hours')->comment('Hours between executions');
    $table->string('status')->default('Inactive')->comment('Active, Inactive');
    $table->text('description')->nullable();
    $table->foreignId('form_id')->constrained();
    $table->foreignId('active_form_version_id')->nullable()->constrained('form_versions')->nullOnDelete();
    
    // Add new fields for work order generation
    $table->integer('advance_generation_hours')->default(168)->comment('Generate WO this many hours in advance');
    $table->boolean('auto_approve_work_orders')->default(true);
    $table->string('default_priority')->default('normal');
    
    $table->timestamps();

    $table->index(['status', 'trigger_hours']);
    $table->index('form_id');
    $table->index('active_form_version_id');
    $table->index('asset_id');
});
```

#### Remove `routine_executions` table
```php
// Delete the create_routine_executions_table migration file entirely
// This table is no longer needed
```

#### Remove `form_executions` table  
```php
// Delete the create_form_executions_table migration file entirely
// This table is no longer needed
```

#### Update `task_responses` table migration
```php
// In existing create_task_responses_table migration
Schema::create('task_responses', function (Blueprint $table) {
    $table->id();
    $table->foreignId('form_task_id')->constrained()->cascadeOnDelete();
    $table->foreignId('work_order_execution_id')->constrained()->cascadeOnDelete(); // Changed from form_execution_id
    $table->foreignId('user_id')->constrained();
    $table->text('response')->nullable();
    $table->json('response_data')->nullable()->comment('Structured data for specific response types');
    $table->timestamps();

    $table->index(['work_order_execution_id', 'form_task_id']);
    $table->index('user_id');
});
```

### New Tables

#### `work_order_types`
```php
Schema::create('work_order_types', function (Blueprint $table) {
    $table->id();
    $table->string('name', 100);
    $table->string('code', 20)->unique();
    $table->enum('category', ['corrective', 'preventive', 'inspection', 'project']);
    $table->text('description')->nullable();
    $table->string('color', 7)->nullable()->comment('Hex color for UI');
    $table->string('icon', 50)->nullable()->comment('Icon identifier for UI');
    $table->string('default_priority', 20)->default('normal');
    $table->boolean('requires_approval')->default(true);
    $table->boolean('auto_approve_from_routine')->default(false);
    $table->integer('sla_hours')->nullable()->comment('Service level agreement in hours');
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    
    $table->index(['is_active', 'category']);
});

// Seed data
$types = [
    ['name' => 'Preventive - Routine', 'code' => 'pm_routine', 'category' => 'preventive', 'auto_approve_from_routine' => true],
    ['name' => 'Preventive - Scheduled', 'code' => 'pm_scheduled', 'category' => 'preventive'],
    ['name' => 'Corrective - Mechanical', 'code' => 'cm_mechanical', 'category' => 'corrective', 'default_priority' => 'high'],
    ['name' => 'Corrective - Electrical', 'code' => 'cm_electrical', 'category' => 'corrective', 'default_priority' => 'high'],
    ['name' => 'Inspection - Safety', 'code' => 'insp_safety', 'category' => 'inspection'],
    ['name' => 'Inspection - Quality', 'code' => 'insp_quality', 'category' => 'inspection'],
    ['name' => 'Project - Improvement', 'code' => 'proj_improvement', 'category' => 'project'],
];
```

#### `work_orders`
```php
Schema::create('work_orders', function (Blueprint $table) {
    $table->id();
    $table->string('work_order_number')->unique();
    $table->string('title');
    $table->text('description')->nullable();
    $table->foreignId('work_order_type_id')->constrained();
    $table->enum('work_order_category', ['corrective', 'preventive', 'inspection', 'project']);
    $table->enum('priority', ['emergency', 'urgent', 'high', 'normal', 'low'])->default('normal');
    $table->integer('priority_score')->default(50)->comment('0-100 for fine-grained sorting');
    $table->string('status', 50)->default('requested');
    
    // Asset relationship
    $table->foreignId('asset_id')->constrained();
    
    // Form/Task configuration
    $table->foreignId('form_id')->nullable()->constrained();
    $table->foreignId('form_version_id')->nullable()->constrained('form_versions');
    $table->json('custom_tasks')->nullable()->comment('For ad-hoc tasks not using forms');
    
    // Planning fields
    $table->decimal('estimated_hours', 5, 2)->nullable();
    $table->decimal('estimated_parts_cost', 10, 2)->nullable();
    $table->decimal('estimated_labor_cost', 10, 2)->nullable();
    $table->decimal('estimated_total_cost', 10, 2)->nullable();
    $table->boolean('downtime_required')->default(false);
    $table->json('safety_requirements')->nullable();
    
    // Scheduling
    $table->timestamp('requested_due_date')->nullable();
    $table->timestamp('scheduled_start_date')->nullable();
    $table->timestamp('scheduled_end_date')->nullable();
    
    // Assignment
    $table->foreignId('assigned_team_id')->nullable()->constrained('teams');
    $table->foreignId('assigned_technician_id')->nullable()->constrained('users');
    $table->json('required_skills')->nullable();
    $table->json('required_certifications')->nullable();
    
    // Execution tracking
    $table->timestamp('actual_start_date')->nullable();
    $table->timestamp('actual_end_date')->nullable();
    $table->decimal('actual_hours', 5, 2)->nullable();
    $table->decimal('actual_parts_cost', 10, 2)->nullable();
    $table->decimal('actual_labor_cost', 10, 2)->nullable();
    $table->decimal('actual_total_cost', 10, 2)->nullable();
    
    // Source tracking
    $table->string('source_type', 50)->default('manual')->comment('manual, routine, sensor, inspection_finding');
    $table->unsignedBigInteger('source_id')->nullable();
    
    // Relationships (flat structure)
    $table->foreignId('related_work_order_id')->nullable()->constrained('work_orders');
    $table->string('relationship_type', 50)->nullable()->comment('follow_up, prerequisite, related');
    
    // People tracking
    $table->foreignId('requested_by')->constrained('users');
    $table->foreignId('approved_by')->nullable()->constrained('users');
    $table->foreignId('planned_by')->nullable()->constrained('users');
    $table->foreignId('verified_by')->nullable()->constrained('users');
    $table->foreignId('closed_by')->nullable()->constrained('users');
    
    // Timestamps
    $table->timestamp('requested_at')->useCurrent();
    $table->timestamp('approved_at')->nullable();
    $table->timestamp('planned_at')->nullable();
    $table->timestamp('verified_at')->nullable();
    $table->timestamp('closed_at')->nullable();
    
    // Metadata
    $table->string('external_reference')->nullable()->comment('PO number, ticket ID, etc');
    $table->boolean('warranty_claim')->default(false);
    $table->json('attachments')->nullable();
    $table->json('tags')->nullable();
    
    $table->timestamps();
    
    // Indexes
    $table->index('work_order_number');
    $table->index(['status', 'priority_score']);
    $table->index(['asset_id', 'status']);
    $table->index(['scheduled_start_date', 'scheduled_end_date']);
    $table->index(['source_type', 'source_id']);
    $table->index(['work_order_category', 'status']);
    $table->index('requested_due_date');
    $table->index('assigned_technician_id');
});
```

#### `work_order_executions`
```php
Schema::create('work_order_executions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('work_order_id')->unique()->constrained()->cascadeOnDelete();
    $table->foreignId('executed_by')->constrained('users');
    $table->enum('status', ['assigned', 'in_progress', 'paused', 'completed'])->default('assigned');
    
    // Time tracking
    $table->timestamp('started_at')->nullable();
    $table->timestamp('paused_at')->nullable();
    $table->timestamp('resumed_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->integer('total_pause_duration')->default(0)->comment('Total pause time in minutes');
    
    // Work details
    $table->text('work_performed')->nullable();
    $table->text('observations')->nullable();
    $table->text('recommendations')->nullable();
    $table->boolean('follow_up_required')->default(false);
    
    // Completion checklist
    $table->boolean('safety_checks_completed')->default(false);
    $table->boolean('quality_checks_completed')->default(false);
    $table->boolean('area_cleaned')->default(false);
    $table->boolean('tools_returned')->default(false);
    
    $table->timestamps();
    
    $table->index(['executed_by', 'status']);
    $table->index('started_at');
});
```

#### `work_order_parts`
```php
Schema::create('work_order_parts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
    $table->foreignId('part_id')->nullable()->constrained('inventory_parts');
    $table->string('part_number', 100)->nullable();
    $table->string('part_name');
    
    // Quantities
    $table->decimal('estimated_quantity', 10, 2)->nullable();
    $table->decimal('reserved_quantity', 10, 2)->nullable();
    $table->decimal('used_quantity', 10, 2)->nullable();
    
    // Costs
    $table->decimal('unit_cost', 10, 2)->nullable();
    $table->decimal('total_cost', 10, 2)->nullable();
    
    // Status tracking
    $table->enum('status', ['planned', 'reserved', 'issued', 'used', 'returned'])->default('planned');
    
    // Audit fields
    $table->timestamp('reserved_at')->nullable();
    $table->foreignId('reserved_by')->nullable()->constrained('users');
    $table->timestamp('issued_at')->nullable();
    $table->foreignId('issued_by')->nullable()->constrained('users');
    $table->timestamp('used_at')->nullable();
    $table->foreignId('used_by')->nullable()->constrained('users');
    
    $table->text('notes')->nullable();
    $table->timestamps();
    
    $table->index(['work_order_id', 'status']);
    $table->index('part_id');
});
```

#### `work_order_status_history`
```php
Schema::create('work_order_status_history', function (Blueprint $table) {
    $table->id();
    $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
    $table->string('from_status', 50)->nullable();
    $table->string('to_status', 50);
    $table->foreignId('changed_by')->constrained('users');
    $table->text('reason')->nullable();
    $table->json('metadata')->nullable()->comment('Additional context for the change');
    $table->timestamp('created_at')->useCurrent();
    
    $table->index(['work_order_id', 'created_at']);
    $table->index('changed_by');
});
```

#### `work_order_failure_analysis`
```php
Schema::create('work_order_failure_analysis', function (Blueprint $table) {
    $table->id();
    $table->foreignId('work_order_id')->unique()->constrained()->cascadeOnDelete();
    
    // Failure classification
    $table->foreignId('failure_mode_id')->nullable()->constrained();
    $table->string('failure_mode_other')->nullable();
    $table->foreignId('root_cause_id')->nullable()->constrained('root_causes');
    $table->string('root_cause_other')->nullable();
    $table->foreignId('immediate_cause_id')->nullable()->constrained('immediate_causes');
    $table->string('immediate_cause_other')->nullable();
    
    // Impact assessment
    $table->enum('failure_effect', ['none', 'minor', 'moderate', 'major', 'critical'])->default('moderate');
    $table->integer('downtime_minutes')->nullable();
    $table->integer('production_loss_units')->nullable();
    $table->boolean('safety_incident')->default(false);
    $table->boolean('environmental_incident')->default(false);
    
    // Analysis details
    $table->text('failure_description')->nullable();
    $table->text('corrective_actions')->nullable();
    $table->text('preventive_recommendations')->nullable();
    
    $table->foreignId('analyzed_by')->constrained('users');
    $table->timestamp('analyzed_at')->useCurrent();
    $table->timestamps();
});
```

#### Supporting Tables for Failure Analysis
```php
// Failure modes
Schema::create('failure_modes', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code', 20)->unique();
    $table->text('description')->nullable();
    $table->string('category', 50)->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});

// Root causes
Schema::create('root_causes', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code', 20)->unique();
    $table->text('description')->nullable();
    $table->string('category', 50)->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});

// Immediate causes
Schema::create('immediate_causes', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code', 20)->unique();
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

## Data Models

### WorkOrder Model
```php
<?php

namespace App\Models\WorkOrders;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class WorkOrder extends Model
{
    protected $fillable = [
        'work_order_number', 'title', 'description', 'work_order_type_id',
        'work_order_category', 'priority', 'priority_score', 'status',
        'asset_id', 'form_id', 'form_version_id', 'custom_tasks',
        'estimated_hours', 'estimated_parts_cost', 'estimated_labor_cost',
        'estimated_total_cost', 'downtime_required', 'safety_requirements',
        'requested_due_date', 'scheduled_start_date', 'scheduled_end_date',
        'assigned_team_id', 'assigned_technician_id', 'required_skills',
        'required_certifications', 'actual_start_date', 'actual_end_date',
        'actual_hours', 'actual_parts_cost', 'actual_labor_cost',
        'actual_total_cost', 'source_type', 'source_id',
        'related_work_order_id', 'relationship_type', 'requested_by',
        'approved_by', 'planned_by', 'verified_by', 'closed_by',
        'requested_at', 'approved_at', 'planned_at', 'verified_at',
        'closed_at', 'external_reference', 'warranty_claim',
        'attachments', 'tags'
    ];

    protected $casts = [
        'custom_tasks' => 'array',
        'safety_requirements' => 'array',
        'required_skills' => 'array',
        'required_certifications' => 'array',
        'attachments' => 'array',
        'tags' => 'array',
        'downtime_required' => 'boolean',
        'warranty_claim' => 'boolean',
        'requested_due_date' => 'datetime',
        'scheduled_start_date' => 'datetime',
        'scheduled_end_date' => 'datetime',
        'actual_start_date' => 'datetime',
        'actual_end_date' => 'datetime',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'planned_at' => 'datetime',
        'verified_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    // Status constants
    const STATUS_REQUESTED = 'requested';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_PLANNED = 'planned';
    const STATUS_READY = 'ready_to_schedule';
    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_ON_HOLD = 'on_hold';
    const STATUS_COMPLETED = 'completed';
    const STATUS_VERIFIED = 'verified';
    const STATUS_CLOSED = 'closed';
    const STATUS_CANCELLED = 'cancelled';

    // Allowed status transitions
    const STATUS_TRANSITIONS = [
        self::STATUS_REQUESTED => [self::STATUS_APPROVED, self::STATUS_REJECTED, self::STATUS_CANCELLED],
        self::STATUS_APPROVED => [self::STATUS_PLANNED, self::STATUS_ON_HOLD, self::STATUS_CANCELLED],
        self::STATUS_PLANNED => [self::STATUS_READY, self::STATUS_ON_HOLD],
        self::STATUS_READY => [self::STATUS_SCHEDULED, self::STATUS_ON_HOLD],
        self::STATUS_SCHEDULED => [self::STATUS_IN_PROGRESS, self::STATUS_ON_HOLD],
        self::STATUS_IN_PROGRESS => [self::STATUS_COMPLETED, self::STATUS_ON_HOLD],
        self::STATUS_ON_HOLD => [self::STATUS_APPROVED, self::STATUS_PLANNED, self::STATUS_READY, self::STATUS_SCHEDULED, self::STATUS_IN_PROGRESS],
        self::STATUS_COMPLETED => [self::STATUS_VERIFIED, self::STATUS_IN_PROGRESS],
        self::STATUS_VERIFIED => [self::STATUS_CLOSED, self::STATUS_COMPLETED],
        self::STATUS_REJECTED => [],
        self::STATUS_CLOSED => [],
        self::STATUS_CANCELLED => [],
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($workOrder) {
            if (empty($workOrder->work_order_number)) {
                $workOrder->work_order_number = static::generateNumber();
            }
            if (empty($workOrder->requested_at)) {
                $workOrder->requested_at = now();
            }
        });
    }

    // Relationships
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(WorkOrderType::class, 'work_order_type_id');
    }

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function formVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class);
    }

    public function execution(): HasOne
    {
        return $this->hasOne(WorkOrderExecution::class);
    }

    public function parts(): HasMany
    {
        return $this->hasMany(WorkOrderPart::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(WorkOrderStatusHistory::class);
    }

    public function failureAnalysis(): HasOne
    {
        return $this->hasOne(WorkOrderFailureAnalysis::class);
    }

    public function relatedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'related_work_order_id');
    }

    public function relatedTo(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class, 'related_work_order_id');
    }

    // Dynamic source relationship
    public function source()
    {
        switch ($this->source_type) {
            case 'routine':
                return $this->belongsTo(Routine::class, 'source_id');
            // Add other source types as needed
            default:
                return null;
        }
    }

    // User relationships
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function plannedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'planned_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function assignedTechnician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_technician_id');
    }

    // Scopes
    public function scopeOpen($query)
    {
        return $query->whereNotIn('status', [self::STATUS_CLOSED, self::STATUS_CANCELLED]);
    }

    public function scopeOverdue($query)
    {
        return $query->where('requested_due_date', '<', now())
            ->whereNotIn('status', [self::STATUS_COMPLETED, self::STATUS_VERIFIED, self::STATUS_CLOSED, self::STATUS_CANCELLED]);
    }

    public function scopeForAsset($query, $assetId)
    {
        return $query->where('asset_id', $assetId);
    }

    public function scopePreventive($query)
    {
        return $query->where('work_order_category', 'preventive');
    }

    public function scopeCorrective($query)
    {
        return $query->where('work_order_category', 'corrective');
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('work_order_category', $category);
    }

    public function scopeScheduledBetween($query, $start, $end)
    {
        return $query->whereBetween('scheduled_start_date', [$start, $end]);
    }

    // Helper methods
    public function isPreventive(): bool
    {
        return $this->work_order_category === 'preventive';
    }

    public function isCorrective(): bool
    {
        return $this->work_order_category === 'corrective';
    }

    public function isFromRoutine(): bool
    {
        return $this->source_type === 'routine';
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::STATUS_TRANSITIONS[$this->status] ?? []);
    }

    public function transitionTo(string $status, User $user, ?string $reason = null): bool
    {
        if (!$this->canTransitionTo($status)) {
            return false;
        }

        $oldStatus = $this->status;
        $this->status = $status;
        
        // Update relevant timestamps and user references
        switch ($status) {
            case self::STATUS_APPROVED:
                $this->approved_at = now();
                $this->approved_by = $user->id;
                break;
            case self::STATUS_PLANNED:
                $this->planned_at = now();
                $this->planned_by = $user->id;
                break;
            case self::STATUS_VERIFIED:
                $this->verified_at = now();
                $this->verified_by = $user->id;
                break;
            case self::STATUS_CLOSED:
                $this->closed_at = now();
                $this->closed_by = $user->id;
                break;
        }

        $this->save();

        // Record status change
        $this->statusHistory()->create([
            'from_status' => $oldStatus,
            'to_status' => $status,
            'changed_by' => $user->id,
            'reason' => $reason,
        ]);

        return true;
    }

    public function getTasks(): array
    {
        if ($this->form_version_id) {
            return $this->formVersion->tasks->toArray();
        }
        
        return $this->custom_tasks ?? [];
    }

    public static function generateNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        
        $lastNumber = static::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->max(\DB::raw("CAST(SUBSTRING_INDEX(work_order_number, '-', -1) AS UNSIGNED)"));
        
        $nextNumber = ($lastNumber ?? 0) + 1;
        
        return sprintf('WO-%s-%s-%05d', $year, $month, $nextNumber);
    }

    // Calculate priority score based on multiple factors
    public function calculatePriorityScore(): int
    {
        $score = 50; // Base score

        // Priority weight
        $priorityWeights = [
            'emergency' => 40,
            'urgent' => 30,
            'high' => 20,
            'normal' => 0,
            'low' => -20,
        ];
        $score += $priorityWeights[$this->priority] ?? 0;

        // Age factor (older = higher priority)
        $ageInDays = $this->created_at->diffInDays(now());
        $score += min($ageInDays, 10); // Max 10 points for age

        // Overdue factor
        if ($this->requested_due_date && $this->requested_due_date->isPast()) {
            $overdueDays = $this->requested_due_date->diffInDays(now());
            $score += min($overdueDays * 2, 20); // Max 20 points for overdue
        }

        // Asset criticality (if implemented)
        // $score += $this->asset->criticality_score ?? 0;

        return max(0, min(100, $score)); // Ensure 0-100 range
    }
}
```

### WorkOrderExecution Model
```php
<?php

namespace App\Models\WorkOrders;

use App\Models\Forms\TaskResponse;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrderExecution extends Model
{
    protected $fillable = [
        'work_order_id', 'executed_by', 'status',
        'started_at', 'paused_at', 'resumed_at', 'completed_at',
        'total_pause_duration', 'work_performed', 'observations',
        'recommendations', 'follow_up_required',
        'safety_checks_completed', 'quality_checks_completed',
        'area_cleaned', 'tools_returned'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'resumed_at' => 'datetime',
        'completed_at' => 'datetime',
        'follow_up_required' => 'boolean',
        'safety_checks_completed' => 'boolean',
        'quality_checks_completed' => 'boolean',
        'area_cleaned' => 'boolean',
        'tools_returned' => 'boolean',
    ];

    // Relationships
    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function executedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executed_by');
    }

    public function taskResponses(): HasMany
    {
        return $this->hasMany(TaskResponse::class, 'work_order_execution_id');
    }

    // Helper methods
    public function start(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        // Update work order status
        $this->workOrder->update([
            'status' => WorkOrder::STATUS_IN_PROGRESS,
            'actual_start_date' => now(),
        ]);
    }

    public function pause(): void
    {
        if ($this->status === 'in_progress' && !$this->paused_at) {
            $this->update([
                'status' => 'paused',
                'paused_at' => now(),
            ]);
        }
    }

    public function resume(): void
    {
        if ($this->status === 'paused' && $this->paused_at) {
            $pauseDuration = $this->paused_at->diffInMinutes(now());
            
            $this->update([
                'status' => 'in_progress',
                'resumed_at' => now(),
                'paused_at' => null,
                'total_pause_duration' => $this->total_pause_duration + $pauseDuration,
            ]);
        }
    }

    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Calculate actual duration
        $actualMinutes = $this->started_at->diffInMinutes($this->completed_at) - $this->total_pause_duration;
        $actualHours = round($actualMinutes / 60, 2);

        // Update work order
        $this->workOrder->update([
            'status' => WorkOrder::STATUS_COMPLETED,
            'actual_end_date' => now(),
            'actual_hours' => $actualHours,
        ]);
    }

    public function getActualDurationAttribute(): ?float
    {
        if (!$this->started_at) {
            return null;
        }

        $endTime = $this->completed_at ?? now();
        $totalMinutes = $this->started_at->diffInMinutes($endTime) - $this->total_pause_duration;
        
        return round($totalMinutes / 60, 2); // Return hours
    }

    public function getCompletionPercentageAttribute(): int
    {
        $tasks = $this->workOrder->getTasks();
        
        if (empty($tasks)) {
            return $this->status === 'completed' ? 100 : 0;
        }

        $totalTasks = count($tasks);
        $completedTasks = $this->taskResponses()
            ->whereNotNull('response')
            ->count();

        return min(100, round(($completedTasks / $totalTasks) * 100));
    }

    public function canComplete(): bool
    {
        // Check if all required tasks have responses
        $tasks = $this->workOrder->getTasks();
        $requiredTaskIds = collect($tasks)
            ->where('is_required', true)
            ->pluck('id')
            ->toArray();

        if (empty($requiredTaskIds)) {
            return true;
        }

        $completedRequiredTasks = $this->taskResponses()
            ->whereIn('form_task_id', $requiredTaskIds)
            ->whereNotNull('response')
            ->count();

        return count($requiredTaskIds) === $completedRequiredTasks;
    }
}
```

### Updated Routine Model
```php
<?php

namespace App\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Routine extends Model
{
    protected $fillable = [
        'asset_id', 'name', 'trigger_hours', 'status', 'description',
        'form_id', 'active_form_version_id', 'advance_generation_hours',
        'auto_approve_work_orders', 'default_priority'
    ];

    protected $casts = [
        'trigger_hours' => 'integer',
        'advance_generation_hours' => 'integer',
        'auto_approve_work_orders' => 'boolean',
    ];

    // Relationships
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    public function activeFormVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class, 'active_form_version_id');
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'source_id')
            ->where('source_type', 'routine');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    // Helper methods
    public function getLastCompletedWorkOrder(): ?WorkOrder
    {
        return $this->workOrders()
            ->whereIn('status', [
                WorkOrder::STATUS_COMPLETED,
                WorkOrder::STATUS_VERIFIED,
                WorkOrder::STATUS_CLOSED
            ])
            ->orderBy('actual_end_date', 'desc')
            ->first();
    }

    public function getNextDueDate(): Carbon
    {
        $lastCompleted = $this->getLastCompletedWorkOrder();
        
        if (!$lastCompleted || !$lastCompleted->actual_end_date) {
            // First time - calculate based on current runtime
            $currentHours = $this->asset->current_runtime_hours ?? 0;
            $hoursUntilDue = max(0, $this->trigger_hours - $currentHours);
            
            // Estimate based on average runtime per day
            $avgHoursPerDay = 16; // Configurable default
            $daysUntilDue = $hoursUntilDue / $avgHoursPerDay;
            
            return now()->addDays($daysUntilDue);
        }
        
        // Calculate based on last completion
        return $lastCompleted->actual_end_date->copy()
            ->addHours($this->trigger_hours);
    }

    public function isDue(): bool
    {
        return $this->getNextDueDate()->isPast();
    }

    public function shouldGenerateWorkOrder(): bool
    {
        // Check if active
        if ($this->status !== 'Active') {
            return false;
        }

        // Check if there's already an open work order
        $hasOpenWorkOrder = $this->workOrders()
            ->whereNotIn('status', [
                WorkOrder::STATUS_CLOSED,
                WorkOrder::STATUS_CANCELLED,
                WorkOrder::STATUS_REJECTED
            ])
            ->exists();
            
        if ($hasOpenWorkOrder) {
            return false;
        }

        // Check if due within advance generation window
        $nextDue = $this->getNextDueDate();
        $generateBy = $nextDue->copy()->subHours($this->advance_generation_hours);
        
        return now()->greaterThanOrEqualTo($generateBy);
    }

    public function generateWorkOrder(?Carbon $dueDate = null): WorkOrder
    {
        $workOrderType = WorkOrderType::where('code', 'pm_routine')->first();
        $formVersion = $this->active_form_version_id 
            ? $this->activeFormVersion 
            : $this->form->currentVersion;

        $workOrder = WorkOrder::create([
            'title' => $this->name,
            'description' => $this->description,
            'work_order_type_id' => $workOrderType->id,
            'work_order_category' => 'preventive',
            'priority' => $this->default_priority,
            'asset_id' => $this->asset_id,
            'form_id' => $this->form_id,
            'form_version_id' => $formVersion?->id,
            'source_type' => 'routine',
            'source_id' => $this->id,
            'requested_due_date' => $dueDate ?? $this->getNextDueDate(),
            'requested_by' => 1, // System user ID
            'status' => $this->shouldAutoApprove() 
                ? WorkOrder::STATUS_APPROVED 
                : WorkOrder::STATUS_REQUESTED,
        ]);

        if ($this->shouldAutoApprove()) {
            $workOrder->update([
                'approved_by' => 1,
                'approved_at' => now(),
            ]);
            
            // Record status change
            $workOrder->statusHistory()->create([
                'from_status' => WorkOrder::STATUS_REQUESTED,
                'to_status' => WorkOrder::STATUS_APPROVED,
                'changed_by' => 1,
                'reason' => 'Auto-approved for routine work order',
            ]);
        }

        return $workOrder;
    }

    private function shouldAutoApprove(): bool
    {
        return $this->auto_approve_work_orders && 
               $this->type?->auto_approve_from_routine;
    }
}
```

### Updated Asset Model
```php
// Add these methods to the existing Asset model

public function workOrders(): HasMany
{
    return $this->hasMany(WorkOrder::class);
}

public function openWorkOrders(): HasMany
{
    return $this->workOrders()->open();
}

public function preventiveWorkOrders(): HasMany
{
    return $this->workOrders()->preventive();
}

public function correctiveWorkOrders(): HasMany
{
    return $this->workOrders()->corrective();
}

public function getMaintenanceMetrics(Carbon $startDate, Carbon $endDate)
{
    $workOrders = $this->workOrders()
        ->whereBetween('created_at', [$startDate, $endDate])
        ->get();

    return [
        'total_work_orders' => $workOrders->count(),
        'preventive_count' => $workOrders->where('work_order_category', 'preventive')->count(),
        'corrective_count' => $workOrders->where('work_order_category', 'corrective')->count(),
        'total_downtime_hours' => $workOrders->sum('actual_hours'),
        'total_cost' => $workOrders->sum('actual_total_cost'),
        'mtbf' => $this->calculateMTBF($startDate, $endDate),
        'mttr' => $this->calculateMTTR($startDate, $endDate),
    ];
}

private function calculateMTBF(Carbon $startDate, Carbon $endDate): float
{
    $failures = $this->workOrders()
        ->corrective()
        ->whereBetween('created_at', [$startDate, $endDate])
        ->count();
        
    if ($failures === 0) {
        return 0;
    }
    
    $totalHours = $startDate->diffInHours($endDate);
    $downtimeHours = $this->workOrders()
        ->corrective()
        ->whereBetween('created_at', [$startDate, $endDate])
        ->sum('actual_hours');
        
    $uptimeHours = $totalHours - $downtimeHours;
    
    return round($uptimeHours / $failures, 2);
}

private function calculateMTTR(Carbon $startDate, Carbon $endDate): float
{
    $correctiveWorkOrders = $this->workOrders()
        ->corrective()
        ->whereBetween('created_at', [$startDate, $endDate])
        ->whereNotNull('actual_hours')
        ->get();
        
    if ($correctiveWorkOrders->isEmpty()) {
        return 0;
    }
    
    return round($correctiveWorkOrders->avg('actual_hours'), 2);
}
```

### Updated Form Model
```php
// Update the existing Form model

// Remove all execution-related methods and relationships
// Add this relationship
public function workOrders(): HasMany
{
    return $this->hasMany(WorkOrder::class);
}

// Forms are now purely templates
public function isUsedInActiveRoutines(): bool
{
    return $this->routine()
        ->where('status', 'Active')
        ->exists();
}
```

### Updated TaskResponse Model
```php
// Update the task_responses migration and model

protected $fillable = [
    'form_task_id',
    'work_order_execution_id', // Changed from form_execution_id
    'user_id',
    'response',
    'response_data',
];

public function workOrderExecution(): BelongsTo
{
    return $this->belongsTo(WorkOrderExecution::class);
}

public function task(): BelongsTo
{
    return $this->belongsTo(FormTask::class, 'form_task_id');
}
```

## Business Logic

### Work Order Generation Service
```php
<?php

namespace App\Services\WorkOrders;

use App\Models\Maintenance\Routine;
use App\Models\WorkOrders\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WorkOrderGenerationService
{
    /**
     * Generate work orders for all active routines that are due
     */
    public function generateDueWorkOrders(): Collection
    {
        $generatedWorkOrders = collect();
        
        $routines = Routine::active()
            ->with(['asset', 'form'])
            ->get();
            
        foreach ($routines as $routine) {
            if ($routine->shouldGenerateWorkOrder()) {
                $workOrder = $routine->generateWorkOrder();
                $generatedWorkOrders->push($workOrder);
                
                \Log::info('Generated work order', [
                    'routine_id' => $routine->id,
                    'work_order_id' => $workOrder->id,
                    'work_order_number' => $workOrder->work_order_number,
                ]);
            }
        }
        
        return $generatedWorkOrders;
    }
    
    /**
     * Preview upcoming work orders for planning
     */
    public function previewUpcomingWorkOrders(int $daysAhead = 30): Collection
    {
        $upcoming = collect();
        
        $routines = Routine::active()
            ->with(['asset', 'form'])
            ->get();
            
        foreach ($routines as $routine) {
            $nextDue = $routine->getNextDueDate();
            
            if ($nextDue->lessThanOrEqualTo(now()->addDays($daysAhead))) {
                // Check if work order already exists
                $exists = $routine->workOrders()
                    ->open()
                    ->exists();
                    
                if (!$exists) {
                    $upcoming->push([
                        'routine' => $routine,
                        'asset' => $routine->asset,
                        'due_date' => $nextDue,
                        'days_until_due' => now()->diffInDays($nextDue, false),
                        'priority' => $this->calculatePriority($routine, $nextDue),
                    ]);
                }
            }
        }
        
        return $upcoming->sortBy('due_date');
    }
    
    private function calculatePriority(Routine $routine, Carbon $dueDate): string
    {
        $daysUntilDue = now()->diffInDays($dueDate, false);
        
        if ($daysUntilDue < 0) {
            return 'urgent'; // Overdue
        } elseif ($daysUntilDue <= 3) {
            return 'high';
        } elseif ($daysUntilDue <= 7) {
            return 'normal';
        }
        
        return 'low';
    }
}
```

### Work Order Execution Service
```php
<?php

namespace App\Services\WorkOrders;

use App\Models\Forms\FormTask;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderExecution;
use App\Models\User;

class WorkOrderExecutionService
{
    public function startExecution(WorkOrder $workOrder, User $technician): WorkOrderExecution
    {
        // Create or get execution
        $execution = $workOrder->execution ?? $workOrder->execution()->create([
            'executed_by' => $technician->id,
            'status' => 'assigned',
        ]);
        
        // Start execution
        $execution->start();
        
        return $execution;
    }
    
    public function submitTaskResponse(
        WorkOrderExecution $execution,
        int $taskId,
        $response,
        array $responseData = null
    ): void {
        $execution->taskResponses()->updateOrCreate(
            ['form_task_id' => $taskId],
            [
                'user_id' => auth()->id(),
                'response' => $response,
                'response_data' => $responseData,
            ]
        );
    }
    
    public function completeExecution(WorkOrderExecution $execution, array $completionData): void
    {
        // Validate all required tasks are completed
        if (!$execution->canComplete()) {
            throw new \Exception('Not all required tasks have been completed');
        }
        
        // Update execution data
        $execution->update([
            'work_performed' => $completionData['work_performed'] ?? null,
            'observations' => $completionData['observations'] ?? null,
            'recommendations' => $completionData['recommendations'] ?? null,
            'follow_up_required' => $completionData['follow_up_required'] ?? false,
            'safety_checks_completed' => $completionData['safety_checks_completed'] ?? false,
            'quality_checks_completed' => $completionData['quality_checks_completed'] ?? false,
            'area_cleaned' => $completionData['area_cleaned'] ?? false,
            'tools_returned' => $completionData['tools_returned'] ?? false,
        ]);
        
        // Complete execution
        $execution->complete();
        
        // Create follow-up work order if needed
        if ($execution->follow_up_required && !empty($completionData['follow_up_description'])) {
            $this->createFollowUpWorkOrder($execution, $completionData['follow_up_description']);
        }
    }
    
    private function createFollowUpWorkOrder(WorkOrderExecution $execution, string $description): WorkOrder
    {
        $originalWorkOrder = $execution->workOrder;
        
        return WorkOrder::create([
            'title' => 'Follow-up: ' . $originalWorkOrder->title,
            'description' => $description,
            'work_order_type_id' => $originalWorkOrder->work_order_type_id,
            'work_order_category' => 'corrective',
            'priority' => 'normal',
            'asset_id' => $originalWorkOrder->asset_id,
            'related_work_order_id' => $originalWorkOrder->id,
            'relationship_type' => 'follow_up',
            'requested_by' => auth()->id(),
            'source_type' => 'work_order',
            'source_id' => $originalWorkOrder->id,
        ]);
    }
}
```

## API Design

### Work Order Routes
```php
// routes/api.php

Route::prefix('api')->middleware('auth:sanctum')->group(function () {
    // Work Orders
    Route::apiResource('work-orders', WorkOrderController::class);
    Route::prefix('work-orders/{workOrder}')->group(function () {
        // Status transitions
        Route::post('approve', [WorkOrderController::class, 'approve']);
        Route::post('reject', [WorkOrderController::class, 'reject']);
        Route::post('plan', [WorkOrderController::class, 'plan']);
        Route::post('schedule', [WorkOrderController::class, 'schedule']);
        Route::post('assign', [WorkOrderController::class, 'assign']);
        Route::post('hold', [WorkOrderController::class, 'hold']);
        Route::post('resume', [WorkOrderController::class, 'resume']);
        Route::post('verify', [WorkOrderController::class, 'verify']);
        Route::post('close', [WorkOrderController::class, 'close']);
        
        // Execution
        Route::prefix('execution')->group(function () {
            Route::get('/', [WorkOrderExecutionController::class, 'show']);
            Route::post('start', [WorkOrderExecutionController::class, 'start']);
            Route::post('pause', [WorkOrderExecutionController::class, 'pause']);
            Route::post('resume', [WorkOrderExecutionController::class, 'resume']);
            Route::post('complete', [WorkOrderExecutionController::class, 'complete']);
            
            // Task responses
            Route::get('tasks', [WorkOrderExecutionController::class, 'tasks']);
            Route::post('tasks/{task}/response', [WorkOrderExecutionController::class, 'submitResponse']);
        });
        
        // Related data
        Route::get('history', [WorkOrderController::class, 'history']);
        Route::apiResource('parts', WorkOrderPartController::class);
        Route::post('failure-analysis', [WorkOrderFailureAnalysisController::class, 'store']);
        Route::post('follow-up', [WorkOrderController::class, 'createFollowUp']);
    });
    
    // Routines
    Route::prefix('routines/{routine}')->group(function () {
        Route::post('generate-work-order', [RoutineController::class, 'generateWorkOrder']);
        Route::get('work-orders', [RoutineController::class, 'workOrders']);
    });
    
    // Scheduled jobs preview
    Route::get('work-orders/preview/upcoming', [WorkOrderController::class, 'previewUpcoming']);
});
```

### Work Order Controller
```php
<?php

namespace App\Http\Controllers\WorkOrders;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkOrders\CreateWorkOrderRequest;
use App\Http\Requests\WorkOrders\UpdateWorkOrderRequest;
use App\Http\Resources\WorkOrderResource;
use App\Models\WorkOrders\WorkOrder;
use App\Services\WorkOrders\WorkOrderService;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function __construct(private WorkOrderService $service)
    {
    }

    public function index(Request $request)
    {
        $query = WorkOrder::with(['asset', 'type', 'assignedTechnician', 'execution']);
        
        // Filters
        if ($request->has('category')) {
            $query->byCategory($request->category);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('asset_id')) {
            $query->forAsset($request->asset_id);
        }
        
        if ($request->has('assigned_to')) {
            $query->where('assigned_technician_id', $request->assigned_to);
        }
        
        if ($request->has('overdue')) {
            $query->overdue();
        }
        
        // Date filters
        if ($request->has('scheduled_from') && $request->has('scheduled_to')) {
            $query->scheduledBetween($request->scheduled_from, $request->scheduled_to);
        }
        
        // Sorting
        $sortBy = $request->get('sort_by', 'priority_score');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);
        
        $workOrders = $query->paginate($request->get('per_page', 20));
        
        return WorkOrderResource::collection($workOrders);
    }

    public function store(CreateWorkOrderRequest $request)
    {
        $workOrder = $this->service->create($request->validated());
        
        return new WorkOrderResource($workOrder->load(['asset', 'type']));
    }

    public function show(WorkOrder $workOrder)
    {
        $workOrder->load([
            'asset.plant',
            'asset.area', 
            'asset.sector',
            'type',
            'form',
            'formVersion.tasks',
            'execution.taskResponses',
            'parts',
            'statusHistory.changedBy',
            'relatedWorkOrders',
            'relatedTo',
            'requestedBy',
            'assignedTechnician',
        ]);
        
        return new WorkOrderResource($workOrder);
    }

    public function update(UpdateWorkOrderRequest $request, WorkOrder $workOrder)
    {
        $workOrder = $this->service->update($workOrder, $request->validated());
        
        return new WorkOrderResource($workOrder);
    }

    public function destroy(WorkOrder $workOrder)
    {
        $this->authorize('delete', $workOrder);
        
        if (!in_array($workOrder->status, [WorkOrder::STATUS_REQUESTED, WorkOrder::STATUS_CANCELLED])) {
            abort(422, 'Only requested or cancelled work orders can be deleted');
        }
        
        $workOrder->delete();
        
        return response()->noContent();
    }

    // Status transition methods
    public function approve(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('approve', $workOrder);
        
        if (!$workOrder->transitionTo(WorkOrder::STATUS_APPROVED, auth()->user(), $request->reason)) {
            abort(422, 'Cannot approve work order in current status');
        }
        
        return new WorkOrderResource($workOrder);
    }

    public function reject(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('approve', $workOrder);
        
        $request->validate(['reason' => 'required|string']);
        
        if (!$workOrder->transitionTo(WorkOrder::STATUS_REJECTED, auth()->user(), $request->reason)) {
            abort(422, 'Cannot reject work order in current status');
        }
        
        return new WorkOrderResource($workOrder);
    }

    public function plan(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('plan', $workOrder);
        
        $validated = $request->validate([
            'estimated_hours' => 'nullable|numeric|min:0',
            'estimated_parts_cost' => 'nullable|numeric|min:0',
            'estimated_labor_cost' => 'nullable|numeric|min:0',
            'required_skills' => 'nullable|array',
            'required_certifications' => 'nullable|array',
            'safety_requirements' => 'nullable|array',
            'downtime_required' => 'nullable|boolean',
        ]);
        
        $workOrder->update($validated);
        $workOrder->update(['estimated_total_cost' => 
            ($validated['estimated_parts_cost'] ?? 0) + 
            ($validated['estimated_labor_cost'] ?? 0)
        ]);
        
        if (!$workOrder->transitionTo(WorkOrder::STATUS_PLANNED, auth()->user())) {
            abort(422, 'Cannot plan work order in current status');
        }
        
        return new WorkOrderResource($workOrder);
    }

    public function schedule(Request $request, WorkOrder $workOrder)
    {
        $this->authorize('schedule', $workOrder);
        
        $validated = $request->validate([
            'scheduled_start_date' => 'required|date|after:now',
            'scheduled_end_date' => 'required|date|after:scheduled_start_date',
            'assigned_technician_id' => 'required|exists:users,id',
        ]);
        
        $workOrder->update($validated);
        
        if (!$workOrder->transitionTo(WorkOrder::STATUS_SCHEDULED, auth()->user())) {
            abort(422, 'Cannot schedule work order in current status');
        }
        
        // TODO: Send notification to assigned technician
        
        return new WorkOrderResource($workOrder);
    }

    public function history(WorkOrder $workOrder)
    {
        $history = $workOrder->statusHistory()
            ->with('changedBy')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json(['data' => $history]);
    }

    public function previewUpcoming(Request $request)
    {
        $days = $request->get('days', 30);
        $upcoming = app(WorkOrderGenerationService::class)->previewUpcomingWorkOrders($days);
        
        return response()->json(['data' => $upcoming]);
    }
}
```

## Frontend Implementation

### Vue.js Components Structure

```
resources/js/
├── components/
│   ├── work-orders/
│   │   ├── WorkOrderDashboard.vue
│   │   ├── WorkOrderList.vue
│   │   ├── WorkOrderDetail.vue
│   │   ├── WorkOrderForm.vue
│   │   ├── WorkOrderScheduler.vue
│   │   ├── WorkOrderFilters.vue
│   │   ├── execution/
│   │   │   ├── WorkOrderExecution.vue
│   │   │   ├── ExecutionHeader.vue
│   │   │   ├── ExecutionTimer.vue
│   │   │   ├── TaskList.vue
│   │   │   ├── TaskResponseForm.vue
│   │   │   └── ExecutionSummary.vue
│   │   └── components/
│   │       ├── WorkOrderCard.vue
│   │       ├── WorkOrderStatusBadge.vue
│   │       ├── WorkOrderPriorityBadge.vue
│   │       ├── WorkOrderTimeline.vue
│   │       └── WorkOrderQuickActions.vue
│   └── routines/
│       ├── RoutineList.vue
│       ├── RoutineDetail.vue
│       ├── RoutineWorkOrderHistory.vue
│       └── GenerateWorkOrderButton.vue
├── composables/
│   ├── useWorkOrders.js
│   ├── useWorkOrderExecution.js
│   └── useRoutines.js
└── pages/
    ├── WorkOrders/
    │   ├── Index.vue
    │   ├── Show.vue
    │   ├── Create.vue
    │   └── Execute.vue
    └── Routines/
        ├── Index.vue
        └── Show.vue
```

### Sample Component: WorkOrderExecution.vue
```vue
<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <ExecutionHeader 
            :work-order="workOrder"
            :execution="execution"
            @pause="handlePause"
            @resume="handleResume"
        />
        
        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Task List -->
                <div class="lg:col-span-2">
                    <TaskList
                        :tasks="tasks"
                        :responses="responses"
                        @select-task="selectedTask = $event"
                    />
                </div>
                
                <!-- Task Response Form -->
                <div class="lg:col-span-1">
                    <div class="sticky top-4">
                        <TaskResponseForm
                            v-if="selectedTask"
                            :task="selectedTask"
                            :response="getResponse(selectedTask.id)"
                            @submit="handleTaskResponse"
                        />
                        
                        <!-- Completion Summary -->
                        <ExecutionSummary
                            v-if="canComplete"
                            :execution="execution"
                            @complete="handleComplete"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkOrderExecution } from '@/composables/useWorkOrderExecution'
import ExecutionHeader from './ExecutionHeader.vue'
import TaskList from './TaskList.vue'
import TaskResponseForm from './TaskResponseForm.vue'
import ExecutionSummary from './ExecutionSummary.vue'

const route = useRoute()
const router = useRouter()

const {
    workOrder,
    execution,
    tasks,
    responses,
    loading,
    startExecution,
    pauseExecution,
    resumeExecution,
    submitTaskResponse,
    completeExecution,
} = useWorkOrderExecution(route.params.id)

const selectedTask = ref(null)

const canComplete = computed(() => {
    if (!tasks.value.length) return false
    
    const requiredTasks = tasks.value.filter(t => t.is_required)
    const completedRequired = requiredTasks.every(t => 
        responses.value.find(r => r.form_task_id === t.id)
    )
    
    return completedRequired
})

const getResponse = (taskId) => {
    return responses.value.find(r => r.form_task_id === taskId)
}

const handleTaskResponse = async (taskId, responseData) => {
    await submitTaskResponse(taskId, responseData)
    
    // Auto-select next task
    const currentIndex = tasks.value.findIndex(t => t.id === taskId)
    if (currentIndex < tasks.value.length - 1) {
        selectedTask.value = tasks.value[currentIndex + 1]
    }
}

const handleComplete = async (summaryData) => {
    await completeExecution(summaryData)
    router.push(`/work-orders/${workOrder.value.id}`)
}

const handlePause = () => pauseExecution()
const handleResume = () => resumeExecution()

onMounted(async () => {
    if (!execution.value || execution.value.status === 'assigned') {
        await startExecution()
    }
    
    if (tasks.value.length > 0) {
        selectedTask.value = tasks.value[0]
    }
})
</script>
```

### Composable: useWorkOrders.js
```javascript
import { ref, computed } from 'vue'
import { router } from '@inertiajs/vue3'
import axios from 'axios'

export function useWorkOrders() {
    const workOrders = ref([])
    const loading = ref(false)
    const filters = ref({
        category: null,
        status: null,
        asset_id: null,
        assigned_to: null,
        overdue: false,
        scheduled_from: null,
        scheduled_to: null,
    })
    const pagination = ref({
        current_page: 1,
        per_page: 20,
        total: 0,
    })

    const fetchWorkOrders = async () => {
        loading.value = true
        try {
            const params = {
                ...filters.value,
                page: pagination.value.current_page,
                per_page: pagination.value.per_page,
            }
            
            const response = await axios.get('/api/work-orders', { params })
            workOrders.value = response.data.data
            pagination.value = {
                current_page: response.data.current_page,
                per_page: response.data.per_page,
                total: response.data.total,
            }
        } finally {
            loading.value = false
        }
    }

    const createWorkOrder = async (data) => {
        const response = await axios.post('/api/work-orders', data)
        router.visit(`/work-orders/${response.data.data.id}`)
        return response.data.data
    }

    const updateWorkOrder = async (id, data) => {
        const response = await axios.put(`/api/work-orders/${id}`, data)
        return response.data.data
    }

    const transitionStatus = async (id, action, data = {}) => {
        const response = await axios.post(`/api/work-orders/${id}/${action}`, data)
        return response.data.data
    }

    const metrics = computed(() => {
        const total = workOrders.value.length
        const byCategory = workOrders.value.reduce((acc, wo) => {
            acc[wo.work_order_category] = (acc[wo.work_order_category] || 0) + 1
            return acc
        }, {})
        
        const overdue = workOrders.value.filter(wo => 
            wo.requested_due_date && 
            new Date(wo.requested_due_date) < new Date() &&
            !['completed', 'verified', 'closed', 'cancelled'].includes(wo.status)
        ).length

        return {
            total,
            byCategory,
            overdue,
            completion_rate: total > 0 
                ? (workOrders.value.filter(wo => ['completed', 'verified', 'closed'].includes(wo.status)).length / total * 100).toFixed(1)
                : 0,
        }
    })

    return {
        workOrders,
        loading,
        filters,
        pagination,
        metrics,
        fetchWorkOrders,
        createWorkOrder,
        updateWorkOrder,
        transitionStatus,
    }
}
```

## Implementation Plan

### Phase 1: Database Setup (Days 1-3)

1. **Update Migrations**
   - Remove `routine_executions` and `form_executions` migrations
   - Update `task_responses` migration
   - Add all new work order tables
   - Create seed data for work order types and failure classifications

2. **Run Fresh Migration**
   ```bash
   php artisan migrate:fresh --seed
   ```

### Phase 2: Model Implementation (Days 4-7)

1. **Create Models**
   - WorkOrder and related models
   - Update Routine model
   - Update Asset model
   - Update Form model
   - Update TaskResponse model

2. **Implement Relationships**
   - Define all model relationships
   - Add scopes and helper methods
   - Implement model events and observers

### Phase 3: Business Logic (Days 8-12)

1. **Create Services**
   - WorkOrderGenerationService
   - WorkOrderExecutionService
   - WorkOrderSchedulingService
   - FailureAnalysisService

2. **Implement Scheduled Jobs**
   - Daily work order generation job
   - Overdue work order notifications
   - Metrics calculation job

### Phase 4: API Development (Days 13-17)

1. **Create Controllers**
   - WorkOrderController
   - WorkOrderExecutionController
   - WorkOrderPartController
   - WorkOrderFailureAnalysisController

2. **Define Routes**
   - RESTful routes for work orders
   - Execution endpoints
   - Status transition endpoints
   - Reporting endpoints

3. **Create Resources & Requests**
   - WorkOrderResource
   - Form requests for validation
   - API documentation

### Phase 5: Frontend Development (Days 18-25)

1. **Create Vue Components**
   - Work order list and filters
   - Work order detail view
   - Execution interface
   - Dashboard components

2. **Update Routine Views**
   - Show work order generation
   - Display work order history
   - Remove execution UI

3. **Create Composables**
   - Work order state management
   - Execution flow handling
   - Real-time updates

### Phase 6: Testing & Documentation (Days 26-30)

1. **Write Tests**
   - Unit tests for models and services
   - Feature tests for API endpoints
   - Frontend component tests

2. **Create Documentation**
   - User guide for work order system
   - API documentation
   - Admin configuration guide

## Technical Considerations

### Performance Optimization

1. **Database Indexes**
   - All foreign keys
   - Status and category fields
   - Date fields used in queries
   - Composite indexes for common queries

2. **Query Optimization**
   ```php
   // Eager load relationships to prevent N+1
   $workOrders = WorkOrder::with([
       'asset',
       'type',
       'execution.taskResponses',
       'assignedTechnician'
   ])->paginate();
   ```

3. **Caching Strategy**
   - Cache work order types and failure modes
   - Cache user permissions
   - Use Redis for real-time execution data

### Security Considerations

1. **Permissions**
   ```php
   // Define granular permissions
   'work-orders.view-all'
   'work-orders.view-own'
   'work-orders.create'
   'work-orders.edit-all'
   'work-orders.edit-own'
   'work-orders.delete'
   'work-orders.approve'
   'work-orders.plan'
   'work-orders.schedule'
   'work-orders.execute'
   'work-orders.verify'
   'work-orders.view-costs'
   ```

2. **Data Validation**
   - Validate all input at controller level
   - Validate state transitions
   - Sanitize custom task data

3. **Audit Trail**
   - Log all status changes
   - Track user actions
   - Maintain data integrity

### Scalability

1. **Queue Usage**
   ```php
   // Use queues for heavy operations
   GenerateWorkOrdersJob::dispatch()->onQueue('maintenance');
   SendOverdueNotificationsJob::dispatch()->onQueue('notifications');
   CalculateMetricsJob::dispatch()->onQueue('analytics');
   ```

2. **API Rate Limiting**
   ```php
   Route::middleware(['throttle:api'])->group(function () {
       // API routes
   });
   ```

3. **Database Partitioning**
   - Consider partitioning work_orders table by year
   - Archive closed work orders after X months

### Error Handling

1. **Graceful Failures**
   ```php
   try {
       $workOrder = $routine->generateWorkOrder();
   } catch (\Exception $e) {
       Log::error('Failed to generate work order', [
           'routine_id' => $routine->id,
           'error' => $e->getMessage()
       ]);
       // Continue with next routine
   }
   ```

2. **User-Friendly Messages**
   - Translate technical errors
   - Provide actionable feedback
   - Log detailed errors for debugging

## Conclusion

This unified work order system provides a clean, powerful architecture that:

1. **Simplifies** the codebase by eliminating redundant execution models
2. **Unifies** all maintenance activities under a single system
3. **Enables** rich features for all types of work
4. **Scales** with organizational needs
5. **Maintains** data integrity and audit trails

The implementation plan provides a clear path forward with minimal risk since the system hasn't been deployed to production yet. The architecture is designed to be extensible, allowing for future enhancements like IoT integration, advanced analytics, and mobile applications.