<?php

namespace App\Observers;

use App\Models\WorkOrders\WorkOrder;
use App\Services\AuditLogService;

class WorkOrderObserver
{
    /**
     * Handle the WorkOrder "created" event.
     */
    public function created(WorkOrder $workOrder): void
    {
        // Log work order creation
        AuditLogService::log(
            'work-order.created',
            'created',
            $workOrder,
            [],
            $workOrder->toArray(),
            [
                'work_order_number' => $workOrder->work_order_number,
                'title' => $workOrder->title,
                'type' => $workOrder->type->name ?? null,
                'priority' => $workOrder->priority,
                'discipline' => $workOrder->discipline,
                'category' => $workOrder->workOrderCategory?->code,
                'created_by' => auth()->user()?->name ?? 'System',
            ]
        );

        // Note: Initial status history is created by BaseWorkOrderService
    }

    /**
     * Handle the WorkOrder "updated" event.
     */
    public function updated(WorkOrder $workOrder): void
    {
        $changes = $workOrder->getChanges();
        $original = $workOrder->getOriginal();

        // Log work order update
        AuditLogService::log(
            'work-order.updated',
            'updated',
            $workOrder,
            $original,
            $changes,
            [
                'work_order_number' => $workOrder->work_order_number,
                'updated_by' => auth()->user()?->name ?? 'System',
            ]
        );

        // If status changed, record in status history
        if (isset($changes['status'])) {
            $workOrder->statusHistory()->create([
                'from_status' => $original['status'],
                'to_status' => $workOrder->status,
                'changed_by' => auth()->id(),
            ]);
        }

        // If assigned_technician_id changed, log assignment
        if (isset($changes['assigned_technician_id'])) {
            $oldAssignee = $original['assigned_technician_id'] ? \App\Models\User::find($original['assigned_technician_id'])?->name : 'Ninguém';
            $newAssignee = $workOrder->assignedTechnician?->name ?? 'Ninguém';

            AuditLogService::log(
                'work-order.assigned',
                'assigned',
                $workOrder,
                ['assigned_to' => $oldAssignee],
                ['assigned_to' => $newAssignee],
                [
                    'work_order_number' => $workOrder->work_order_number,
                    'from' => $oldAssignee,
                    'to' => $newAssignee,
                    'assigned_by' => auth()->user()?->name ?? 'System',
                ]
            );
        }

        // If priority changed, log priority change
        if (isset($changes['priority'])) {
            AuditLogService::log(
                'work-order.priority-changed',
                'priority_changed',
                $workOrder,
                ['priority' => $original['priority']],
                ['priority' => $workOrder->priority],
                [
                    'work_order_number' => $workOrder->work_order_number,
                    'from' => $original['priority'],
                    'to' => $workOrder->priority,
                    'changed_by' => auth()->user()?->name ?? 'System',
                ]
            );
        }
    }

    /**
     * Handle the WorkOrder "deleted" event.
     */
    public function deleted(WorkOrder $workOrder): void
    {
        AuditLogService::log(
            'work-order.deleted',
            'deleted',
            $workOrder,
            $workOrder->toArray(),
            [],
            [
                'work_order_number' => $workOrder->work_order_number,
                'title' => $workOrder->title,
                'deleted_by' => auth()->user()?->name ?? 'System',
            ]
        );
    }

    /**
     * Handle the WorkOrder "restored" event.
     */
    public function restored(WorkOrder $workOrder): void
    {
        AuditLogService::log(
            'work-order.restored',
            'restored',
            $workOrder,
            [],
            $workOrder->toArray(),
            [
                'work_order_number' => $workOrder->work_order_number,
                'title' => $workOrder->title,
                'restored_by' => auth()->user()?->name ?? 'System',
            ]
        );
    }

    /**
     * Handle the WorkOrder "force deleted" event.
     */
    public function forceDeleted(WorkOrder $workOrder): void
    {
        AuditLogService::log(
            'work-order.force-deleted',
            'force_deleted',
            $workOrder,
            $workOrder->toArray(),
            [],
            [
                'work_order_number' => $workOrder->work_order_number,
                'title' => $workOrder->title,
                'deleted_by' => auth()->user()?->name ?? 'System',
            ]
        );
    }
} 