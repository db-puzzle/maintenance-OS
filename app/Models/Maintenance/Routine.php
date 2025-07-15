<?php

namespace App\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\WorkOrders\WorkOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class Routine extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'name',
        'trigger_type',
        'trigger_runtime_hours',
        'trigger_calendar_days',
        'execution_mode',
        'description',
        'form_id',
        'active_form_version_id',
        'advance_generation_hours',
        'auto_approve_work_orders',
        'default_priority',
        'priority_score',
        'last_execution_runtime_hours',
        'last_execution_completed_at',
        'last_execution_form_version_id',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'trigger_runtime_hours' => 'integer',
        'trigger_calendar_days' => 'integer',
        'advance_generation_hours' => 'integer',
        'auto_approve_work_orders' => 'boolean',
        'last_execution_runtime_hours' => 'decimal:2',
        'last_execution_completed_at' => 'datetime',
        'priority_score' => 'integer',
        'is_active' => 'boolean',
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

    public function lastExecutionFormVersion(): BelongsTo
    {
        return $this->belongsTo(FormVersion::class, 'last_execution_form_version_id');
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'source_id')
            ->where('source_type', 'routine');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeAutomatic($query)
    {
        return $query->where('execution_mode', 'automatic');
    }

    public function scopeManual($query)
    {
        return $query->where('execution_mode', 'manual');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRuntimeBased($query)
    {
        return $query->where('trigger_type', 'runtime_hours');
    }

    public function scopeCalendarBased($query)
    {
        return $query->where('trigger_type', 'calendar_days');
    }

    // Helper methods
    public function isDue(): bool
    {
        $hoursUntilDue = $this->calculateHoursUntilDue();
        return $hoursUntilDue !== null && $hoursUntilDue <= 0;
    }

    public function getHoursUntilDue(): float
    {
        return $this->calculateHoursUntilDue() ?? 0;
    }

    public function calculateHoursUntilDue(): ?float
    {
        if ($this->trigger_type === 'runtime_hours') {
            return $this->calculateRuntimeHoursUntilDue();
        } else {
            return $this->calculateCalendarHoursUntilDue();
        }
    }

    private function calculateRuntimeHoursUntilDue(): ?float
    {
        if (!$this->trigger_runtime_hours) {
            return null;
        }

        // If never executed, due immediately
        if (!$this->last_execution_runtime_hours) {
            return 0;
        }
        
        $currentRuntime = $this->asset->current_runtime_hours ?? 0;
        $runtimeSinceLastExecution = $currentRuntime - $this->last_execution_runtime_hours;
        $hoursRemaining = $this->trigger_runtime_hours - $runtimeSinceLastExecution;
        
        // Return actual runtime hours remaining, not calendar hours
        return max(0, $hoursRemaining);
    }

    private function calculateCalendarHoursUntilDue(): ?float
    {
        if (!$this->trigger_calendar_days) {
            return null;
        }

        // If never executed, due immediately
        if (!$this->last_execution_completed_at) {
            return 0;
        }
        
        $nextDueDate = $this->last_execution_completed_at->addDays($this->trigger_calendar_days);
        $hoursUntilDue = now()->diffInHours($nextDueDate, false);
        
        return max(0, $hoursUntilDue);
    }

    public function calculateDueDate(): Carbon
    {
        if ($this->trigger_type === 'runtime_hours') {
            $hoursUntilDue = $this->calculateRuntimeHoursUntilDue() ?? 0;
            return now()->addHours($hoursUntilDue);
        } else {
            if (!$this->last_execution_completed_at) {
                return now();
            }
            return $this->last_execution_completed_at->addDays($this->trigger_calendar_days);
        }
    }

    public function shouldGenerateWorkOrder(): bool
    {
        // Check if routine is active
        if (!$this->is_active) {
            return false;
        }

        // Check if no open work order exists (any status except verified/closed)
        if ($this->hasOpenWorkOrder()) {
            return false;
        }
        
        $hoursUntilDue = $this->calculateHoursUntilDue();
        
        return $hoursUntilDue !== null 
            && $hoursUntilDue <= ($this->advance_generation_hours ?? 24) 
            && $hoursUntilDue >= 0;
    }

    public function hasOpenWorkOrder(): bool
    {
        return WorkOrder::where('source_type', 'routine')
            ->where('source_id', $this->id)
            ->whereNotIn('status', ['verified', 'closed'])
            ->exists();
    }

    public function getOpenWorkOrder(): ?WorkOrder
    {
        return WorkOrder::where('source_type', 'routine')
            ->where('source_id', $this->id)
            ->whereNotIn('status', ['verified', 'closed'])
            ->first();
    }

    public function generateWorkOrder(): WorkOrder
    {
        $dueDate = $this->calculateDueDate();
        
        return WorkOrder::create([
            'discipline' => 'maintenance',
            'work_order_category' => 'preventive',
            'title' => $this->generateWorkOrderTitle(),
            'description' => $this->generateWorkOrderDescription(),
            'work_order_type_id' => $this->getWorkOrderTypeId(),
            'asset_id' => $this->asset_id,
            'priority' => $this->default_priority ?? 'normal',
            'priority_score' => $this->priority_score ?? 50,
            'source_type' => 'routine',
            'source_id' => $this->id,
            'form_id' => $this->form_id,
            'form_version_id' => $this->active_form_version_id ?? $this->form->current_version_id,
            'requested_by' => $this->created_by ?? auth()->id() ?? 1,
            'requested_at' => now(),
            'requested_due_date' => $dueDate,
            'status' => 'requested',
        ]);
    }

    private function generateWorkOrderTitle(): string
    {
        $interval = $this->trigger_type === 'runtime_hours' 
            ? "{$this->trigger_runtime_hours}h" 
            : "{$this->trigger_calendar_days} dias";
            
        return "Manutenção Preventiva - {$this->name} ({$interval})";
    }

    private function generateWorkOrderDescription(): string
    {
        $triggerInfo = $this->trigger_type === 'runtime_hours'
            ? "Baseada em horas de operação: {$this->trigger_runtime_hours} horas"
            : "Baseada em calendário: a cada {$this->trigger_calendar_days} dias";
            
        $description = $this->description ?? "Executar rotina de manutenção preventiva conforme procedimento padrão.";
        
        return "{$description}\n\n{$triggerInfo}";
    }

    private function getWorkOrderTypeId(): int
    {
        // Get preventive work order type
        $workOrderType = \App\Models\WorkOrders\WorkOrderType::where('category', 'preventive')
            ->where('is_active', true)
            ->first();
            
        if (!$workOrderType) {
            throw new \RuntimeException('No active preventive work order type found');
        }
        
        return $workOrderType->id;
    }

    // Permission validation for auto-approval
    public function setAutoApproveWorkOrdersAttribute($value)
    {
        if ($value && auth()->check() && !auth()->user()->can('work-orders.approve')) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                'You do not have permission to enable automatic work order approval'
            );
        }
        
        $this->attributes['auto_approve_work_orders'] = $value;
    }

    // Computed attributes
    public function getProgressPercentageAttribute(): float
    {
        $hoursUntilDue = $this->calculateHoursUntilDue();
        
        if ($hoursUntilDue === null) {
            return 0;
        }
        
        if ($this->trigger_type === 'runtime_hours') {
            if (!$this->last_execution_runtime_hours || !$this->trigger_runtime_hours) {
                return 100; // Due if never executed
            }
            
            $currentRuntime = $this->asset->current_runtime_hours ?? 0;
            $runtimeSinceLastExecution = $currentRuntime - $this->last_execution_runtime_hours;
            $progress = ($runtimeSinceLastExecution / $this->trigger_runtime_hours) * 100;
        } else {
            if (!$this->last_execution_completed_at || !$this->trigger_calendar_days) {
                return 100; // Due if never executed
            }
            
            $daysSinceLastExecution = $this->last_execution_completed_at->diffInDays(now());
            $progress = ($daysSinceLastExecution / $this->trigger_calendar_days) * 100;
        }
        
        return min(100, max(0, $progress));
    }

    public function getEstimatedHoursUntilDueAttribute(): ?float
    {
        if ($this->trigger_type !== 'runtime_hours') {
            return null;
        }
        
        return $this->calculateRuntimeHoursUntilDue();
    }

    public function getNextDueDateAttribute(): ?string
    {
        if ($this->trigger_type !== 'calendar_days') {
            return null;
        }
        
        if (!$this->last_execution_completed_at) {
            return now()->toIso8601String();
        }
        
        return $this->last_execution_completed_at
            ->addDays($this->trigger_calendar_days)
            ->toIso8601String();
    }

    // Boot method to handle form creation
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($routine) {
            // Create associated form if not provided
            if (!$routine->form_id) {
                $form = Form::create([
                    'name' => $routine->name . ' - Form',
                    'description' => 'Form for routine: ' . $routine->name,
                    'created_by' => $routine->created_by ?? auth()->id() ?? 1,
                    'is_active' => true,
                ]);
                
                $routine->form_id = $form->id;
            }
        });
    }
}

