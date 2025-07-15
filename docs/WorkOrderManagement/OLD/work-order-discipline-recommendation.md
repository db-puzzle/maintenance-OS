# Work Order Discipline Recommendation: Maintenance vs Quality

## Executive Summary

This document provides recommendations for implementing a unified Work Order system that supports both Maintenance and Quality disciplines while recognizing their distinct requirements. The approach maximizes code reuse and maintains a consistent user experience while allowing for discipline-specific behaviors.

## Recommended Approach: Unified System with Discipline Layer

### Core Principle

Implement a single Work Order system with a **discipline** field that determines specific behaviors, validations, and UI elements. This approach provides:

1. **Maximum Code Reuse**: 80-90% of functionality is shared
2. **Consistent User Experience**: Same interface patterns across disciplines
3. **Flexible Extension**: Easy to add new disciplines in the future
4. **Clear Separation**: Discipline-specific logic is isolated and manageable

### Data Model Extension

```sql
-- Add discipline to work_orders table
ALTER TABLE work_orders 
ADD COLUMN discipline ENUM('maintenance', 'quality') NOT NULL DEFAULT 'maintenance' AFTER work_order_number;

-- Add index for efficient filtering
CREATE INDEX idx_work_orders_discipline ON work_orders(discipline);

-- Discipline-specific configuration table
CREATE TABLE work_order_discipline_configs (
    id BIGINT UNSIGNED PRIMARY KEY,
    discipline VARCHAR(50) UNIQUE NOT NULL,
    allowed_categories JSON NOT NULL,
    allowed_sources JSON NOT NULL,
    requires_compliance_fields BOOLEAN DEFAULT FALSE,
    requires_calibration_tracking BOOLEAN DEFAULT FALSE,
    custom_fields JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Discipline Comparison

### Maintenance Work Orders

**Categories:**
- Preventive
- Corrective  
- Inspection
- Project

**Trigger Sources:**
- Manual Request
- Routine (Automatic/Manual) - Based on runtime hours
- Sensor Alerts
- Inspection Findings

**Key Features:**
- Runtime-based scheduling
- Failure analysis for corrective work
- Asset-centric focus
- Downtime tracking
- Parts management emphasis

### Quality Work Orders

**Categories:**
- Calibration
- Quality Control
- Quality Audit
- Non-Conformance

**Trigger Sources:**
- Manual Request
- Calibration Schedule - Based on calendar intervals
- Quality Alerts
- Audit Findings
- Customer Complaints

**Key Features:**
- Calendar-based scheduling (not runtime)
- Compliance tracking
- Instrument/Equipment focus
- Tolerance and specification tracking
- Certificate generation
- Regulatory compliance emphasis

## Implementation Strategy

### Phase 1: Foundation (Current Implementation)

1. **Add Discipline Field**
   ```php
   // Migration
   Schema::table('work_orders', function (Blueprint $table) {
       $table->enum('discipline', ['maintenance', 'quality'])
             ->default('maintenance')
             ->after('work_order_number');
       $table->index('discipline');
   });
   ```

2. **Update Models**
   ```php
   class WorkOrder extends Model
   {
       protected $fillable = [
           'discipline',
           // ... existing fields
       ];
       
       // Scope for discipline filtering
       public function scopeMaintenance($query)
       {
           return $query->where('discipline', 'maintenance');
       }
       
       public function scopeQuality($query)
       {
           return $query->where('discipline', 'quality');
       }
       
       // Get allowed categories based on discipline
       public function getAllowedCategories(): array
       {
           return match($this->discipline) {
               'maintenance' => ['preventive', 'corrective', 'inspection', 'project'],
               'quality' => ['calibration', 'quality_control', 'quality_audit', 'non_conformance'],
               default => []
           };
       }
   }
   ```

3. **Separate Routes**
   ```php
   // Maintenance routes (current implementation)
   Route::prefix('maintenance/work-orders')->group(function () {
       Route::get('/', [WorkOrderController::class, 'index'])
           ->name('maintenance.work-orders.index');
       // ... other routes
   });
   
   // Quality routes (future implementation)
   Route::prefix('quality/work-orders')->group(function () {
       Route::get('/', [WorkOrderController::class, 'index'])
           ->name('quality.work-orders.index')
           ->defaults('discipline', 'quality');
       // ... other routes
   });
   ```

### Phase 2: UI Adaptations

1. **Navigation Structure**
   ```
   /maintenance
   ├── /work-orders (Maintenance discipline)
   ├── /routines
   └── /assets
   
   /quality (future)
   ├── /work-orders (Quality discipline)
   ├── /calibrations
   └── /instruments
   ```

2. **Conditional UI Elements**
   ```tsx
   // WorkOrderForm.tsx
   const CategorySelector = ({ discipline, value, onChange }) => {
       const categories = discipline === 'maintenance' 
           ? MAINTENANCE_CATEGORIES 
           : QUALITY_CATEGORIES;
           
       return (
           <RadioGroup value={value} onValueChange={onChange}>
               {categories.map(category => (
                   <RadioGroupItem key={category.value} value={category.value}>
                       {category.label}
                   </RadioGroupItem>
               ))}
           </RadioGroup>
       );
   };
   ```

3. **Discipline-Specific Components**
   ```tsx
   // Maintenance-specific
   const FailureAnalysis = () => { /* ... */ };
   const RuntimeTracking = () => { /* ... */ };
   
   // Quality-specific (future)
   const CalibrationCertificate = () => { /* ... */ };
   const ToleranceSpecification = () => { /* ... */ };
   ```

### Phase 3: Service Layer Separation

1. **Base Work Order Service**
   ```php
   abstract class BaseWorkOrderService
   {
       public function create(array $data): WorkOrder
       {
           $this->validateForDiscipline($data);
           return WorkOrder::create($data);
       }
       
       abstract protected function validateForDiscipline(array $data): void;
   }
   ```

2. **Discipline-Specific Services**
   ```php
   class MaintenanceWorkOrderService extends BaseWorkOrderService
   {
       protected function validateForDiscipline(array $data): void
       {
           // Maintenance-specific validations
           if ($data['source_type'] === 'routine') {
               $this->validateRoutineSource($data);
           }
       }
   }
   
   class QualityWorkOrderService extends BaseWorkOrderService
   {
       protected function validateForDiscipline(array $data): void
       {
           // Quality-specific validations
           if ($data['category'] === 'calibration') {
               $this->validateCalibrationRequirements($data);
           }
       }
   }
   ```

## Key Differences to Handle

### 1. Scheduling Triggers

**Maintenance**: Runtime-based (hours of operation)
```php
// Routine triggers based on asset runtime
if ($asset->current_runtime_hours >= $routine->trigger_hours) {
    $this->generateWorkOrder();
}
```

**Quality**: Calendar-based (time intervals)
```php
// Calibration triggers based on calendar
if ($instrument->last_calibration_date->addMonths(6)->isPast()) {
    $this->generateCalibrationWorkOrder();
}
```

### 2. Asset vs Instrument Focus

**Maintenance**: Links to production assets
```php
$workOrder->asset_id = $asset->id; // Pumps, motors, etc.
```

**Quality**: Links to measurement instruments
```php
$workOrder->instrument_id = $instrument->id; // Calipers, gauges, etc.
```

### 3. Compliance Requirements

**Quality** work orders need additional fields:
```sql
-- Quality-specific fields (future migration)
ALTER TABLE work_orders
ADD COLUMN instrument_id BIGINT UNSIGNED NULL,
ADD COLUMN calibration_due_date DATE NULL,
ADD COLUMN certificate_number VARCHAR(100) NULL,
ADD COLUMN compliance_standard VARCHAR(100) NULL,
ADD COLUMN tolerance_specs JSON NULL;
```

### 4. Reporting Focus

**Maintenance Metrics**:
- MTBF/MTTR
- Downtime analysis
- Failure rates
- Parts consumption

**Quality Metrics**:
- Calibration compliance %
- Out-of-tolerance incidents
- Audit findings
- Non-conformance trends

## Migration Path

### Current Implementation (Maintenance Only)

1. Add discipline field with default 'maintenance'
2. Update all existing code to include discipline in queries
3. Prepare service layer for discipline separation
4. Add discipline context to UI components

### Future Implementation (Adding Quality)

1. Extend enums and configurations
2. Add quality-specific fields via migration
3. Implement QualityWorkOrderService
4. Add quality-specific UI routes and components
5. Extend reporting for quality metrics

## Benefits of This Approach

1. **Incremental Development**: Build maintenance now, add quality later
2. **Code Reuse**: Share 80-90% of functionality
3. **Clear Boundaries**: Discipline-specific logic is isolated
4. **Consistent UX**: Users work with familiar interfaces
5. **Scalability**: Easy to add more disciplines (Safety, Environmental, etc.)

## Risks and Mitigations

### Risk 1: Feature Creep
**Mitigation**: Strictly enforce discipline boundaries. Resist adding quality features to maintenance flows.

### Risk 2: Complex Conditionals
**Mitigation**: Use strategy pattern and dependency injection rather than if/else chains.

### Risk 3: Database Complexity
**Mitigation**: Use sparse columns with clear nullable rules. Consider discipline-specific extension tables.

## Recommendation Summary

1. **Proceed with unified Work Order system** including discipline field
2. **Implement maintenance discipline fully** in current phase
3. **Design with quality discipline in mind** but don't implement quality-specific features
4. **Use discipline-based routing** (/maintenance/work-orders vs /quality/work-orders)
5. **Prepare service layer** for discipline-specific behaviors
6. **Document quality requirements** for future implementation phase

This approach provides the best balance of current needs and future flexibility while maintaining system coherence and code quality. 