<?php

namespace App\Console\Commands;

use App\Services\WorkOrders\WorkOrderGenerationService;
use Illuminate\Console\Command;

class GenerateWorkOrdersFromRoutines extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'work-orders:generate-from-routines';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate work orders from active routines that are due';

    /**
     * Execute the console command.
     */
    public function handle(WorkOrderGenerationService $generationService): int
    {
        $this->info('Checking routines for work order generation...');
        
        $workOrders = $generationService->generateDueWorkOrders();
        
        if ($workOrders->isEmpty()) {
            $this->info('No work orders generated. No routines are due.');
            return 0;
        }
        
        $this->info("Generated {$workOrders->count()} work orders:");
        
        foreach ($workOrders as $workOrder) {
            $this->line(" - {$workOrder->work_order_number}: {$workOrder->title}");
        }
        
        return 0;
    }
}