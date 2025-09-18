<?php

namespace App\Services;

use App\Models\Production\ScheduleAlert;
use App\Models\Production\ScheduleVersion;
use Illuminate\Support\Collection;

class ScheduleAlertService
{
    /**
     * Get alerts for a schedule version.
     */
    public function getAlertsForVersion(
        ScheduleVersion $version,
        array $filters = []
    ): Collection {
        $query = $version->alerts()
            ->with([
                'manufacturingOrder.item',
                'manufacturingStep.manufacturingRoute',
                'workCell',
            ]);

        if (!empty($filters['type'])) {
            $query->where('alert_type', $filters['type']);
        }

        if (!empty($filters['severity'])) {
            $query->where('severity', $filters['severity']);
        }

        if (isset($filters['resolved'])) {
            $query->where('resolved', $filters['resolved']);
        }

        return $query->orderBy('severity', 'desc')
                     ->orderBy('created_at', 'desc')
                     ->get();
    }

    /**
     * Get alert statistics for a version.
     */
    public function getAlertStatistics(ScheduleVersion $version): array
    {
        $alerts = $version->alerts;

        return [
            'total' => $alerts->count(),
            'unresolved' => $alerts->where('resolved', false)->count(),
            'by_type' => [
                'capacity_overrun' => $alerts->where('alert_type', 'capacity_overrun')->count(),
                'dependency_violation' => $alerts->where('alert_type', 'dependency_violation')->count(),
                'late_delivery' => $alerts->where('alert_type', 'late_delivery')->count(),
            ],
            'by_severity' => [
                'error' => $alerts->where('severity', 'error')->count(),
                'warning' => $alerts->where('severity', 'warning')->count(),
            ],
        ];
    }

    /**
     * Check if version has critical alerts.
     */
    public function hasCriticalAlerts(ScheduleVersion $version): bool
    {
        return $version->alerts()
            ->where('severity', 'error')
            ->where('resolved', false)
            ->exists();
    }

    /**
     * Resolve an alert.
     */
    public function resolveAlert(ScheduleAlert $alert): void
    {
        $alert->update(['resolved' => true]);
    }

    /**
     * Group alerts by manufacturing order.
     */
    public function groupAlertsByOrder(Collection $alerts): Collection
    {
        return $alerts->groupBy('manufacturing_order_id')
            ->map(function ($orderAlerts, $orderId) {
                $order = $orderAlerts->first()->manufacturingOrder;
                
                return [
                    'order_id' => $orderId,
                    'order_number' => $order?->order_number,
                    'item_name' => $order?->item?->name,
                    'alerts' => $orderAlerts,
                    'error_count' => $orderAlerts->where('severity', 'error')->count(),
                    'warning_count' => $orderAlerts->where('severity', 'warning')->count(),
                ];
            });
    }

    /**
     * Group alerts by work cell.
     */
    public function groupAlertsByWorkCell(Collection $alerts): Collection
    {
        return $alerts->groupBy('work_cell_id')
            ->map(function ($cellAlerts, $cellId) {
                $workCell = $cellAlerts->first()->workCell;
                
                return [
                    'work_cell_id' => $cellId,
                    'work_cell_name' => $workCell?->name,
                    'alerts' => $cellAlerts,
                    'error_count' => $cellAlerts->where('severity', 'error')->count(),
                    'warning_count' => $cellAlerts->where('severity', 'warning')->count(),
                ];
            });
    }

    /**
     * Create alert summary for notification.
     */
    public function createAlertSummary(Collection $alerts): string
    {
        $errorCount = $alerts->where('severity', 'error')->count();
        $warningCount = $alerts->where('severity', 'warning')->count();

        $summary = [];
        
        if ($errorCount > 0) {
            $summary[] = "{$errorCount} error" . ($errorCount > 1 ? 's' : '');
        }
        
        if ($warningCount > 0) {
            $summary[] = "{$warningCount} warning" . ($warningCount > 1 ? 's' : '');
        }

        return implode(' and ', $summary) ?: 'No alerts';
    }
}