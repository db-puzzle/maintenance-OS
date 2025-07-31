# Production Module - Detailed Design Document

## 1. Overview

This document provides the technical design for the Production Module, focusing on the backend infrastructure, data model, and API design. The implementation follows the existing Laravel project standards using Inertia.js for seamless frontend-backend communication.

### 1.1 Technology Stack
- **Backend**: Laravel 11
- **Frontend**: Inertia.js + React
- **Database**: PostgreSQL
- **File Storage**: S3-compatible storage
- **Cache**: Redis
- **Queue**: Laravel Queue with Redis driver

### 1.2 Module Structure
```
app/
├── Models/Production/
│   ├── Product.php
│   ├── ProductBomHistory.php
│   ├── BillOfMaterial.php
│   ├── BomItem.php
│   ├── BomVersion.php
│   ├── ManufacturingRoute.php
│   ├── ManufacturingStep.php
│   ├── WorkCell.php
│   ├── ManufacturingOrder.php
│   ├── ProductionSchedule.php
│   ├── ProductionExecution.php
│   ├── QrTracking.php
│   ├── Shipment.php
│   └── ShipmentItem.php
├── Http/Controllers/Production/
│   ├── ProductController.php
│   ├── BomController.php
│   ├── RoutingController.php
│   ├── WorkCellController.php
│   ├── ProductionPlanningController.php
│   ├── ProductionTrackingController.php
│   ├── QrCodeController.php
│   └── ShipmentController.php
├── Services/Production/
│   ├── BomImportService.php
│   ├── RoutingInheritanceService.php
│   ├── ProductionSchedulingService.php
│   ├── QrCodeGenerationService.php
│   └── ShipmentManifestService.php
└── Jobs/Production/
    ├── ImportBomFromInventor.php
    ├── GenerateQrCodes.php
    └── ProcessProductionSchedule.php
```

## 2. Data Model Design

### 2.1 Core Entities

#### Product Management

```sql
-- Products table (master product catalog)
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    product_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    product_type ENUM('manufactured', 'purchased', 'phantom') DEFAULT 'manufactured',
    status ENUM('prototype', 'active', 'phasing_out', 'discontinued') DEFAULT 'active',
    
    -- Current BOM reference
    current_bom_id BIGINT REFERENCES bill_of_materials(id),
    
    -- Product attributes
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    weight DECIMAL(10, 4),
    dimensions JSONB, -- {length, width, height, unit}
    
    -- Business attributes
    list_price DECIMAL(10, 2),
    cost DECIMAL(10, 2),
    lead_time_days INTEGER DEFAULT 0,
    
    -- Metadata
    tags JSONB,
    custom_attributes JSONB,
    
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_product_number (product_number),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_current_bom (current_bom_id)
);

-- Product BOM history (tracks all BOMs used for a product)
CREATE TABLE product_bom_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    bill_of_material_id BIGINT REFERENCES bill_of_materials(id),
    
    -- Effectivity dates
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Change tracking
    change_reason TEXT,
    change_order_number VARCHAR(100),
    approved_by BIGINT REFERENCES users(id),
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Ensure no overlapping date ranges for same product
    EXCLUDE USING gist (
        product_id WITH =,
        daterange(effective_from, effective_to, '[)') WITH &&
    ),
    
    INDEX idx_product_history (product_id, effective_from),
    INDEX idx_bom_history (bill_of_material_id)
);
```

#### Bill of Materials (BOM) Management

