<?php

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
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Seed required data
    $this->seed(\Database\Seeders\WorkOrderTypeSeeder::class);
    
    // Create test user and authenticate
    $this->user = User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@workorder.com',
    ]);
    $this->actingAs($this->user);
    
    // Create asset hierarchy
    $this->plant = Plant::factory()->create(['name' => 'Test Plant']);
    $this->area = Area::factory()->create(['name' => 'Test Area', 'plant_id' => $this->plant->id]);
    $this->sector = Sector::factory()->create(['name' => 'Test Sector', 'area_id' => $this->area->id]);
    
    // Create asset type and asset
    $this->assetType = AssetType::factory()->create(['name' => 'Pump']);
    $this->asset = Asset::factory()->create([
        'tag' => 'PUMP-001',
        'description' => 'Test Pump',
        'plant_id' => $this->plant->id,
        'area_id' => $this->area->id,
        'sector_id' => $this->sector->id,
        'asset_type_id' => $this->assetType->id,
    ]);
});

test('can create manual maintenance work order', function () {
    $workOrderType = WorkOrderType::where('category', 'corrective')->first();
    
    expect($workOrderType)->not->toBeNull('No corrective work order type found. Please run seeders first.');
    
    $maintenanceService = app(MaintenanceWorkOrderService::class);
    
    $manualWorkOrder = $maintenanceService->create([
        'title' => 'Test Manual Work Order',
        'description' => 'Testing manual work order creation with discipline support',
        'work_order_type_id' => $workOrderType->id,
        'work_order_category' => 'corrective',
        'priority' => 'high',
        'priority_score' => 75,
        'asset_id' => $this->asset->id,
        'source_type' => 'manual',
        'requested_by' => $this->user->id,
        'requested_due_date' => now()->addDays(3),
    ]);
    
    expect($manualWorkOrder)->toBeInstanceOf(WorkOrder::class);
    expect($manualWorkOrder->work_order_number)->toStartWith('WO-');
    expect($manualWorkOrder->discipline)->toBe('maintenance');
    expect($manualWorkOrder->work_order_category)->toBe('corrective');
    expect($manualWorkOrder->status)->toBe('requested');
    expect($manualWorkOrder->asset_id)->toBe($this->asset->id);
});

test('validates discipline-specific work order categories', function () {
    $workOrderType = WorkOrderType::where('category', 'corrective')->first();
    $maintenanceService = app(MaintenanceWorkOrderService::class);
    
    // Test that invalid category for maintenance discipline is rejected
    expect(fn() => $maintenanceService->create([
        'title' => 'Invalid Category Test',
        'work_order_type_id' => $workOrderType->id,
        'work_order_category' => 'calibration', // This is a quality category, not maintenance
        'priority' => 'normal',
        'asset_id' => $this->asset->id,
        'source_type' => 'manual',
        'requested_by' => $this->user->id,
    ]))->toThrow(\Illuminate\Validation\ValidationException::class);
});

test('generates work orders from routines automatically', function () {
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
        'asset_id' => $this->asset->id,
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
    
    // Update asset runtime to trigger generation (80 + 100 + 10 = 190 hours)
    $this->asset->latestRuntimeMeasurement()->create([
        'reported_hours' => 190, // 10 hours overdue
        'measurement_datetime' => now(),
        'user_id' => $this->user->id,
        'source' => 'manual',
    ]);
    
    $generationService = app(WorkOrderGenerationService::class);
    $generatedWorkOrders = $generationService->generateDueWorkOrders();
    
    expect($generatedWorkOrders)->not->toBeEmpty();
    
    $routineWorkOrder = $generatedWorkOrders->first();
    expect($routineWorkOrder->work_order_number)->toStartWith('WO-');
    expect($routineWorkOrder->source_type)->toBe('routine');
    expect($routineWorkOrder->source_id)->toBe($routine->id);
    expect($routineWorkOrder->status)->toBe('approved'); // Auto-approved
    expect($routineWorkOrder->form_id)->toBe($form->id);
});

