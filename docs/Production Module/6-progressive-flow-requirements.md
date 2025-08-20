# Manufacturing Order Routing - Progressive Flow Requirements

> **Note**: For all code examples and technical implementation details, please refer to the companion document: [6a-progressive-flow-code-examples.md](./6a-progressive-flow-code-examples.md)

## Executive Summary

This document specifies the requirements for implementing progressive flow manufacturing, where products can move to the next step in the production sequence before the entire order quantity completes the current step. Currently, the system enforces a strict batch completion model where a step must process 100% of the order quantity before the next step can begin. This enhancement will introduce configurable rules that allow subsequent steps to begin processing as soon as a specified quantity of items has been completed in the previous step, enabling continuous flow through the production process.

## Current System Analysis

### 1. Current Behavior

#### 1.1 Step Dependency Model
- **Strict Linear Execution**: Steps must be fully completed (100% of quantity) before dependent steps can start
- **Automatic Dependency Assignment**: Steps are automatically linked to the previous step if no explicit dependency is set
- **Single Dependency Type**: Only supports "completed" as the dependency condition (`can_start_when_dependency = 'completed'`)
- **Status-Based Gating**: The `canStart()` method only checks if the dependency step status equals 'completed'

#### 1.2 Current Database Schema
```sql
-- manufacturing_steps table
can_start_when_dependency ENUM('completed', 'in_progress') DEFAULT 'completed'
depends_on_step_id BIGINT NULLABLE
```

#### 1.3 Execution Tracking
- **Step-Level Tracking**: Each step tracks its overall status (pending → queued → in_progress → completed)
- **Execution-Level Tracking**: Individual executions track part numbers and total parts, but no quantity completion
- **Order-Level Quantities**: Manufacturing orders track `quantity_completed` and `quantity_scrapped`

### 2. Limitations of Current System

1. **Batch Processing Delays**: The entire order quantity must complete a step before any units can proceed to the next step
2. **Idle Time**: Downstream work cells remain idle waiting for the full batch to complete upstream steps
3. **Increased Lead Time**: Total production time is extended due to batch waiting periods between steps
4. **Large WIP Accumulation**: Products accumulate between steps instead of flowing continuously
5. **Reduced Flexibility**: Cannot respond quickly to priority changes or expedite partial quantities

## Proposed System Design

### Key Design Decision: Progressive Flow vs Batch Processing

The system will transition from strict batch processing to progressive flow manufacturing. This fundamental shift allows products to flow continuously through the production sequence rather than waiting for entire batches to complete at each step. 

Key aspects of this design:
1. **Continuous Flow**: Products can move to the next step as soon as a minimum quantity is available
2. **Configurable Thresholds**: Each step can define when the next step in sequence can begin processing
3. **Sequential Processing**: Steps continue to execute in their defined sequence, but with overlapping execution
4. **Reduced WIP**: Smaller quantities in process at each step, with continuous movement through the production line

### 1. Enhanced Dependency Model

#### 1.1 New Start Conditions for Progressive Flow
The system will introduce new start conditions that define when the next step in the sequence can begin processing:

- **Completed**: The traditional batch behavior where the previous step must process 100% of the order quantity before the next step can start
- **Quantity-based**: The next step can start after a specific number of units have been completed in the previous step
- **Percentage-based**: The next step can start after a certain percentage of the total order quantity has been completed in the previous step

#### 1.2 Database Schema Changes

The database schema will undergo significant modifications to support the new dependency model:

**Manufacturing Steps Table Changes:**
- Remove the `step_number` column and its associated unique constraint
- Add `dependency_start_condition` field to specify how the dependency is evaluated
- Add `dependency_minimum_quantity` for quantity-based dependencies
- Add `dependency_minimum_percentage` for percentage-based dependencies
- Add `display_order` field for UI ordering purposes only
- Add `cumulative_quantity_completed` and `cumulative_quantity_scrapped` for tracking progress

**Manufacturing Step Executions Table Changes:**
- Add `quantity_completed` field to track completed units per execution
- Add `quantity_scrapped` field to track scrapped units per execution

These changes enable granular tracking of progress at both the step and execution levels.

### 2. Step Execution Rules

#### 2.1 Quantity-Based Start Conditions

This rule allows a step to begin execution once the dependency step has completed a specified minimum quantity of units. For example, if configured with a minimum quantity of 10, the dependent step can start as soon as 10 units have been completed in the previous step, regardless of the total order quantity. This is particularly useful for operations that work on fixed batch sizes.

#### 2.2 Percentage-Based Start Conditions

This rule enables a step to start when the dependency step has completed a certain percentage of its total quantity. For instance, with a 25% threshold, if an order is for 100 units, the dependent step can begin once 25 units are completed. This approach scales automatically with order size and is ideal for operations that need proportional buffering.



### 3. Implementation Requirements

#### 3.1 Model Updates

**ManufacturingOrder Model**

The ManufacturingOrder model will be enhanced with several new methods to support Work In Progress (WIP) calculations:

