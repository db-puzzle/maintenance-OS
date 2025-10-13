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

        \Log::info('ASAPScheduler::schedule - Start', [
            'order_ids' => $request->manufacturingOrderIds,
            'order_count' => count($request->manufacturingOrderIds),
            'algorithm' => $request->algorithmType,
            'start_date' => $request->scheduleStartDate?->format('Y-m-d'),
            'end_date' => $request->scheduleEndDate?->format('Y-m-d'),
        ]);

        // Load MOs with full relationships needed for family scheduling
        $orders = ManufacturingOrder::whereIn('id', $request->manufacturingOrderIds)
            ->with([
                'manufacturingRoute.steps.workCell',
                'manufacturingRoute.steps.dependency',
                'children',
                'parent',
            ])
            ->get();

        \Log::info('ASAPScheduler::schedule - Loaded orders', [
            'requested_count' => count($request->manufacturingOrderIds),
            'loaded_count' => $orders->count(),
            'orders' => $orders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'has_route' => $order->manufacturingRoute !== null,
                    'step_count' => $order->manufacturingRoute ? $order->manufacturingRoute->steps->count() : 0,
                    'has_parent' => $order->parent_id !== null,
                    'children_count' => $order->children->count(),
                ];
            })->toArray(),
        ]);

        // Use the family-based scheduling from BaseScheduler
        $result = $this->scheduleByFamilies($orders, $request);

        $result->executionTime = microtime(true) - $startTime;

        \Log::info('ASAPScheduler::schedule - Completed', [
            'success' => $result->success,
            'scheduled_steps_count' => count($result->scheduledSteps),
            'alerts_count' => count($result->alerts),
            'execution_time' => $result->executionTime,
        ]);

        $this->logPerformance(
            'ASAP-HDG',
            $orders->count(),
            count($result->scheduledSteps),
            $result->executionTime
        );

        return $result;
    }
}