```sql
-- Bill of Materials master table
CREATE TABLE bill_of_materials (
    id BIGSERIAL PRIMARY KEY,
    bom_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    external_reference VARCHAR(100), -- Inventor drawing number
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_bom_number (bom_number),
    INDEX idx_external_reference (external_reference),
    INDEX idx_is_active (is_active)
);

-- BOM versions for change tracking
CREATE TABLE bom_versions (
    id BIGSERIAL PRIMARY KEY,
    bill_of_material_id BIGINT REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    revision_notes TEXT,
    published_at TIMESTAMP,
    published_by BIGINT REFERENCES users(id),
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE(bill_of_material_id, version_number),
    INDEX idx_bom_version_current (bill_of_material_id, is_current)
);

-- BOM items (parts/assemblies)
CREATE TABLE bom_items (
    id BIGSERIAL PRIMARY KEY,
    bom_version_id BIGINT REFERENCES bom_versions(id) ON DELETE CASCADE,
    parent_item_id BIGINT REFERENCES bom_items(id) ON DELETE CASCADE,
    item_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type ENUM('part', 'assembly', 'subassembly') NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level
    sequence_number INTEGER, -- Order within parent
    
    -- 3D rendering support
    thumbnail_path VARCHAR(500),
    model_file_path VARCHAR(500),
    
    -- Metadata
    material VARCHAR(100),
    weight DECIMAL(10, 4),
    dimensions JSONB, -- {length, width, height, unit}
    custom_attributes JSONB,
    
    -- QR code tracking
    qr_code VARCHAR(100) UNIQUE,
    qr_generated_at TIMESTAMP,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_bom_item_parent (bom_version_id, parent_item_id),
    INDEX idx_item_number (item_number),
    INDEX idx_qr_code (qr_code),
    INDEX idx_level_sequence (level, sequence_number)
);
```

#### Production Routing

```sql
-- Production routing definitions
CREATE TABLE production_routings (
    id BIGSERIAL PRIMARY KEY,
    bom_item_id BIGINT REFERENCES bom_items(id) ON DELETE CASCADE,
    routing_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    routing_type ENUM('inherited', 'defined') DEFAULT 'defined',
    parent_routing_id BIGINT REFERENCES production_routings(id), -- For inheritance
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_bom_item_routing (bom_item_id),
    INDEX idx_routing_number (routing_number),
    INDEX idx_parent_routing (parent_routing_id)
);

-- Routing steps/operations
CREATE TABLE routing_steps (
    id BIGSERIAL PRIMARY KEY,
    production_routing_id BIGINT REFERENCES production_routings(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    operation_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    work_cell_id BIGINT REFERENCES work_cells(id),
    
    -- Time estimates
    setup_time_minutes INTEGER DEFAULT 0,
    cycle_time_minutes INTEGER NOT NULL,
    tear_down_time_minutes INTEGER DEFAULT 0,
    
    -- Resources
    labor_requirement INTEGER DEFAULT 1, -- Number of operators
    skill_requirements JSONB, -- Array of skill IDs
    tool_requirements JSONB,
    
    -- Instructions
    work_instructions TEXT,
    safety_notes TEXT,
    quality_checkpoints JSONB,
    attachments JSONB, -- Array of file paths
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE(production_routing_id, step_number),
    INDEX idx_routing_steps (production_routing_id, step_number),
    INDEX idx_work_cell (work_cell_id)
);

-- Work cells/resources
CREATE TABLE work_cells (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cell_type ENUM('internal', 'external') DEFAULT 'internal',
    
    -- Capacity
    available_hours_per_day DECIMAL(4, 2) DEFAULT 8,
    efficiency_percentage DECIMAL(5, 2) DEFAULT 85,
    
    -- Location
    plant_id BIGINT REFERENCES plants(id),
    area_id BIGINT REFERENCES areas(id),
    
    -- External vendor info (if cell_type = 'external')
    vendor_name VARCHAR(255),
    vendor_contact JSONB,
    lead_time_days INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_work_cell_type (cell_type, is_active),
    INDEX idx_plant_area (plant_id, area_id)
);
```

#### Production Planning & Scheduling

