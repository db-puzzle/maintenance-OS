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
                'code' => $workOrder->code,
                'title' => $workOrder->title,
                'type' => $workOrder->workOrderType->name ?? null,
                'priority' => $workOrder->priority,
                'created_by' => auth()->user()?->name ?? 'System',
            ]
        );

        // Create initial status history
        $workOrder->statusHistory()->create([
            'from_status' => null,
            'to_status' => 'pending',
            'changed_by' => $workOrder->created_by ?? auth()->id(),
            'notes' => 'Ordem de serviço criada',
        ]);
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
                'code' => $workOrder->code,
                'updated_by' => auth()->user()?->name ?? 'System',
            ]
        );

        // If assigned_to changed, log assignment
        if (isset($changes['assigned_to'])) {
            $oldAssignee = $original['assigned_to'] ? \App\Models\User::find($original['assigned_to'])?->name : 'Ninguém';
            $newAssignee = $workOrder->assignedTo?->name ?? 'Ninguém';

            AuditLogService::log(
                'work-order.assigned',
                'assigned',
                $workOrder,
                ['assigned_to' => $oldAssignee],
                ['assigned_to' => $newAssignee],
                [
                    'code' => $workOrder->code,
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
                    'code' => $workOrder->code,
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
                'code' => $workOrder->code,
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
                'code' => $workOrder->code,
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
                'code' => $workOrder->code,
                'title' => $workOrder->title,
                'deleted_by' => auth()->user()?->name ?? 'System',
            ]
        );
    }
} 