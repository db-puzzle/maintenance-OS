<?php

namespace App\Services\Scheduling;

use DateTime;

/**
 * Represents scheduled data for a single manufacturing step.
 */
class StepScheduleData
{
    public int $stepId;
    public int $workCellId;
    public DateTime $scheduledStart;
    public DateTime $scheduledEnd;
    public bool $isLocked = false;
    public array $conflicts = [];

    public function __construct(array $data = [])
    {
        if (isset($data['stepId'])) $this->stepId = $data['stepId'];
        if (isset($data['workCellId'])) $this->workCellId = $data['workCellId'];
        if (isset($data['scheduledStart'])) $this->scheduledStart = $data['scheduledStart'] instanceof DateTime ? $data['scheduledStart'] : new DateTime($data['scheduledStart']);
        if (isset($data['scheduledEnd'])) $this->scheduledEnd = $data['scheduledEnd'] instanceof DateTime ? $data['scheduledEnd'] : new DateTime($data['scheduledEnd']);
        if (isset($data['isLocked'])) $this->isLocked = $data['isLocked'];
        if (isset($data['conflicts'])) $this->conflicts = $data['conflicts'];
    }
}