```sql
-- Production orders
CREATE TABLE manufacturing_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    product_id BIGINT REFERENCES products(id),
    bill_of_material_id BIGINT REFERENCES bill_of_materials(id), -- Specific BOM version to use
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    
    -- Status tracking
    status ENUM('draft', 'planned', 'released', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    priority INTEGER DEFAULT 50, -- 0-100
    
    -- Dates
    requested_date DATE,
    planned_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    
    -- Source
    source_type VARCHAR(50), -- 'manual', 'sales_order', 'forecast'
    source_reference VARCHAR(100),
    
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_order_status (status, priority),
    INDEX idx_planned_dates (planned_start_date, planned_end_date),
    INDEX idx_product (product_id),
    INDEX idx_bom (bill_of_material_id)
);

-- Production schedules (detailed planning)
CREATE TABLE production_schedules (
    id BIGSERIAL PRIMARY KEY,
    manufacturing_order_id BIGINT REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    routing_step_id BIGINT REFERENCES routing_steps(id),
    work_cell_id BIGINT REFERENCES work_cells(id),
    
    -- Scheduling
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    buffer_time_minutes INTEGER DEFAULT 0,
    
    -- Assignment
    assigned_team_id BIGINT REFERENCES teams(id),
    assigned_operators JSONB, -- Array of user IDs
    
    -- Status
    status ENUM('scheduled', 'ready', 'in_progress', 'completed', 'delayed') DEFAULT 'scheduled',
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_schedule_dates (scheduled_start, scheduled_end),
    INDEX idx_work_cell_schedule (work_cell_id, scheduled_start),
    INDEX idx_status (status)
);
```

#### Production Execution & Tracking

```sql
-- Production execution tracking
CREATE TABLE production_executions (
    id BIGSERIAL PRIMARY KEY,
    production_schedule_id BIGINT REFERENCES production_schedules(id),
    routing_step_id BIGINT REFERENCES routing_steps(id),
    
    -- QR code tracking
    item_qr_code VARCHAR(100) NOT NULL,
    scanned_by BIGINT REFERENCES users(id),
    
    -- Timing
    started_at TIMESTAMP,
    paused_at TIMESTAMP,
    resumed_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_pause_duration INTEGER DEFAULT 0, -- minutes
    
    -- Quantities
    quantity_started DECIMAL(10, 2),
    quantity_completed DECIMAL(10, 2),
    quantity_scrapped DECIMAL(10, 2) DEFAULT 0,
    
    -- Quality
    quality_checks JSONB,
    defects_reported JSONB,
    
    -- Notes
    operator_notes TEXT,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_qr_execution (item_qr_code, routing_step_id),
    INDEX idx_schedule_execution (production_schedule_id),
    INDEX idx_execution_dates (started_at, completed_at)
);

-- QR code tracking events
CREATE TABLE qr_tracking_events (
    id BIGSERIAL PRIMARY KEY,
    qr_code VARCHAR(100) NOT NULL,
    event_type ENUM('generated', 'scanned', 'status_update', 'location_change') NOT NULL,
    event_data JSONB,
    location VARCHAR(255),
    scanned_by BIGINT REFERENCES users(id),
    device_info JSONB,
    created_at TIMESTAMP,
    
    INDEX idx_qr_events (qr_code, created_at),
    INDEX idx_event_type (event_type, created_at)
);
```

#### Shipment Management

```sql
-- Shipments
CREATE TABLE shipments (
    id BIGSERIAL PRIMARY KEY,
    shipment_number VARCHAR(100) UNIQUE NOT NULL,
    shipment_type ENUM('customer', 'internal_transfer', 'vendor_return') DEFAULT 'customer',
    
    -- Destination
    destination_type VARCHAR(50), -- 'customer', 'warehouse', 'vendor'
    destination_reference VARCHAR(100),
    destination_details JSONB, -- Address, contact info
    
    -- Status
    status ENUM('draft', 'ready', 'in_transit', 'delivered', 'cancelled') DEFAULT 'draft',
    
    -- Dates
    scheduled_ship_date DATE,
    actual_ship_date TIMESTAMP,
    estimated_delivery_date DATE,
    actual_delivery_date TIMESTAMP,
    
    -- Documentation
    manifest_generated_at TIMESTAMP,
    manifest_path VARCHAR(500),
    
    -- Logistics
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    freight_cost DECIMAL(10, 2),
    
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_shipment_status (status),
    INDEX idx_ship_dates (scheduled_ship_date, actual_ship_date)
);

-- Shipment items
CREATE TABLE shipment_items (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
    bom_item_id BIGINT REFERENCES bom_items(id),
    manufacturing_order_id BIGINT REFERENCES manufacturing_orders(id),
    
    -- Item details
    item_number VARCHAR(100) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    
    -- Packaging
    package_number VARCHAR(50),
    package_type VARCHAR(50),
    weight DECIMAL(10, 2),
    dimensions JSONB,
    
    -- QR tracking
    qr_codes JSONB, -- Array of QR codes included
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_shipment_items (shipment_id),
    INDEX idx_package (package_number)
);

-- Shipment photos
CREATE TABLE shipment_photos (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
    photo_type ENUM('package', 'container', 'document', 'damage') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    description TEXT,
    metadata JSONB, -- EXIF data, GPS coordinates
    uploaded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    
    INDEX idx_shipment_photos (shipment_id, photo_type)
);
```

