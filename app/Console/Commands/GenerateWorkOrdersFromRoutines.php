<?php

namespace App\Console\Commands;

use App\Models\Maintenance\Routine;
use App\Services\WorkOrders\WorkOrderGenerationService;
use Illuminate\Console\Command;

class GenerateWorkOrdersFromRoutines extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'workorders:generate-from-routines';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate work orders from routines based on their triggers';

    /**
     * Execute the console command.
     */
    public function handle(WorkOrderGenerationService $generationService): int
    {
        $this->info('Checking routines for work order generation...');
        
        // Process runtime-based routines
        $runtimeRoutines = Routine::automatic()
            ->active()
            ->runtimeBased()
            ->with(['asset.latestRuntimeMeasurement'])
            ->get();
            
        $this->info("Found {$runtimeRoutines->count()} active runtime-based routines");
        
        // Process calendar-based routines
        $calendarRoutines = Routine::automatic()
            ->active()
            ->calendarBased()
            ->get();
            
        $this->info("Found {$calendarRoutines->count()} active calendar-based routines");
        
        // Generate work orders
        $workOrders = $generationService->generateDueWorkOrders();
        
        if ($workOrders->isEmpty()) {
            $this->info('No work orders generated. No routines are due.');
        } else {
            $this->info("Generated {$workOrders->count()} work orders:");
            
            foreach ($workOrders as $workOrder) {
                $routine = Routine::find($workOrder->source_id);
                if ($routine) {
                    $triggerInfo = $routine->trigger_type === 'runtime_hours'
                        ? "{$routine->trigger_runtime_hours}h runtime"
                        : "{$routine->trigger_calendar_days} days";
                        
                    $this->line("- WO #{$workOrder->work_order_number} for {$routine->name} ({$triggerInfo})");
                }
            }
        }
        
        // Log routines that were due but had open work orders
        $this->checkSkippedRoutines($runtimeRoutines->merge($calendarRoutines));
        
        return 0;
    }
    
    /**
     * Check and report routines that were skipped
     */
    protected function checkSkippedRoutines($routines): void
    {
        $skippedCount = 0;
        
        foreach ($routines as $routine) {
            $hoursUntilDue = $routine->calculateHoursUntilDue();
            
            if ($hoursUntilDue !== null && $hoursUntilDue <= ($routine->advance_generation_days ?? 24) && $hoursUntilDue >= 0) {
                if ($routine->hasOpenWorkOrder()) {
                    $openWO = $routine->getOpenWorkOrder();
                    $this->warn("- Skipped {$routine->name}: Open WO #{$openWO->work_order_number} (Status: {$openWO->status})");
                    $skippedCount++;
                }
            }
        }
        
        if ($skippedCount > 0) {
            $this->info("Skipped {$skippedCount} routines with open work orders");
        }
    }
}