- **Work In Progress Calculation**: A method to calculate the current WIP by finding the difference between quantities completed at the first and last steps. This handles multiple parallel first/last steps by summing their quantities.

- **Helper Methods**: Separate methods to get the total quantity that has entered production (from first steps) and exited production (from last steps).

- **Detailed WIP Analysis**: An alternative method that provides WIP breakdown by individual steps, showing where inventory accumulates in the production flow.

**ManufacturingStep Model**
The ManufacturingStep model will receive critical updates to support progressive flow:

- **Sequential Position Tracking**: Track the step's position in the production sequence for display and flow management purposes.

- **Enhanced Start Condition Checking**: The canStart method will be updated to evaluate when the next step in sequence can begin based on the configured start condition (completed, quantity-based, percentage-based, or immediate).

- **Automatic Next Step Activation**: A method that checks the next step in sequence and automatically queues it when its start conditions are met based on quantities completed in the current step.

- **Progress Tracking**: Enhanced tracking of cumulative quantities completed to trigger the next step in the production sequence.

**ManufacturingStepExecution Model**

The execution model will be enhanced with quantity reporting capabilities that update both the execution record and the parent step's cumulative totals. This triggers automatic checking of dependent steps for potential activation.

#### 3.2 Service Updates

**ManufacturingOrderService**

The service layer will be updated with several key enhancements:

- **Progressive Flow Management**: The service will track quantities as they complete each step and automatically trigger the next step in sequence when start conditions are met.

- **Continuous Progress Reporting**: A new method will allow reporting incremental progress as units complete processing. This updates cumulative quantities and checks if the next sequential step can begin.

- **Flow Control**: Logic to ensure products flow continuously through the sequence while respecting configured minimum quantities or percentages between steps.

### 4. User Interface Requirements

#### 4.1 Work In Progress (WIP) Display

**Location**: Manufacturing Order Show Page / Overview Tab

The WIP display will provide real-time visibility into production flow with the following elements:

1. **WIP Summary Card**: Shows the current quantity of units in production with a progress visualization and percentage indicator.

2. **Production Flow Indicator**: Displays three key metrics - units that have entered production (from first steps), units currently in process (WIP), and units that have completed all steps.

3. **Visual Flow Diagram**: A graphical representation showing the flow from order through production to completion, with color coding to indicate status (green for completed, yellow for WIP, gray for not started).

#### 4.2 Step Configuration UI

**Location**: Manufacturing Route Editor / Step Configuration Dialog

The step configuration interface will allow users to set dependency rules with:

1. **Dependency Type Selector**: Radio buttons or dropdown to choose between "Wait for complete (100%)", "Start after quantity", or "Start after percentage".

2. **Conditional Input Fields**: Dynamic fields that appear based on the selected dependency type - a quantity input for quantity-based rules or a percentage slider/input for percentage-based rules.

3. **Visual Indicators**: Estimated wait time calculations based on current production rates and warnings for potential bottlenecks.

#### 4.3 Execution Progress UI

**Location**: Step Execution Interface

The progress reporting interface will enable operators to report partial completion with:

1. **Progress Input Form**: Number inputs for units completed and units scrapped, with a "Report Progress" button that updates quantities without completing the step.

2. **Visual Progress Indicators**: A progress bar showing step completion percentage, indicators for when dependent steps can start, and real-time updates of status changes.

#### 4.4 Route Visualization

**Enhancement**: Progressive Flow Diagram

The route visualization will clearly show the continuous flow of products through the production sequence:

1. **Sequential Flow View**: A linear representation of steps in their execution sequence
2. **Overlapping Execution**: Visual indicators showing where steps overlap in time
3. **Flow Rate Indicators**: Annotations showing the quantity or percentage thresholds between steps
4. **Real-time Progress**: Live animation showing products flowing from step to step
5. **Buffer Visualization**: Display of WIP quantities accumulating between steps
6. **Bottleneck Detection**: Highlighting steps where flow is restricted
7. **Time-based View**: Optional timeline showing when each unit enters and exits each step

#### 4.5 Step Display Updates

The step display will be optimized for progressive flow visualization:

- **Sequential Position**: Show the step's position in the production sequence
- **Flow Status**: Indicate whether products are currently flowing into, through, or out of each step
- **Start Condition Display**: Show the configured threshold (e.g., "Starts after 10 units" or "Starts after 25%")
- **Progress Indicators**: Display how many units have entered and exited each step
- **Flow Rate**: Optional display of units per hour flowing through each step

### 5. Business Logic Rules

#### 5.1 Validation Rules

1. **Quantity Validation**
   - `dependency_minimum_quantity` must be less than the order total quantity
   - Cannot set quantity-based dependency on steps that don't track quantities

2. **Percentage Validation**
   - `dependency_minimum_percentage` must be between 0.01 and 99.99
   - 100% is equivalent to 'completed' condition

3. **Circular Dependency Prevention**
   - System must detect and prevent circular dependencies
   - A step cannot depend on itself or create dependency loops

