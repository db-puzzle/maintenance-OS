<?php

namespace App\Services\Scheduling;

use App\Models\Production\ManufacturingOrder;

class ASAPScheduler extends BaseScheduler
{
    /**
     * Schedule all operations at the earliest possible time using HDG approach.
     */
    public function schedule(SchedulingRequest $request): SchedulingResult
    {
        $startTime = microtime(true);

        // Load MOs with full relationships needed for family scheduling
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->with([
                'manufacturingRoute.steps.workCell',
                'manufacturingRoute.steps.dependency',
                'children',
                'parent',
            ])
            ->get();

        // Use the family-based scheduling from BaseScheduler
        $result = $this->scheduleByFamilies($orders, $request);

        $result->executionTime = microtime(true) - $startTime;

        $this->logPerformance(
            'ASAP-HDG',
            $orders->count(),
            count($result->scheduledSteps),
            $result->executionTime
        );

        return $result;
    }
}