### 2.2 Relationships and Constraints

1. **Product-BOM Relationship**: Products maintain a current BOM reference and full history through `product_bom_history`
2. **BOM Hierarchy**: Self-referential relationship in `bom_items` table maintains parent-child relationships
3. **Routing Inheritance**: `production_routings` can inherit from parent items through `parent_routing_id`
4. **Soft Deletes**: Consider adding `deleted_at` columns for critical entities like Products, BOMs and Production Orders

## 3. Backend Architecture

### 3.1 Service Layer Design

#### BomImportService
```php
namespace App\Services\Production;

class BomImportService
{
    public function importFromInventor(array $data): BillOfMaterial
    {
        // Validate Inventor data structure
        // Create BOM master record
        // Create version record
        // Recursively create BOM items
        // Generate QR codes for items
        // Import thumbnails to S3
    }
    
    public function importFromCsv(UploadedFile $file): BillOfMaterial
    {
        // Parse CSV
        // Validate data
        // Build hierarchy
        // Create records
    }
    
    private function buildHierarchy(array $flatData): array
    {
        // Convert flat structure to hierarchical
    }
}
```

#### RoutingInheritanceService
```php
namespace App\Services\Production;

class RoutingInheritanceService
{
    public function resolveRouting(BomItem $item): ?ManufacturingRoute
    {
        // Check if item has defined routing
        // If not, traverse up the hierarchy
        // Return first found routing or null
    }
    
    public function getEffectiveRouting(BomItem $item): Collection
    {
        // Get resolved routing
        // Apply any item-specific overrides
        // Return routing steps
    }
    
    public function validateRoutingDependencies(BomItem $item): array
    {
        // Check all child items have routing before parent
        // Return validation errors
    }
}
```

#### ProductionSchedulingService
```php
namespace App\Services\Production;

class ProductionSchedulingService
{
    public function scheduleProduction(ManufacturingOrder $order): void
    {
        // Get BOM item and routing
        // Calculate resource requirements
        // Find available time slots
        // Create schedule records
        // Handle conflicts
    }
    
    public function optimizeSchedule(Carbon $startDate, Carbon $endDate): void
    {
        // Load existing schedules
        // Apply optimization algorithms
        // Minimize changeovers
        // Balance workload
    }
    
    public function checkCapacityConstraints(array $schedules): array
    {
        // Validate work cell capacity
        // Check operator availability
        // Return conflicts
    }
}
```

### 3.2 API Endpoints (Inertia Routes)

