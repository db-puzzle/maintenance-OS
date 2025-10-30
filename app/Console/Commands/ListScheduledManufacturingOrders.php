<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ListScheduledManufacturingOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mo:list-scheduled
                            {--schedule-version= : Schedule version ID to filter by}
                            {--status= : Schedule version status to filter by (draft/published)}
                            {--from= : Start date for scheduled orders (Y-m-d)}
                            {--to= : End date for scheduled orders (Y-m-d)}
                            {--work-cell= : Work cell ID to filter by}
                            {--locked : Show only locked schedules}
                            {--format=table : Output format (table/json/csv)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'List scheduled manufacturing orders from the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $query = DB::table('production_schedules as ps')
            ->join('manufacturing_steps as ms', 'ps.manufacturing_step_id', '=', 'ms.id')
            ->join('manufacturing_routes as mr', 'ms.manufacturing_route_id', '=', 'mr.id')
            ->join('manufacturing_orders as mo', 'mr.manufacturing_order_id', '=', 'mo.id')
            ->join('schedule_versions as sv', 'ps.schedule_version_id', '=', 'sv.id')
            ->join('work_cells as wc', 'ps.work_cell_id', '=', 'wc.id')
            ->leftJoin('items as i', 'mo.item_id', '=', 'i.id')
            ->leftJoin('users as u', 'ps.locked_by', '=', 'u.id')
            ->select([
                'mo.id as mo_id',
                'mo.order_number',
                'mo.status as mo_status',
                'mo.quantity',
                'mo.quantity_completed',
                'mo.quantity_scrapped',
                'mo.priority',
                'i.item_number as item_code',
                'i.name as item_name',
                'ms.id as step_id',
                'ms.name as step_name',
                'ms.display_position',
                'ms.status as step_status',
                'wc.name as work_cell',
                'ps.scheduled_start',
                'ps.scheduled_end',
                'ps.is_locked',
                'u.name as locked_by',
                'ps.locked_at',
                'sv.version_number as schedule_version',
                'sv.status as version_status',
                'sv.last_algorithm_used',
                'ps.conflicts',
            ])
            ->orderBy('ps.scheduled_start')
            ->orderBy('mo.order_number')
            ->orderBy('ms.id');

        // Apply filters
        if ($versionId = $this->option('schedule-version')) {
            $query->where('ps.schedule_version_id', $versionId);
        }

        if ($status = $this->option('status')) {
            $query->where('sv.status', $status);
        }

        if ($from = $this->option('from')) {
            $query->where('ps.scheduled_start', '>=', $from . ' 00:00:00');
        }

        if ($to = $this->option('to')) {
            $query->where('ps.scheduled_end', '<=', $to . ' 23:59:59');
        }

        if ($workCellId = $this->option('work-cell')) {
            $query->where('ps.work_cell_id', $workCellId);
        }

        if ($this->option('locked')) {
            $query->where('ps.is_locked', true);
        }

        $results = $query->get();

        if ($results->isEmpty()) {
            $this->warn('No scheduled manufacturing orders found.');

            return 0;
        }

        $format = $this->option('format');

        switch ($format) {
            case 'json':
                $this->outputJson($results);
                break;
            case 'csv':
                $this->outputCsv($results);
                break;
            default:
                $this->outputTable($results);
        }

        $this->info("\nTotal scheduled MO steps found: " . $results->count());

        // Show summary statistics
        $summary = $results->groupBy('mo_id');
        $this->info('Unique manufacturing orders: ' . $summary->count());

        $versionStats = $results->groupBy('version_status');
        foreach ($versionStats as $status => $items) {
            $this->info("Schedule version status '$status': " . $items->count() . ' steps');
        }

        return 0;
    }

    /**
     * Output results as a table.
     */
    private function outputTable($results)
    {
        $headers = [
            'MO Number',
            'Item',
            'Quantity',
            'Progress',
            'Step',
            'Work Cell',
            'Scheduled Start',
            'Scheduled End',
            'Duration',
            'Status',
            'Locked',
            'Version',
        ];

        $rows = $results->map(function ($row) {
            $start = new \DateTime($row->scheduled_start);
            $end = new \DateTime($row->scheduled_end);
            $duration = $start->diff($end);
            $durationStr = $duration->format('%H:%I');

            $progress = sprintf(
                '%.1f%%',
                $row->quantity > 0 ? ($row->quantity_completed / $row->quantity * 100) : 0
            );

            return [
                $row->order_number,
                $row->item_code . ' - ' . substr($row->item_name, 0, 30),
                $row->quantity . ' (' . $progress . ')',
                $row->quantity_completed . '/' . $row->quantity,
                '#' . $row->display_position . ' ' . substr($row->step_name, 0, 20),
                $row->work_cell,
                $start->format('Y-m-d H:i'),
                $end->format('Y-m-d H:i'),
                $durationStr,
                $row->step_status,
                $row->is_locked ? 'Yes' : 'No',
                'v' . $row->schedule_version . ' (' . $row->version_status . ')',
            ];
        })->toArray();

        $this->table($headers, $rows);

        // Show conflicts if any
        $conflicts = $results->filter(function ($row) {
            return ! empty($row->conflicts);
        });

        if ($conflicts->isNotEmpty()) {
            $this->warn("\nSchedules with conflicts:");
            foreach ($conflicts as $row) {
                $this->warn("- MO {$row->order_number}, Step {$row->display_position}: " . $row->conflicts);
            }
        }
    }

    /**
     * Output results as JSON.
     */
    private function outputJson($results)
    {
        $output = $results->map(function ($row) {
            return [
                'manufacturing_order' => [
                    'id' => $row->mo_id,
                    'order_number' => $row->order_number,
                    'status' => $row->mo_status,
                    'priority' => $row->priority,
                    'quantity' => $row->quantity,
                    'quantity_completed' => $row->quantity_completed,
                    'quantity_scrapped' => $row->quantity_scrapped,
                ],
                'item' => [
                    'code' => $row->item_code,
                    'name' => $row->item_name,
                ],
                'step' => [
                    'id' => $row->step_id,
                    'number' => $row->display_position,
                    'name' => $row->step_name,
                    'status' => $row->step_status,
                ],
                'schedule' => [
                    'work_cell' => $row->work_cell,
                    'scheduled_start' => $row->scheduled_start,
                    'scheduled_end' => $row->scheduled_end,
                    'is_locked' => $row->is_locked,
                    'locked_by' => $row->locked_by,
                    'locked_at' => $row->locked_at,
                    'conflicts' => $row->conflicts ? json_decode($row->conflicts) : null,
                ],
                'version' => [
                    'number' => $row->schedule_version,
                    'status' => $row->version_status,
                    'algorithm' => $row->last_algorithm_used,
                ],
            ];
        });

        $this->line(json_encode($output, JSON_PRETTY_PRINT));
    }

    /**
     * Output results as CSV.
     */
    private function outputCsv($results)
    {
        $headers = [
            'MO_ID',
            'Order_Number',
            'MO_Status',
            'Priority',
            'Item_Code',
            'Item_Name',
            'Quantity',
            'Quantity_Completed',
            'Quantity_Scrapped',
            'Step_ID',
            'Step_Number',
            'Step_Name',
            'Step_Status',
            'Work_Cell',
            'Scheduled_Start',
            'Scheduled_End',
            'Is_Locked',
            'Locked_By',
            'Locked_At',
            'Schedule_Version',
            'Version_Status',
            'Algorithm_Used',
            'Conflicts',
        ];

        $this->line(implode(',', $headers));

        foreach ($results as $row) {
            $csvRow = [
                $row->mo_id,
                $row->order_number,
                $row->mo_status,
                $row->priority,
                $row->item_code,
                '"' . str_replace('"', '""', $row->item_name) . '"',
                $row->quantity,
                $row->quantity_completed,
                $row->quantity_scrapped,
                $row->step_id,
                $row->display_position,
                '"' . str_replace('"', '""', $row->step_name) . '"',
                $row->step_status,
                $row->work_cell,
                $row->scheduled_start,
                $row->scheduled_end,
                $row->is_locked ? 'Yes' : 'No',
                $row->locked_by ?: '',
                $row->locked_at ?: '',
                $row->schedule_version,
                $row->version_status,
                $row->last_algorithm_used ?: '',
                $row->conflicts ? '"' . str_replace('"', '""', $row->conflicts) . '"' : '',
            ];

            $this->line(implode(',', $csvRow));
        }
    }
}
