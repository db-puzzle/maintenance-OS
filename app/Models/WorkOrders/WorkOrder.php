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
use Illuminate\Support\Facades\DB;

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
            ->max(DB::raw("CAST(SUBSTRING_INDEX(work_order_number, '-', -1) AS UNSIGNED)"));
        
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