```php
// routes/production.php

// Product Management
Route::prefix('production/products')->group(function () {
    Route::get('/', [ProductController::class, 'index'])->name('production.products.index');
    Route::get('/create', [ProductController::class, 'create'])->name('production.products.create');
    Route::post('/', [ProductController::class, 'store'])->name('production.products.store');
    Route::get('/{product}', [ProductController::class, 'show'])->name('production.products.show');
    Route::get('/{product}/edit', [ProductController::class, 'edit'])->name('production.products.edit');
    Route::put('/{product}', [ProductController::class, 'update'])->name('production.products.update');
    Route::delete('/{product}', [ProductController::class, 'destroy'])->name('production.products.destroy');
    
    // BOM management
    Route::post('/{product}/bom', [ProductController::class, 'assignBom'])->name('production.products.bom.assign');
    Route::get('/{product}/bom-history', [ProductController::class, 'bomHistory'])->name('production.products.bom.history');
});

// BOM Management
Route::prefix('production/bom')->group(function () {
    Route::get('/', [BomController::class, 'index'])->name('production.bom.index');
    Route::get('/create', [BomController::class, 'create'])->name('production.bom.create');
    Route::post('/', [BomController::class, 'store'])->name('production.bom.store');
    Route::get('/{bom}', [BomController::class, 'show'])->name('production.bom.show');
    Route::get('/{bom}/edit', [BomController::class, 'edit'])->name('production.bom.edit');
    Route::put('/{bom}', [BomController::class, 'update'])->name('production.bom.update');
    Route::delete('/{bom}', [BomController::class, 'destroy'])->name('production.bom.destroy');
    
    // Import
    Route::post('/import/inventor', [BomController::class, 'importInventor'])->name('production.bom.import.inventor');
    Route::post('/import/csv', [BomController::class, 'importCsv'])->name('production.bom.import.csv');
    
    // Hierarchy operations
    Route::get('/{bom}/hierarchy', [BomController::class, 'hierarchy'])->name('production.bom.hierarchy');
    Route::post('/{bom}/items', [BomController::class, 'addItem'])->name('production.bom.items.add');
});

// Routing Management
Route::prefix('production/routing')->group(function () {
    Route::get('/', [RoutingController::class, 'index'])->name('production.routing.index');
    Route::get('/create', [RoutingController::class, 'create'])->name('production.routing.create');
    Route::post('/', [RoutingController::class, 'store'])->name('production.routing.store');
    Route::get('/{routing}', [RoutingController::class, 'show'])->name('production.routing.show');
    Route::put('/{routing}', [RoutingController::class, 'update'])->name('production.routing.update');
    
    // Routing steps
    Route::post('/{routing}/steps', [RoutingController::class, 'addStep'])->name('production.routing.steps.add');
    Route::put('/{routing}/steps/{step}', [RoutingController::class, 'updateStep'])->name('production.routing.steps.update');
    Route::delete('/{routing}/steps/{step}', [RoutingController::class, 'deleteStep'])->name('production.routing.steps.delete');
    
    // Drag-drop reordering
    Route::post('/{routing}/steps/reorder', [RoutingController::class, 'reorderSteps'])->name('production.routing.steps.reorder');
});

// Production Planning
Route::prefix('production/planning')->group(function () {
    Route::get('/', [ProductionPlanningController::class, 'index'])->name('production.planning.index');
    Route::get('/calendar', [ProductionPlanningController::class, 'calendar'])->name('production.planning.calendar');
    Route::get('/gantt', [ProductionPlanningController::class, 'gantt'])->name('production.planning.gantt');
    
    // Orders
    Route::post('/orders', [ProductionPlanningController::class, 'createOrder'])->name('production.planning.orders.create');
    Route::post('/orders/{order}/schedule', [ProductionPlanningController::class, 'scheduleOrder'])->name('production.planning.orders.schedule');
    Route::post('/orders/{order}/release', [ProductionPlanningController::class, 'releaseOrder'])->name('production.planning.orders.release');
});

// Production Tracking
Route::prefix('production/tracking')->group(function () {
    Route::get('/scan', [ProductionTrackingController::class, 'scan'])->name('production.tracking.scan');
    Route::post('/scan', [ProductionTrackingController::class, 'processScan'])->name('production.tracking.scan.process');
    Route::get('/status/{qrCode}', [ProductionTrackingController::class, 'status'])->name('production.tracking.status');
    Route::post('/start/{qrCode}', [ProductionTrackingController::class, 'start'])->name('production.tracking.start');
    Route::post('/complete/{qrCode}', [ProductionTrackingController::class, 'complete'])->name('production.tracking.complete');
});

// QR Code Management
Route::prefix('production/qr')->group(function () {
    Route::post('/generate', [QrCodeController::class, 'generate'])->name('production.qr.generate');
    Route::get('/print', [QrCodeController::class, 'print'])->name('production.qr.print');
    Route::get('/download/{format}', [QrCodeController::class, 'download'])->name('production.qr.download');
});

// Shipment Management
Route::prefix('production/shipments')->group(function () {
    Route::get('/', [ShipmentController::class, 'index'])->name('production.shipments.index');
    Route::get('/create', [ShipmentController::class, 'create'])->name('production.shipments.create');
    Route::post('/', [ShipmentController::class, 'store'])->name('production.shipments.store');
    Route::get('/{shipment}', [ShipmentController::class, 'show'])->name('production.shipments.show');
    Route::put('/{shipment}', [ShipmentController::class, 'update'])->name('production.shipments.update');
    
    // Manifest
    Route::post('/{shipment}/manifest', [ShipmentController::class, 'generateManifest'])->name('production.shipments.manifest');
    Route::get('/{shipment}/manifest/download', [ShipmentController::class, 'downloadManifest'])->name('production.shipments.manifest.download');
    
    // Photos
    Route::post('/{shipment}/photos', [ShipmentController::class, 'uploadPhoto'])->name('production.shipments.photos.upload');
});
```

