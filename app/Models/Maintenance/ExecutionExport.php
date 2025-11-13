<?php

namespace App\Models\Maintenance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExecutionExport extends Model
{
    protected $fillable = [
        'user_id',
        'export_type',
        'export_format',
        'execution_ids',
        'file_path',
        'status',
        'metadata',
        'completed_at',
    ];

    protected $casts = [
        'execution_ids' => 'array',
        'metadata' => 'array',
        'completed_at' => 'datetime',
    ];

    public const TYPE_SINGLE = 'single';

    public const TYPE_BATCH = 'batch';

    public const FORMAT_PDF = 'pdf';

    public const FORMAT_CSV = 'csv';

    public const FORMAT_EXCEL = 'excel';

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    /**
     * Get the user who initiated the export.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * Mark export as processing.
     */
    public function markAsProcessing(): void
    {
        $this->update(['status' => self::STATUS_PROCESSING]);
    }

    /**
     * Mark export as completed.
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark export as failed.
     */
    public function markAsFailed(): void
    {
        $this->update(['status' => self::STATUS_FAILED]);
    }

    /**
     * Get the executions for this export.
     */
    public function getExecutions()
    {
        return \App\Models\WorkOrders\WorkOrderExecution::whereIn('id', $this->execution_ids)->get();
    }

    /**
     * Check if export is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if export is processing.
     */
    public function isProcessing(): bool
    {
        return $this->status === self::STATUS_PROCESSING;
    }

    /**
     * Check if export is pending.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if export has failed.
     */
    public function hasFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Get the estimated file size based on execution count.
     */
    public function getEstimatedSizeKB(): int
    {
        $executionCount = count($this->execution_ids);

        // Rough estimate: 50KB per execution for PDF, 5KB for CSV/Excel
        return match ($this->export_format) {
            self::FORMAT_PDF => $executionCount * 50,
            self::FORMAT_CSV, self::FORMAT_EXCEL => $executionCount * 5,
            default => $executionCount * 25,
        };
    }
}
