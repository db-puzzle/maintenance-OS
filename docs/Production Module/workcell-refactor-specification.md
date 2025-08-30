# WorkCell Model Refactoring Specification

## Executive Summary

This document outlines a simplified refactoring of the WorkCell model to support both finite and infinite capacity scheduling. The current model's redundant `available_hours_per_day` field and vague `efficiency_percentage` are replaced with a straightforward approach: for finite capacity work cells, capacity is determined by the shift schedule (available time) and production rate (units per hour) using the formula `Capacity = Available Time × Production Rate`. For infinite capacity work cells (like outsourced operations), no capacity constraints are applied, allowing unlimited scheduling flexibility.

## Current Model Limitations

### 1. Static Capacity Definition
- **Problem**: The current `available_hours_per_day` field is redundant with shift information and doesn't account for varying daily schedules
- **Impact**: Cannot accurately model capacity for shifts with different schedules per weekday or handle holidays/maintenance windows

### 2. Oversimplified Efficiency Model  
- **Problem**: A single `efficiency_percentage` doesn't account for the variable nature of production rates
- **Impact**: Unable to accurately predict capacity for different products or operations

### 3. Lack of Resource Constraints
- **Problem**: No modeling of operator requirements or tool availability
- **Impact**: Cannot prevent overallocation of shared resources

## Proposed WorkCell Model Structure

### Core Fields (Retained/Modified)
```
- id
- name
- description  
- cell_type (internal/external)
- plant_id
- area_id
- sector_id
- shift_id (now required for internal cells)
- manufacturer_id (for external cells)
- is_active
```

### Removed Fields
```
- available_hours_per_day (replaced by shift-based calculation)
- efficiency_percentage (replaced by dynamic capacity factors)
```

### New Core Fields
```
- has_finite_capacity (boolean, default true)
- default_production_rate_per_hour (in pieces or base UOM, ignored if infinite capacity)
- default_unit_of_measure (for the production rate)
```

## New Related Models

### 1. WorkCellItemRate
Defines production rates for specific items on this work cell

```
Fields:
- work_cell_id
- item_id
- setup_time_minutes
- production_rate_per_hour
- unit_of_measure
- notes
```

### 2. WorkCellConstraint
Time-based constraints that affect availability

```
Fields:
- work_cell_id
- constraint_type (maintenance/training/audit/holiday/other)
- start_datetime
- end_datetime
- is_recurring
- recurrence_pattern (if recurring)
- description
```

## Capacity Calculation System

### 1. Infinite vs Finite Capacity
Work cells can operate in two modes:

**Infinite Capacity** (`has_finite_capacity = false`):
- No capacity constraints applied
- Operations can be scheduled without time/rate limitations
- Useful for outsourced operations, manual assembly, or unconstrained resources
- Shift schedules and production rates are ignored for scheduling

**Finite Capacity** (`has_finite_capacity = true`):
- Standard capacity calculation applies
- Must check available time and production rates

### 2. Finite Capacity Formula
For work cells with finite capacity:

```
Available Time = Shift Working Hours - Breaks - Constraints
Production Capacity = Available Time × Production Rate
```

### 3. Time Availability (Finite Capacity Only)
The system calculates available time by:
- Getting working hours from the shift schedule for each day
- Subtracting scheduled breaks
- Subtracting any constraints (maintenance, holidays, etc.)

### 4. Production Rate Application (Finite Capacity Only)
For scheduling operations on finite capacity work cells:
```
// Get the appropriate production rate
Production Rate = WorkCellItemRate for specific item
                  OR default_production_rate_per_hour

// Calculate time required
Time Required = Setup Time + (Quantity / Production Rate)

// Check if fits within available capacity
Can Schedule = Time Required <= Available Time
```

### 5. Scheduling Logic by Capacity Type
```
// First validate UOM compatibility
if (!validateUOMTypeCompatibility(item.uom, workCell.uom)) {
    throw new Error("Item UOM type incompatible with work cell");
}

if (workCell.has_finite_capacity) {
    // Apply all capacity constraints
    checkAvailableTime();
    calculateRequiredTime();
    verifyCapacityFit();
} else {
    // Infinite capacity - always can schedule
    return true;
}
```

### 6. UOM Handling
When the order UOM differs from the work cell's UOM (applies to both capacity types for costing/tracking):
```
// Convert quantity to work cell's UOM
Converted Quantity = Order Quantity × UOM Conversion Factor

// For finite capacity: use for time calculation
// For infinite capacity: use for reporting/costing only
```

