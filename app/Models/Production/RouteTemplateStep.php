<?php

namespace App\Models\Production;

use App\Models\Forms\Form;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouteTemplateStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_template_id',
        'step_number',
        'step_type',
        'name',
        'description',
        'setup_time_minutes',
        'cycle_time_minutes',
        'work_cell_id',
        'form_id',
        'quality_check_mode',
        'sampling_size',
    ];

    protected $casts = [
        'step_type' => 'string',
        'quality_check_mode' => 'string',
        'setup_time_minutes' => 'integer',
        'cycle_time_minutes' => 'integer',
        'sampling_size' => 'integer',
    ];

    /**
     * Get the route template.
     */
    public function routeTemplate(): BelongsTo
    {
        return $this->belongsTo(RouteTemplate::class);
    }

    /**
     * Get the work cell.
     */
    public function workCell(): BelongsTo
    {
        return $this->belongsTo(WorkCell::class);
    }

    /**
     * Get the form.
     */
    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /**
     * Get total time for the step.
     */
    public function getTotalTimeAttribute(): int
    {
        return $this->setup_time_minutes + $this->cycle_time_minutes;
    }

    /**
     * Check if this is a quality check step.
     */
    public function isQualityCheck(): bool
    {
        return $this->step_type === 'quality_check';
    }

    /**
     * Check if this is a rework step.
     */
    public function isRework(): bool
    {
        return $this->step_type === 'rework';
    }

    /**
     * Get sample size for quality checks.
     */
    public function calculateSampleSize(int $lotSize): int
    {
        if ($this->quality_check_mode !== 'sampling') {
            return $lotSize;
        }

        // If specific sample size is set, use it
        if ($this->sampling_size) {
            return min($this->sampling_size, $lotSize);
        }

        // Otherwise, use ISO 2859 standard sampling
        return $this->getISO2859SampleSize($lotSize);
    }

    /**
     * Get ISO 2859 sample size based on lot size.
     */
    private function getISO2859SampleSize(int $lotSize): int
    {
        // Simplified ISO 2859 Level II sampling
        if ($lotSize <= 8) return $lotSize;
        if ($lotSize <= 15) return 5;
        if ($lotSize <= 25) return 8;
        if ($lotSize <= 50) return 13;
        if ($lotSize <= 90) return 20;
        if ($lotSize <= 150) return 32;
        if ($lotSize <= 280) return 50;
        if ($lotSize <= 500) return 80;
        if ($lotSize <= 1200) return 125;
        if ($lotSize <= 3200) return 200;
        if ($lotSize <= 10000) return 315;
        
        return 500;
    }
}