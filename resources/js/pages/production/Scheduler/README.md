# Production Scheduler Dummy Data

## Overview

The clean dummy data file (`clean-dummy-data.ts`) provides a focused dataset that demonstrates:

1. **Manufacturing Order Hierarchy**
   - Parent order (Engine Assembly) with 4 child orders
   - Child orders for components (Engine Block, Pistons, ECM, Crankshaft)
   - Progressive flow dependencies between parent and children

2. **Manufacturing Routes and Steps**
   - Multiple steps per route with different types (standard, quality_check)
   - Step dependencies with various start conditions
   - Child order dependencies at the step level

3. **Production Scheduling**
   - Schedules spanning past, present, and future dates
   - Resource conflicts and overlapping schedules
   - Locked schedules showing user assignments

4. **Alerts and Issues**
   - Capacity overruns
   - Late delivery risks
   - Dependency violations
   - Resource conflicts

## Key Features Demonstrated

### 1. Dependency Types
- **None**: No dependencies
- **All Children Released**: Parent waits for all children
- **Children Percentage**: Parent can start when X% of children complete
- **Progressive Flow**: Continuous material flow between orders

### 2. Step Dependencies
- **Completed**: Traditional batch - wait for previous step to finish all units
- **Quantity Based**: Start after X units from previous step
- **Percentage Based**: Start after X% completion
- **Immediate**: Start as soon as previous step begins

### 3. Order Statuses
- Shows various states: planned, in_progress, completed
- Demonstrates state transitions and business rules

## Usage

The dummy data is designed to:
- Test complex UI scenarios
- Validate dependency visualization
- Test scheduling algorithms
- Demonstrate progressive flow capabilities

## Clean Data Benefits

This cleaner version of the dummy data:
- Removes unnecessary BOM data that isn't used by the scheduler
- Focuses only on the Manufacturing Order hierarchy and relationships
- Provides exactly what the scheduling UI needs to operate
- Makes it clearer what data the scheduler actually depends on

The MO parent-child relationships contain all the hierarchy information needed for:
- Visualizing order dependencies
- Calculating progressive flow
- Determining when orders can start
- Tracking completion across the hierarchy