### 3.3 Controller Implementation Pattern

```php
namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BillOfMaterial;
use App\Services\Production\BomImportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BomController extends Controller
{
    public function __construct(
        private BomImportService $importService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BillOfMaterial::class);

        $boms = BillOfMaterial::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('bom_number', 'like', "%{$search}%");
            })
            ->with(['currentVersion', 'createdBy'])
            ->paginate($request->input('per_page', 10));

        return Inertia::render('production/bom/index', [
            'boms' => $boms,
            'filters' => $request->only(['search', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', BillOfMaterial::class),
            ],
        ]);
    }

    public function show(BillOfMaterial $bom): Response
    {
        $this->authorize('view', $bom);

        $bom->load([
            'versions',
            'currentVersion.items' => function ($query) {
                $query->orderBy('level')->orderBy('sequence_number');
            },
        ]);

        return Inertia::render('production/bom/show', [
            'bom' => $bom,
            'hierarchy' => $this->buildHierarchyTree($bom->currentVersion->items),
            'can' => [
                'update' => auth()->user()->can('update', $bom),
                'delete' => auth()->user()->can('delete', $bom),
            ],
        ]);
    }

    // Additional methods follow the same pattern...
}
```

## 4. Key Features Implementation

### 4.1 QR Code Generation

```php
namespace App\Services\Production;

use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

class QrCodeGenerationService
{
    public function generateForBomItem(BomItem $item): string
    {
        $code = $this->generateUniqueCode($item);
        
        $qrCode = QrCode::create($code)
            ->setSize(300)
            ->setMargin(10);
            
        $writer = new PngWriter();
        $result = $writer->write($qrCode);
        
        // Save to S3
        $path = "qr-codes/{$code}.png";
        Storage::disk('s3')->put($path, $result->getString());
        
        // Update item
        $item->update([
            'qr_code' => $code,
            'qr_generated_at' => now(),
        ]);
        
        return $code;
    }
    
    private function generateUniqueCode(BomItem $item): string
    {
        return sprintf(
            'PRD-%s-%s-%s',
            $item->item_type,
            $item->item_number,
            Str::random(6)
        );
    }
}
```

### 4.2 Mobile Scanning Interface

The mobile scanning interface will be a responsive Inertia page that:
- Uses device camera for QR scanning
- Works offline with service worker
- Syncs data when connection restored
- Provides haptic feedback on scan

### 4.3 Routing Inheritance Logic

