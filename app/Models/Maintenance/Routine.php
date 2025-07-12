<?php

namespace App\Models\Maintenance;

use App\Models\AssetHierarchy\Asset;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Routine extends Model
{
    use HasFactory;

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

    protected static function booted()
    {
        // Automatically create a form when a routine is created
        static::creating(function ($routine) {
            if (! $routine->form_id) {
                $form = Form::create([
                    'name' => $routine->name.' - Form',
                    'description' => 'Form for routine: '.$routine->name,
                    'is_active' => true,
                    'created_by' => auth()->id() ?? null,
                ]);
                $routine->form_id = $form->id;
            }
        });

        // Delete the associated form when the routine is deleted
        static::deleting(function ($routine) {
            if ($routine->form) {
                // Delete all form versions and their tasks
                foreach ($routine->form->versions as $version) {
                    $version->tasks()->delete();
                }
                $routine->form->versions()->delete();

                // Delete draft tasks
                $routine->form->draftTasks()->delete();

                // Then delete the form
                $routine->form->delete();
            }
        });
    }

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
        $workOrderType = WorkOrderType::where('code', 'pm_routine')->first();
        return $this->auto_approve_work_orders && 
               $workOrderType?->auto_approve_from_routine ?? false;
    }

    /**
     * Check if the routine has a published form version
     */
    public function hasPublishedForm(): bool
    {
        return $this->getFormVersionForExecution() !== null;
    }

    /**
     * Get the form version to use for new executions
     */
    public function getFormVersionForExecution(): ?FormVersion
    {
        // Use the routine's active version if set
        if ($this->active_form_version_id) {
            return $this->activeFormVersion;
        }

        // Otherwise use the form's current version
        return $this->form->currentVersion;
    }
}
