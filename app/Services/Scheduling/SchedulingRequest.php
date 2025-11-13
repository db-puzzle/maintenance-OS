<?php

namespace App\Services\Scheduling;

use DateTime;

/**
 * Input structure for scheduling requests.
 */
class SchedulingRequest
{
    public array $manufacturingOrderIds;
    public string $algorithmType;
    public int $scheduleVersionId;
    public ?DateTime $scheduleStartDate;
    public ?DateTime $scheduleEndDate;

    public function __construct(array $data)
    {
        $this->manufacturingOrderIds = $data['manufacturingOrderIds'] ?? [];
        $this->algorithmType = $data['algorithmType'] ?? 'asap';
        $this->scheduleVersionId = $data['scheduleVersionId'];
        $this->scheduleStartDate = isset($data['scheduleStartDate'])
            ? new DateTime($data['scheduleStartDate'])
            : null;
        $this->scheduleEndDate = isset($data['scheduleEndDate'])
            ? new DateTime($data['scheduleEndDate'])
            : null;
    }
}
