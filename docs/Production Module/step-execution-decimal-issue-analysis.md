# Manufacturing Step Execution - Decimal Issue Analysis

## Issue Summary
When transitioning a step from "queued" to "in_progress" state, the system throws an SQL error:
```
SQLSTATE[22P02]: Invalid text representation: 7 ERROR: invalid input syntax for type integer: "1.00"
```

## Root Cause Analysis

### Database Schema Mismatch
1. **Manufacturing Orders Table** (`manufacturing_orders`):
   - `quantity` field is defined as `decimal(10, 2)`
   - This allows decimal values like "1.00", "1.50", etc.

2. **Manufacturing Step Executions Table** (`manufacturing_step_executions`):
   - `total_parts` field is defined as `integer`
   - This only accepts whole numbers

### Code Flow
1. `StepExecutionController::start()` is called when starting a step execution
2. It calls `$step->startExecution(null, $order->quantity_remaining ?: $order->quantity)`
3. `$order->quantity` returns "1.00" (as a decimal string due to the cast in the model)
4. `ManufacturingStep::startExecution()` tries to insert this decimal value into the integer `total_parts` field
5. PostgreSQL throws an error because it cannot convert "1.00" to an integer

### Additional Findings
- The `quantity_remaining` property doesn't exist on ManufacturingOrder model
- The ManufacturingOrder model casts quantity fields as 'decimal:2'
- The same issue exists in the `forceStart` method

## Potential Solutions

### Option 1: Change Database Column Type (Not Recommended)
- Change `total_parts` to decimal in the database
- This would be a breaking change and might affect other parts of the system

### Option 2: Cast to Integer When Creating Execution (Recommended)
- Convert the decimal quantity to integer before passing to `startExecution`
- Add proper rounding logic (floor, ceil, or round)
- This is the least invasive fix

### Option 3: Handle in Model (Alternative)
- Add a mutator in ManufacturingStepExecution model to handle the conversion
- This would provide a safety net for all future code

## Recommendation
Implement Option 2 with proper logging to ensure we don't lose precision unintentionally. The conversion should happen in the controller before calling `startExecution`.

