<?php

namespace App\Services\Scheduling;

/**
 * Result structure returned by scheduling algorithms.
 */
class SchedulingResult
{
    public bool $success = false;
    public array $scheduledSteps = []; // Array of StepScheduleData
    public array $alerts = []; // Array of alert data for creating ScheduleAlert models
    public array $metrics = [];
    public float $executionTime = 0.0;

    public function __construct(array $data = [])
    {
        if (isset($data['success'])) $this->success = $data['success'];
        if (isset($data['scheduledSteps'])) $this->scheduledSteps = $data['scheduledSteps'];
        if (isset($data['alerts'])) $this->alerts = $data['alerts'];
        if (isset($data['metrics'])) $this->metrics = $data['metrics'];
        if (isset($data['executionTime'])) $this->executionTime = $data['executionTime'];
    }
}
