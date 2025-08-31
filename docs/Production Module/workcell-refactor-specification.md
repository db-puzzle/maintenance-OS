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
- default_setup_time_minutes (integer, default 0, standard setup time if not overridden by item)
- max_parallel_executions (integer, default 1, number of operations that can run in parallel)
```

## New Related Models

### 1. WorkCellItemRate
Defines production rates and setup times for specific items on this work cell. This allows overriding the work cell's default values for specific items that may require different processing parameters.

```
Fields:
- work_cell_id
- item_id
- setup_time_minutes (overrides work cell's default_setup_time_minutes)
- production_rate_per_hour (overrides work cell's default_production_rate_per_hour)
- unit_of_measure (overrides work cell's default_unit_of_measure)
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

### 3. WorkCellParallelResource
Tracks available parallel resources for work cells

```
Fields:
- work_cell_id
- shift_id (optional, for shift-specific resources)
- resource_date (for date-specific assignments)
- available_count (number of parallel resources available)
- notes
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
Base Production Capacity = Available Time × Production Rate

// With parallel execution capability
Effective Production Capacity = Base Production Capacity × min(max_parallel_executions, available_parallel_resources)
```

Where `available_parallel_resources` is tracked in the WorkCellParallelResource table and represents the actual number of parallel resources available (operators, machines, stations, etc.) for a given work cell at a specific time.

### 3. Time Availability (Finite Capacity Only)
The system calculates available time by:
- Getting working hours from the shift schedule for each day
- Subtracting scheduled breaks
- Subtracting any constraints (maintenance, holidays, etc.)

### 4. Production Rate and Setup Time Application (Finite Capacity Only)
For scheduling operations on finite capacity work cells:
```
// Get the appropriate production rate and setup time
Production Rate = WorkCellItemRate.production_rate_per_hour for specific item
                  OR WorkCell.default_production_rate_per_hour

Setup Time = WorkCellItemRate.setup_time_minutes for specific item
             OR WorkCell.default_setup_time_minutes

// Calculate time required for single execution
Base Time Required = Setup Time + (Quantity / Production Rate × 60)

// With parallel execution, setup time is always applied once for the entire operation
// regardless of how many parallel resources are used
Parallel Time Required = Setup Time + (Quantity / (Production Rate × Active Parallel Executions) × 60)

// Check if fits within available capacity
Can Schedule = Parallel Time Required <= Available Time
```

#### Parallel Execution Time Calculation Example:
```
Work Cell: Assembly Station
- Default Setup Time: 30 minutes
- Production Rate: 10 units/hour per resource
- max_parallel_executions: 4
- Currently available parallel resources: 3

Order: 120 units of Product A
Product A uses default setup time and rate

// Sequential execution (1 resource):
Time = 30 min + (120 / 10) × 60 min = 30 + 720 = 750 minutes

// Parallel execution with shared setup (3 resources):
Time = 30 min + (120 / (10 × 3)) × 60 min = 30 + 240 = 270 minutes

// Parallel execution with independent setup (3 resources):
// Each resource needs its own 30-minute setup
// But they can set up and run in parallel
Time per resource = 30 min + (40 / 10) × 60 min = 30 + 240 = 270 minutes
// Total time is still 270 minutes as all run in parallel

// Different Product B with custom setup:
Product B: 60 minutes setup, 8 units/hour
// Sequential: 60 + (120 / 8) × 60 = 60 + 900 = 960 minutes
// Parallel (3 resources, shared setup): 60 + (120 / (8 × 3)) × 60 = 60 + 300 = 360 minutes
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
    
    // Determine active parallel executions
    activeParallelExecutions = determineActiveParallelCapacity(workCell, scheduledDateTime);
    
    // Calculate time with parallel execution consideration
    calculateRequiredTimeWithParallel(quantity, activeParallelExecutions);
    
    // Check both time capacity and parallel slot availability
    verifyCapacityFit();
    verifyParallelSlotAvailable();
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
2. Check parallel execution slots availability
3. Calculate time required considering parallel execution
4. Find earliest slot that fits both time and parallel constraints
5. Book the time slot and parallel execution slot
6. Update remaining capacity and parallel slot count
```

### 3. Parallel Execution Slot Management
```
// Track concurrent operations
For each time period:
- Track number of operations currently executing
- Ensure concurrent operations <= max_parallel_executions
- Consider resource availability (operators, machines, etc.)

// Booking logic
When scheduling an operation:
1. Find time slots with available parallel capacity
2. Reserve both time and parallel slot
3. Track which parallel "lane" is used (for visualization)
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
ADD COLUMN default_setup_time_minutes INTEGER DEFAULT 0,
ADD COLUMN max_parallel_executions INTEGER DEFAULT 1,
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

### 5. Work Cell Parallel Resources
```sql
CREATE TABLE work_cell_parallel_resources (
    id BIGSERIAL PRIMARY KEY,
    work_cell_id BIGINT REFERENCES work_cells(id),
    shift_id BIGINT REFERENCES shifts(id),
    resource_date DATE,
    available_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_resource_lookup (work_cell_id, resource_date, shift_id)
);
```

### 6. Enhanced Capacity Tracking with Parallel Slots
```sql
CREATE TABLE work_cell_capacity_bookings (
    id BIGSERIAL PRIMARY KEY,
    work_cell_id BIGINT REFERENCES work_cells(id),
    manufacturing_step_id BIGINT REFERENCES manufacturing_steps(id),
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_minutes INTEGER NOT NULL,
    parallel_slot INTEGER DEFAULT 1, -- Which parallel execution slot (1 to max_parallel_executions)
    quantity DECIMAL(10,3),
    unit_of_measure VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_capacity_date_cell (scheduled_date, work_cell_id, start_time),
    INDEX idx_parallel_slots (work_cell_id, scheduled_date, start_time, parallel_slot)
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
- Default setup time: 30 minutes
- Part A: Uses default rate and setup time
- Part B: 10 pieces/hour (more complex geometry), 60 minutes setup
- Part C: 15 pieces/hour, 45 minutes setup
- Capacity calculation includes both setup and production time

### 2. Bulk Processing Work Cell
A chemical mixing tank:
- Capacity measured in liters/hour (VOLUME type)
- Can process items measured in:
  - Other volume units (gallons, mL) ✓
  - Mass units (kg) ✗ - Incompatible type
- For mass-based items, need a different work cell or convert at item level
- Simple time calculation: volume needed / flow rate

### 3. Assembly Work Cell with Parallel Resources
Manual assembly station with multiple workstations:
- Rate varies by product complexity
- Default: 50 units/hour per workstation
- Default setup time: 15 minutes
- Complex products: 20 units/hour per workstation, 30 minutes setup
- max_parallel_executions: 6
- Morning shift: 4 resources available
- Afternoon shift: 6 resources available
- Each resource can work independently on different orders
- Setup not shared - each workstation needs individual setup

### 4. Packaging Line with Parallel Stations
Packaging work cell with multiple packing stations:
- Base rate: 100 packages/hour per station
- Default setup time: 20 minutes
- max_parallel_executions: 4
- All 4 stations always available during operating hours
- Setup time is applied once for all stations
- Product A: Uses defaults
- Product B: 80 packages/hour, 40 minutes setup (special packaging)
- Orders can be split across multiple stations for faster completion

### 5. CNC Machining Center with Multiple Machines
Automated machining center:
- Rate depends on part complexity
- Default setup time: 45 minutes
- max_parallel_executions: 3
- 3 identical CNC machines
- Each machine can run independently
- Setup time is applied once per operation
- Part X: 30 pieces/hour, 30 minutes setup
- Part Y: 15 pieces/hour, 90 minutes setup (complex tooling)
- Maintenance can reduce available machines

### 6. Outsourced Operations (Infinite Capacity)
External vendor with unlimited capacity:
- `has_finite_capacity = false`
- No shift constraints
- Can schedule any quantity at any time
- Lead time tracked separately
- Production rates used only for costing/reporting

## Parallel Execution Considerations

### 1. Setup Time Handling
Setup time is a critical component of capacity planning.

#### Default Setup Time (Work Cell Level)
- Each work cell has a `default_setup_time_minutes`
- Applies to all items unless overridden
- Represents the standard changeover/preparation time

#### Item-Specific Setup Time (WorkCellItemRate Level)
- Override setup time for specific items
- Accounts for item-specific tooling, material prep, or configuration
- Takes precedence over work cell default

#### Parallel Execution Setup Model
When using parallel execution:
- Setup time is always applied once for the entire operation
- The setup happens at the beginning of the operation before any parallel processing
- All parallel resources benefit from the single setup
- This simplifies scheduling and capacity planning

### 2. Order Splitting
When parallel execution is available:
- Large orders can be split across multiple parallel slots
- System automatically optimizes split to minimize total time
- Maintains lot traceability by linking split operations

### 3. Resource Availability Tracking
- Track actual available resources by shift/date
- Handle dynamic changes (operator sick days, machine breakdowns)
- Prevent over-scheduling beyond actual available resources
- Use WorkCellParallelResource table for resource count management

### 4. Scheduling Algorithm Adjustments
```
// Finding best slot with parallel execution
For each time slot:
1. Check total time availability
2. Check parallel slot availability
3. Calculate effective capacity with available parallel resources
4. Consider setup time sharing possibilities
5. Optimize for earliest completion time

// Parallel slot assignment
When booking:
1. Assign to lowest available parallel slot number
2. Track slot usage for visualization
3. Enable easy identification of bottlenecks
```

### 5. Capacity Visualization
The system should provide views showing:
- Timeline view with parallel "swimlanes" for each execution slot
- Resource utilization across parallel slots
- Bottleneck identification when all slots are full

## Performance Considerations

### 1. Efficient Queries
- Index on (work_cell_id, scheduled_date) for fast capacity lookups
- Cache shift schedule calculations for the day
- Batch capacity checks when scheduling multiple operations
- Additional index on parallel_slot for quick slot availability checks

### 2. Simple Data Model
- Minimal joins required for capacity calculations
- Direct relationship between shift hours and capacity
- Fast constraint checking with date range indexes
- Efficient parallel slot tracking with proper indexing

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

This enhanced WorkCell model provides comprehensive flexibility for different capacity and execution scenarios:

**For Finite Capacity Work Cells:**
- **Time availability** from shift schedules
- **Production rates** that can vary by item
- **Parallel execution support** for multiple operators, machines, or stations
- **Dynamic resource tracking** for accurate capacity planning
- **Simple constraints** for maintenance and downtime
- Clear formula: `Available Time × Production Rate × Active Parallel Executions`

**For Parallel Execution:**
- **Simple resource tracking**: just track available count, not type
- **Shared or independent setup times** based on work cell characteristics
- **Automatic order splitting** across available parallel slots
- **Real-time resource availability** tracking via WorkCellParallelResource
- **Optimized scheduling** considering both time and parallel constraints

**For Infinite Capacity Work Cells:**
- No scheduling constraints
- Ideal for outsourced operations or unconstrained resources
- Production rates used only for costing and reporting

The model supports sequential, parallel, constrained, and unconstrained scheduling scenarios while remaining easy to understand, implement, and maintain. The parallel execution feature significantly enhances capacity utilization for work cells with multiple resources, enabling more efficient production scheduling and better resource utilization. UOM conversions are supported when needed, keeping the core logic simple and efficient.