4. **Step Type Restrictions**
   - Quality check steps may have special rules (e.g., minimum batch sizes)
   - Rework steps always require 'completed' dependency

#### 5.2 State Transition Rules

1. **Automatic Flow Progression**
   - The next step in sequence automatically moves from 'pending' to 'queued' when start conditions are met
   - System checks conditions after each quantity update in the previous step

2. **Sequential Execution**
   - Steps execute in their defined sequence with possible overlapping
   - Each step maintains its sequential position in the production flow

3. **Completion Rules**
   - A step is only marked 'completed' when 100% of its quantity is processed
   - The next step may already be processing units while the previous step continues

### 6. API Response Structure

#### 6.1 Manufacturing Order Response

The manufacturing order API responses will be enhanced to include comprehensive WIP calculations and production flow data:

**Controller Response Structure**: The show method will include work_in_progress_quantity, detailed_wip breakdown, and a production_flow object containing entered_production, in_process, and completed quantities.

**Resource Response Structure**: The API resource will include work_in_progress_quantity and wip_percentage calculated as a percentage of the total order quantity.

### 7. Reporting and Analytics

#### 7.1 New Metrics

1. **Flow Efficiency Metrics**
   - Lead time reduction from progressive flow implementation
   - Average time products spend in WIP between steps
   - Flow rate through each step (units per hour)

2. **Work In Progress (WIP) Metrics**
   - Real-time WIP quantities between each sequential step
   - Total WIP in the production sequence
   - WIP duration at each step
   - Optimal vs actual buffer sizes between steps

3. **Bottleneck Analysis**
   - Identify steps that restrict flow
   - Steps where WIP accumulates most
   - Recommended start condition adjustments for smoother flow

4. **Quality Impact**
   - Track quality rates with progressive flow
   - Monitor if smaller batch sizes between steps affect quality

#### 7.2 Audit Trail

The system will maintain a comprehensive audit trail for all dependency-based step activations, recording:
- The action type (step activated by partial completion)
- The step ID that was activated
- The dependency step ID that triggered the activation
- The quantity or percentage that triggered the activation
- Timestamp of the activation

### 8. Migration Strategy

#### 8.1 Database Migration

The migration process will be executed in several phases to ensure data integrity:

1. **Add Display Order Field**: First, add the display_order column and populate it from existing step_number values (multiplied by 10 to allow for future insertions).

2. **Remove Step Number**: Drop the step_number column and its associated unique constraint after data has been preserved in display_order.

3. **Add New Dependency Fields**: Add all new columns for dependency conditions, minimum quantities/percentages, and cumulative tracking.

4. **Update Existing Dependencies**: For routes without explicit dependencies, automatically create dependency relationships based on the old sequential order.

5. **Set Default Conditions**: Configure all existing steps to use the 'completed' dependency condition to maintain current behavior.

#### 8.2 Backward Compatibility

1. **Default Behavior**: All existing routes continue with 'completed' dependency
2. **Opt-in Feature**: Users must explicitly configure partial dependencies
3. **Permission Control**: New permission 'production.routes.configure_parallel_execution'

### 9. Testing Requirements

#### 9.1 Unit Tests

1. Test `canStart()` method with all dependency conditions
2. Test quantity tracking and cumulative updates
3. Test circular dependency prevention
4. Test state transitions with partial completions

#### 9.2 Integration Tests

1. Test multi-step routes with various dependency configurations
2. Test concurrent step execution
3. Test order completion with parallel steps
4. Test rollback scenarios

#### 9.3 Performance Tests

1. Test system performance with many parallel steps
2. Test dependency checking efficiency with large routes
3. Test real-time updates with multiple operators

### 10. Security Considerations

1. **Authorization**: Verify user permissions for parallel execution configuration
2. **Data Integrity**: Ensure atomic updates for quantity tracking
3. **Concurrency**: Handle race conditions in dependency checking
4. **Audit**: Log all configuration changes and executions

### 11. Future Enhancements

1. **Machine Learning**: Predict optimal dependency configurations based on historical data
2. **Dynamic Dependencies**: Adjust dependencies based on current production conditions
3. **Resource-Based Dependencies**: Consider work cell availability in dependency rules
4. **Quality Gates**: Automatic quality checks when certain thresholds are met

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1-2)
- Database schema updates
- Model updates for new dependency logic
- Basic quantity tracking

### Phase 2: User Interface (Week 3-4)
- Step configuration UI
- Progress reporting interface
- Visual indicators

### Phase 3: Testing and Refinement (Week 5-6)
- Comprehensive testing
- Performance optimization
- User acceptance testing

### Phase 4: Deployment (Week 7)
- Production deployment
- User training
- Documentation updates

## Success Metrics

1. **Lead Time Reduction**: 20-30% reduction in total order completion time through continuous flow
2. **WIP Reduction**: 40-50% reduction in average WIP inventory between steps
3. **Flow Efficiency**: 80% of products flowing continuously without batch waiting
4. **Quality Maintenance**: No increase in defect rates with progressive flow
5. **System Performance**: Start condition checks complete in <100ms for 95% of cases