test('handles work order status transitions correctly', function () {
    $workOrderType = WorkOrderType::where('category', 'corrective')->first();
    $maintenanceService = app(MaintenanceWorkOrderService::class);
    
    $workOrder = $maintenanceService->create([
        'title' => 'Status Transition Test',
        'work_order_type_id' => $workOrderType->id,
        'work_order_category' => 'corrective',
        'priority' => 'normal',
        'asset_id' => $this->asset->id,
        'source_type' => 'manual',
        'requested_by' => $this->user->id,
    ]);
    
    // Test valid transition: requested → approved
    $transitioned = $workOrder->transitionTo(WorkOrder::STATUS_APPROVED, $this->user);
    expect($transitioned)->toBeTrue();
    expect($workOrder->fresh()->status)->toBe('approved');
    
    // Test invalid transition: approved → closed (should go through other statuses first)
    $invalidTransition = $workOrder->transitionTo(WorkOrder::STATUS_CLOSED, $this->user);
    expect($invalidTransition)->toBeFalse();
    expect($workOrder->fresh()->status)->toBe('approved'); // Status unchanged
});

test('generates work order statistics correctly', function () {
    $workOrderType = WorkOrderType::where('category', 'corrective')->first();
    $maintenanceService = app(MaintenanceWorkOrderService::class);
    
    // Create multiple work orders
    $correctiveWorkOrder = $maintenanceService->create([
        'title' => 'Corrective Work Order',
        'work_order_type_id' => $workOrderType->id,
        'work_order_category' => 'corrective',
        'priority' => 'high',
        'asset_id' => $this->asset->id,
        'source_type' => 'manual',
        'requested_by' => $this->user->id,
    ]);
    
    // Create a preventive work order type and work order
    $preventiveType = WorkOrderType::where('category', 'preventive')->first() 
        ?? WorkOrderType::factory()->preventive()->create();
        
    $preventiveWorkOrder = $maintenanceService->create([
        'title' => 'Preventive Work Order',
        'work_order_type_id' => $preventiveType->id,
        'work_order_category' => 'preventive',
        'priority' => 'normal',
        'asset_id' => $this->asset->id,
        'source_type' => 'manual',
        'requested_by' => $this->user->id,
    ]);
    
    // Get statistics
    $totalMaintenance = WorkOrder::maintenance()->count();
    $openCount = WorkOrder::open()->count();
    $overdueCount = WorkOrder::overdue()->count();
    $correctiveCount = WorkOrder::corrective()->count();
    $preventiveCount = WorkOrder::preventive()->count();
    
    expect($totalMaintenance)->toBe(2);
    expect($openCount)->toBe(2); // Both are open (not closed/cancelled)
    expect($overdueCount)->toBe(0); // No overdue work orders
    expect($correctiveCount)->toBe(1);
    expect($preventiveCount)->toBe(1);
});

test('validates maintenance discipline configuration', function () {
    $maintenanceService = app(MaintenanceWorkOrderService::class);
    
    // Test that maintenance discipline has correct allowed categories
    $allowedCategories = ['preventive', 'corrective', 'inspection', 'project'];
    $allowedSources = ['manual', 'routine', 'sensor', 'inspection'];
    
    // Create a work order with each allowed category
    $workOrderType = WorkOrderType::where('category', 'corrective')->first();
    
    foreach ($allowedCategories as $category) {
        $categoryType = WorkOrderType::where('category', $category)->first()
            ?? WorkOrderType::factory()->state(['category' => $category])->create();
            
        // This should not throw an exception
        $workOrder = $maintenanceService->create([
            'title' => "Test {$category} Work Order",
            'work_order_type_id' => $categoryType->id,
            'work_order_category' => $category,
            'priority' => 'normal',
            'asset_id' => $this->asset->id,
            'source_type' => 'manual',
            'requested_by' => $this->user->id,
        ]);
        
        expect($workOrder)->toBeInstanceOf(WorkOrder::class);
        expect($workOrder->work_order_category)->toBe($category);
    }
    
    // Test that invalid categories are rejected
    expect(fn() => $maintenanceService->create([
        'title' => 'Invalid Category Work Order',
        'work_order_type_id' => $workOrderType->id,
        'work_order_category' => 'calibration', // Quality category
        'priority' => 'normal',
        'asset_id' => $this->asset->id,
        'source_type' => 'manual',
        'requested_by' => $this->user->id,
    ]))->toThrow(\Illuminate\Validation\ValidationException::class);
}); 