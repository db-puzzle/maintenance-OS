<?php

namespace App\Console\Commands;

use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\AssetType;
use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Forms\Form;
use App\Models\Forms\FormVersion;
use App\Models\Maintenance\Routine;
use App\Models\User;
use App\Models\WorkOrders\WorkOrder;
use App\Models\WorkOrders\WorkOrderType;
use App\Services\WorkOrders\MaintenanceWorkOrderService;
use App\Services\WorkOrders\WorkOrderGenerationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestWorkOrderSystem extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:work-order-system';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the unified work order system implementation';

    /**
     * Execute the console command.
     */
    public function handle(MaintenanceWorkOrderService $maintenanceService, WorkOrderGenerationService $generationService)
    {
        $this->info('Testing Work Order System Implementation...');
        $this->newLine();

        try {
            DB::beginTransaction();

            // Create test data
            $this->info('Creating test data...');
            
            // Create a test user
            $user = User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@workorder.com',
            ]);
            $this->info('✓ Created test user: ' . $user->email);
            
            // Login the user to avoid audit log issues
            auth()->login($user);

            // Create asset hierarchy
            $plant = Plant::factory()->create(['name' => 'Test Plant']);
            $area = Area::factory()->create(['name' => 'Test Area', 'plant_id' => $plant->id]);
            $sector = Sector::factory()->create(['name' => 'Test Sector', 'area_id' => $area->id]);
            
            // Create asset type
            $assetType = AssetType::factory()->create(['name' => 'Pump']);
            
            // Create an asset
            $asset = Asset::factory()->create([
                'tag' => 'PUMP-001',
                'description' => 'Test Pump',
                'plant_id' => $plant->id,
                'area_id' => $area->id,
                'sector_id' => $sector->id,
                'asset_type_id' => $assetType->id,
            ]);
            $this->info('✓ Created test asset: ' . $asset->tag);

            // Get work order type
            $workOrderType = WorkOrderType::where('category', 'corrective')->first();
            if (!$workOrderType) {
                $this->error('No corrective work order type found. Please run seeders first.');
                return 1;
            }

            // Test 1: Create a manual work order
            $this->newLine();
            $this->info('Test 1: Creating manual maintenance work order...');

            $manualWorkOrder = $maintenanceService->create([
                'title' => 'Test Manual Work Order',
                'description' => 'Testing manual work order creation with discipline support',
                'work_order_type_id' => $workOrderType->id,
                'work_order_category' => 'corrective',
                'priority' => 'high',
                'priority_score' => 75,
                'asset_id' => $asset->id,
                'source_type' => 'manual',
                'requested_by' => $user->id,
                'requested_due_date' => now()->addDays(3),
            ]);

            $this->info("✓ Created work order: {$manualWorkOrder->work_order_number}");
            $this->info("  - Discipline: {$manualWorkOrder->discipline}");
            $this->info("  - Category: {$manualWorkOrder->work_order_category}");
            $this->info("  - Status: {$manualWorkOrder->status}");
            $this->newLine();

            // Test 2: Test discipline validation
            $this->info('Test 2: Testing discipline validation...');
            try {
                $maintenanceService->create([
                    'title' => 'Invalid Work Order',
                    'work_order_type_id' => $workOrderType->id,
                    'work_order_category' => 'calibration', // Quality category for maintenance discipline
                    'priority' => 'normal',
                    'asset_id' => $asset->id,
                    'source_type' => 'manual',
                    'requested_by' => $user->id,
                ]);
                $this->error('✗ Validation failed - should not allow quality category for discipline');
            } catch (\Exception $e) {
                $this->info('✓ Validation working - rejected invalid category for discipline');
            }
            $this->newLine();

            // Test 3: Create routine and test automatic work order generation
            $this->info('Test 3: Testing routine-based work order generation...');
            
            // Create a work order type for preventive maintenance
            $preventiveWorkOrderType = WorkOrderType::create([
                'name' => 'Test Preventive Maintenance',
                'code' => 'TEST_PM',
                'category' => 'preventive',
                'description' => 'Test preventive maintenance work order type',
                'color' => '#10B981',
                'icon' => 'wrench',
                'default_priority' => 'normal',
                'requires_approval' => false,
                'auto_approve_from_routine' => true,
                'sla_hours' => 48,
                'is_active' => true,
            ]);
            
            // Create a form for the routine
            $form = Form::factory()->create(['name' => 'Test Maintenance Form']);
            $formVersion = FormVersion::factory()->create([
                'form_id' => $form->id,
                'version_number' => 1,
                'is_active' => true,
            ]);
            
            $routine = Routine::factory()->create([
                'asset_id' => $asset->id,
                'name' => 'Test Routine - 100h',
                'trigger_hours' => 100,
                'execution_mode' => 'automatic',
                'advance_generation_days' => 24,
                'auto_approve_work_orders' => true,
                'default_priority' => 'normal',
                'last_execution_runtime_hours' => 80, // 80 hours ago
                'form_id' => $form->id,
                'active_form_version_id' => $formVersion->id,
            ]);

            // Update asset runtime to trigger generation
            $asset->latestRuntimeMeasurement()->create([
                'reported_hours' => 190, // 80 + 100 + 10 = 10 hours overdue
                'measurement_datetime' => now(),
                'user_id' => $user->id,
                'source' => 'manual',
            ]);

            $generatedWorkOrders = $generationService->generateDueWorkOrders();
            
            if ($generatedWorkOrders->isNotEmpty()) {
                $routineWorkOrder = $generatedWorkOrders->first();
                
                $this->info("✓ Generated work order from routine: {$routineWorkOrder->work_order_number}");
                $this->info("  - Source: Routine (ID: {$routine->id})");
                $this->info("  - Auto-approved: " . ($routineWorkOrder->status === 'approved' ? 'Yes' : 'No'));
                $this->info("  - Form attached: " . ($routineWorkOrder->form_id ? 'Yes' : 'No'));
            } else {
                $this->warn('⚠ No work orders generated from routine');
            }
            $this->newLine();

            // Test 4: Test status transitions
            $this->info('Test 4: Testing status transitions...');
            $testWorkOrder = $manualWorkOrder;
            
            // Try valid transition
            $result = $testWorkOrder->transitionTo(WorkOrder::STATUS_APPROVED, $user);
            if ($result) {
                $this->info('✓ Transitioned to approved status');
            } else {
                $this->error('✗ Failed to transition to approved status');
            }

            // Try invalid transition
            $result = $testWorkOrder->transitionTo(WorkOrder::STATUS_CLOSED, $user);
            if (!$result) {
                $this->info('✓ Correctly rejected invalid transition (approved → closed)');
            } else {
                $this->error('✗ Allowed invalid transition');
            }
            $this->newLine();

            // Test 5: Test work order statistics
            $this->info('Test 5: Testing work order statistics...');
            $stats = [
                'total' => WorkOrder::maintenance()->count(),
                'open' => WorkOrder::maintenance()->open()->count(),
                'overdue' => WorkOrder::maintenance()->overdue()->count(),
                'by_category' => WorkOrder::maintenance()
                    ->selectRaw('work_order_category, count(*) as count')
                    ->groupBy('work_order_category')
                    ->pluck('count', 'work_order_category'),
            ];

            $this->info('Work Order Statistics:');
            $this->info("  - Total (Maintenance): {$stats['total']}");
            $this->info("  - Open: {$stats['open']}");
            $this->info("  - Overdue: {$stats['overdue']}");
            $this->info('  - By Category:');
            foreach ($stats['by_category'] as $category => $count) {
                $this->info("    • {$category}: {$count}");
            }
            $this->newLine();

            // Test 6: Test discipline configuration
            $this->info('Test 6: Testing discipline configuration...');
            $maintenanceConfig = \App\Models\WorkOrders\WorkOrderDisciplineConfig::forDiscipline('maintenance');
            if ($maintenanceConfig) {
                $this->info('✓ Maintenance discipline configuration found');
                $this->info('  - Allowed categories: ' . implode(', ', $maintenanceConfig->allowed_categories));
                $this->info('  - Allowed sources: ' . implode(', ', $maintenanceConfig->allowed_sources));
            } else {
                $this->error('✗ Maintenance discipline configuration not found');
            }

            DB::rollback();
            $this->newLine();
            $this->info('All tests completed! (Changes rolled back)');
            
            return 0;

        } catch (\Exception $e) {
            DB::rollback();
            $this->error('Test failed with error: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }
} 