## Finite Capacity Scheduling Features

### 1. Time Slot Management
- Track available time for each work cell by day
- Deduct time as operations are scheduled
- Prevent overbooking beyond available capacity

### 2. Simple Scheduling Logic
```
For each Manufacturing Step:
1. Find work cell's available time slots
2. Calculate time required (setup + production)
3. Find earliest slot that fits
4. Book the time slot
5. Update remaining capacity
```

## Integration Points

### 1. Manufacturing Step Scheduling
- ManufacturingStep references work_cell_id
- Scheduler queries available capacity
- Books capacity when scheduling confirmed

### 2. Production Schedule Generation
- ProductionSchedule (future model) will:
  - Reserve capacity slots
  - Track actual vs planned usage
  - Update resource consumption

### 3. Shift Management Integration
- Directly use shift schedules for capacity
- Handle shift calendar exceptions
- Support multiple shifts per work cell

### 4. Quality Integration
- Track quality performance by work cell
- Adjust capability factors based on history
- Flag when quality issues indicate maintenance needs

## Database Schema Updates

### 1. Work Cell Table Updates
```sql
ALTER TABLE work_cells 
ADD COLUMN has_finite_capacity BOOLEAN DEFAULT TRUE,
ADD COLUMN default_production_rate_per_hour DECIMAL(10,3),
ADD COLUMN default_unit_of_measure VARCHAR(50) DEFAULT 'pieces',
DROP COLUMN available_hours_per_day,
DROP COLUMN efficiency_percentage;
```

### 2. Work Cell Item Rates
```sql
CREATE TABLE work_cell_item_rates (
    id BIGSERIAL PRIMARY KEY,
    work_cell_id BIGINT REFERENCES work_cells(id),
    item_id BIGINT REFERENCES items(id),
    setup_time_minutes INTEGER DEFAULT 0,
    production_rate_per_hour DECIMAL(10,3) NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(work_cell_id, item_id)
);
```

### 3. Work Cell Constraints
```sql
CREATE TABLE work_cell_constraints (
    id BIGSERIAL PRIMARY KEY,
    work_cell_id BIGINT REFERENCES work_cells(id),
    constraint_type VARCHAR(50) NOT NULL,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_constraint_dates (work_cell_id, start_datetime, end_datetime)
);
```

### 4. Units of Measure Table
```sql
CREATE TABLE units_of_measure (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    uom_type VARCHAR(20) NOT NULL CHECK (uom_type IN ('COUNT', 'MASS', 'LENGTH', 'AREA', 'VOLUME', 'TIME')),
    is_base_unit BOOLEAN DEFAULT FALSE,
    base_unit_code VARCHAR(20) REFERENCES units_of_measure(code),
    conversion_to_base DECIMAL(15,8) DEFAULT 1.0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Sample data
INSERT INTO units_of_measure (code, name, uom_type, is_base_unit) VALUES
('pc', 'Pieces', 'COUNT', true),
('kg', 'Kilograms', 'MASS', true),
('m', 'Meters', 'LENGTH', true),
('L', 'Liters', 'VOLUME', true);
```

### 5. Simple Capacity Tracking
```sql
CREATE TABLE work_cell_capacity_bookings (
    id BIGSERIAL PRIMARY KEY,
    work_cell_id BIGINT REFERENCES work_cells(id),
    manufacturing_step_id BIGINT REFERENCES manufacturing_steps(id),
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_minutes INTEGER NOT NULL,
    quantity DECIMAL(10,3),
    unit_of_measure VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_capacity_date_cell (scheduled_date, work_cell_id, start_time)
);
```

## Migration Strategy

### Phase 1: Database Updates
1. Update work_cells table structure
2. Create new supporting tables
3. Migrate existing data:
   - Make shift_id required 
   - Set default_production_rate_per_hour based on old efficiency_percentage
   - Set default_unit_of_measure to 'pieces'

### Phase 2: Model Updates
1. Update WorkCell model with new relationships
2. Add capacity calculation methods
3. Remove old capacity logic

### Phase 3: Scheduling Integration
1. Update ProductionSchedulingService to use new capacity model
2. Implement simple finite capacity checks
3. Add capacity visualization to UI

## Benefits

### 1. Simplified Capacity Model
- Clear calculation: Available Time × Production Rate
- Easy to understand and maintain
- Direct integration with shift schedules

### 2. Accurate Scheduling
- Prevent overbooking with real-time capacity checks
- Account for setup times and constraints
- Support different production rates per item