```php
namespace App\Models\Production;

class BomItem extends Model
{
    public function getEffectiveRouting(): ?ManufacturingRoute
    {
        // Direct routing
        if ($this->routing && $this->routing->is_active) {
            return $this->routing;
        }
        
        // Inherited routing
        if ($this->parent) {
            return $this->parent->getEffectiveRouting();
        }
        
        return null;
    }
    
    public function canStartProduction(): bool
    {
        // Check all children have completed routing
        foreach ($this->children as $child) {
            if ($child->hasRouting() && !$child->isProductionComplete()) {
                return false;
            }
        }
        
        return true;
    }
}
```

## 5. Integration Points

### 5.1 Existing System Integration

- **Users & Permissions**: Leverage existing Spatie permissions system
- **Plants/Areas**: Use existing asset hierarchy for work cell locations
- **Shifts**: Integrate with shift system for scheduling
- **Audit Logging**: Use existing audit log service

### 5.2 External Integrations

- **Autodesk Inventor API**: For BOM and routing import
- **S3 Storage**: For thumbnails and documents
- **PDF Generation**: For manifests and labels

## 6. Performance Considerations

### 6.1 Database Optimization

- Composite indexes on frequently queried combinations
- Materialized views for BOM explosion
- Partitioning for tracking events table

### 6.2 Caching Strategy

```php
// Cache BOM hierarchy
Cache::tags(['bom', "bom-{$bomId}"])->remember(
    "bom-hierarchy-{$bomId}-{$versionId}",
    3600,
    fn() => $this->buildHierarchy($bomId, $versionId)
);

// Cache routing calculations
Cache::tags(['routing', "item-{$itemId}"])->remember(
    "effective-routing-{$itemId}",
    3600,
    fn() => $this->resolveRouting($itemId)
);
```

### 6.3 Queue Jobs

- BOM import processing
- QR code generation (bulk)
- Schedule optimization
- Manifest generation

## 7. Security Considerations

### 7.1 Permissions

```php
// Permission structure
'production.bom.view'
'production.bom.create'
'production.bom.update'
'production.bom.delete'
'production.bom.import'

'production.routing.view'
'production.routing.create'
'production.routing.update'
'production.routing.delete'

'production.planning.view'
'production.planning.create'
'production.planning.schedule'
'production.planning.release'

'production.tracking.scan'
'production.tracking.update'

'production.shipments.view'
'production.shipments.create'
'production.shipments.update'
'production.shipments.manifest'
```

### 7.2 Data Validation

- Validate Inventor import data structure
- Enforce routing dependency rules
- Validate QR codes before processing
- Sanitize file uploads

## 8. Migration Strategy

### 8.1 Phase 1: Core Data Models
1. Create all database tables
2. Set up models and relationships
3. Implement basic CRUD operations

### 8.2 Phase 2: Import & Routing
1. Implement Inventor import
2. Build routing management
3. Implement inheritance logic

### 8.3 Phase 3: Planning & Scheduling
1. Create planning interfaces
2. Implement scheduling engine
3. Build capacity visualization

### 8.4 Phase 4: Execution & Tracking
1. Generate QR codes
2. Build mobile scanning interface
3. Implement tracking workflows

### 8.5 Phase 5: Shipments & Reporting
1. Create shipment management
2. Generate manifests
3. Build analytics dashboards

## 9. Testing Strategy

### 9.1 Unit Tests
- Model relationships
- Service layer logic
- Routing inheritance
- QR code generation

### 9.2 Feature Tests
- BOM import workflows
- Production scheduling
- QR scanning process
- Shipment creation

### 9.3 Integration Tests
- Inventor API integration
- S3 file uploads
- PDF generation
- Mobile interface

## 10. Monitoring & Metrics

### 10.1 Key Metrics
- BOM import success rate
- Average scheduling time
- QR scan response time
- Production cycle time

### 10.2 Logging
- Import process logs
- Scheduling decisions
- QR scan events
- API integration calls

## 11. Future Considerations

### 11.1 Advanced Features
- AI-powered scheduling optimization
- Predictive maintenance integration
- Real-time dashboard with WebSockets
- Mobile app development

### 11.2 Scalability
- Microservice extraction for heavy processing
- Read replicas for reporting
- CDN for 3D model files
- Elasticsearch for advanced search 