### 3. Improved Visibility
- Clear view of available capacity by day
- Simple capacity utilization metrics
- Easy identification of bottlenecks

## Units of Measure (UOM) Considerations

### 1. Simple UOM Support
The system tracks production rates in specific units:
- Each work cell has a default UOM (pieces, kg, liters, etc.)
- Item-specific rates can override with different UOMs
- Simple conversion when order UOM differs from work cell UOM

### 2. UOM Type System
Units must belong to compatible types:
```
UOM Types:
- COUNT (pieces, units, each)
- MASS (kg, g, lb, oz)
- LENGTH (m, cm, ft, in)
- AREA (m², ft²)
- VOLUME (L, mL, gal, fl oz, m³)
- TIME (hours, minutes)
```

### 3. UOM Master Table
```sql
CREATE TABLE units_of_measure (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    uom_type VARCHAR(20) NOT NULL, -- COUNT, MASS, LENGTH, AREA, VOLUME, TIME
    is_base_unit BOOLEAN DEFAULT FALSE,
    base_unit_code VARCHAR(20), -- Reference to base unit for this type
    conversion_to_base DECIMAL(15,8) DEFAULT 1.0
);
```

### 4. UOM Conversion
Conversions are only allowed within the same UOM type:
```
UOM_Conversions Table:
- from_uom
- to_uom  
- conversion_factor
- item_id (optional, for item-specific conversions)
```

### 5. Capacity Calculation with UOM Type Validation
When scheduling:
1. Validate that item UOM type matches work cell UOM type
2. If types don't match: scheduling is not allowed (e.g., can't schedule kg items on a pieces/hour work cell)
3. If types match but units differ: convert quantity using conversion table
4. Calculate time = setup + (converted quantity / production rate)

Example validations:
- ✓ Item in "kg" → Work cell in "lb/hour" (both MASS type)
- ✗ Item in "pieces" → Work cell in "kg/hour" (COUNT vs MASS type)
- ✓ Item in "meters" → Work cell in "feet/hour" (both LENGTH type)

## Example Use Cases

### 1. Standard Manufacturing Cell
A CNC milling work cell:
- Dedicated to milling operations only
- Default rate: 20 pieces/hour
- Part A: Uses default rate
- Part B: 10 pieces/hour (more complex geometry)
- Setup time varies by part
- Capacity = shift hours × production rate

### 2. Bulk Processing Work Cell
A chemical mixing tank:
- Capacity measured in liters/hour (VOLUME type)
- Can process items measured in:
  - Other volume units (gallons, mL) ✓
  - Mass units (kg) ✗ - Incompatible type
- For mass-based items, need a different work cell or convert at item level
- Simple time calculation: volume needed / flow rate

### 3. Assembly Work Cell
Manual assembly station:
- Rate varies by product complexity
- Default: 50 units/hour
- Complex products: 20 units/hour

### 4. Outsourced Operations (Infinite Capacity)
External vendor with unlimited capacity:
- `has_finite_capacity = false`
- No shift constraints
- Can schedule any quantity at any time
- Lead time tracked separately
- Production rates used only for costing/reporting

## Performance Considerations

### 1. Efficient Queries
- Index on (work_cell_id, scheduled_date) for fast capacity lookups
- Cache shift schedule calculations for the day
- Batch capacity checks when scheduling multiple operations

### 2. Simple Data Model
- Minimal joins required for capacity calculations
- Direct relationship between shift hours and capacity
- Fast constraint checking with date range indexes

## Future Enhancements

### 1. Advanced Scheduling
- Optimization algorithms for better sequencing
- Multi-resource constraints (operators, tools)
- Setup time optimization between similar products

### 2. Real-time Updates
- Actual vs planned production tracking
- Dynamic capacity adjustments based on performance
- Integration with shop floor data collection

### 3. Reporting
- Capacity utilization reports
- Bottleneck analysis
- Production efficiency metrics

## Conclusion

This simplified WorkCell model provides flexibility for different capacity scenarios:

**For Finite Capacity Work Cells:**
- **Time availability** from shift schedules
- **Production rates** that can vary by item
- **Simple constraints** for maintenance and downtime
- Clear formula: `Available Time × Production Rate`

**For Infinite Capacity Work Cells:**
- No scheduling constraints
- Ideal for outsourced operations or unconstrained resources
- Production rates used only for costing and reporting

The model supports both constrained and unconstrained scheduling scenarios while remaining easy to understand, implement, and maintain. UOM conversions are supported when needed, keeping the core logic simple and efficient.
