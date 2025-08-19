# Manufacturing Orders and Steps: State Management Guide

## Overview

The manufacturing system uses a hierarchical state management approach where Manufacturing Orders (MOs) represent the overall production request, and Manufacturing Steps represent the individual operations required to complete the order. Understanding how these states work and interact is crucial for effective production management.

## Manufacturing Order States

Manufacturing Orders progress through the following states:

### 1. **Draft** (Initial State)
- **Description**: The order has been created but not yet finalized
- **Allowed Actions**: 
  - Edit order details
  - Delete the order
  - Add/modify routing steps
  - Move to Planned state
- **Restrictions**: Cannot be released or executed

### 2. **Planned**
- **Description**: Order details are finalized and resources have been allocated
- **Entry Condition**: Manual transition from Draft
- **Allowed Actions**:
  - Release for production
  - Return to Draft for modifications
  - Cancel the order
- **Key Point**: This is the final review stage before production begins

### 3. **Released**
- **Description**: Order is approved and ready for production
- **Entry Condition**: Order must have a manufacturing route with at least one step
- **Automatic Actions**: 
  - All first steps (those without dependencies) automatically move to "Queued" status
  - Sets actual_start_date timestamp
- **Allowed Actions**:
  - Begin execution
  - Put on hold
  - Cancel

### 4. **In Progress**
- **Description**: Active production is underway
- **Entry Condition**: Automatically set when the first step begins execution
- **Allowed Actions**:
  - Put on hold
  - Continue execution
  - Cancel (with consequences)
- **Key Point**: At least one step is actively being worked on

### 5. **On Hold**
- **Description**: Production temporarily paused
- **Entry Condition**: Manual action with reason required
- **Automatic Actions**: 
  - All active steps (in_progress, awaiting_quality) are put on hold
  - Records hold_reason and hold_at timestamp
- **Allowed Actions**:
  - Resume production
  - Cancel
- **Key Point**: Preserves the state of all steps for clean resumption

### 6. **Completed**
- **Description**: All production finished successfully
- **Entry Condition**: Automatically set when all steps are completed/skipped/cancelled
- **Automatic Actions**:
  - Sets actual_end_date
  - Updates parent order if this is a child order
- **Final State**: No further actions allowed

### 7. **Cancelled**
- **Description**: Order terminated before completion
- **Entry Condition**: Manual cancellation (not allowed for Draft orders)
- **Automatic Actions**:
  - All non-completed steps move to "Cancelled" status
  - Cascades cancellation to all child orders
- **Final State**: No further actions allowed

## Manufacturing Step States

Manufacturing Steps represent individual operations within an order:

### 1. **Pending** (Initial State)
- **Description**: Step created but not ready for execution
- **Waiting For**: Dependencies to be met or parent order to be released
- **Key Point**: Cannot be executed yet

### 2. **Queued**
- **Description**: Ready for execution, all prerequisites met
- **Entry Conditions**:
  - Parent order is Released
  - All dependencies are completed
  - For first steps: Automatically set when MO is released
- **Allowed Actions**: 
  - Start execution
  - Skip (if allowed)
- **Key Point**: This indicates the step is available for operators to begin

### 3. **In Progress**
- **Description**: Step is actively being executed
- **Entry Condition**: Operator starts the step
- **Tracking**: 
  - actual_start_time is recorded
  - Execution details are tracked
- **Allowed Actions**:
  - Complete execution
  - Put on hold
  - Record partial progress

### 4. **Awaiting Quality** (Quality Steps Only)
- **Description**: Execution complete, waiting for quality inspection results
- **Entry Condition**: Quality check step execution completed
- **Purpose**: Clear distinction between "doing the work" and "verifying the work"
- **Allowed Actions**:
  - Record quality result (pass/fail)
  - Put on hold
- **Key Point**: Prevents confusion about whether work or inspection is pending

### 5. **On Hold**
- **Description**: Step temporarily paused
- **Entry Condition**: 
  - Manual pause of individual step, OR
  - Automatic when parent MO is put on hold
- **Resume Behavior**: Returns to previous state (in_progress or awaiting_quality)
- **Key Point**: Preserves context for clean resumption

### 6. **Completed**
- **Description**: Step finished successfully
- **Entry Conditions**:
  - Standard step: Execution completed
  - Quality step: Passed quality check
- **Automatic Actions**:
  - Updates actual_end_time
  - Queues next dependent steps
  - Updates MO progress
- **Final State**: No further changes

### 7. **Skipped**
- **Description**: Step bypassed (not executed)
- **Use Cases**: 
  - Optional operations not needed
  - Alternative path taken
- **Key Point**: Counts as "done" for order completion

### 8. **Cancelled**
- **Description**: Step will not be executed due to order cancellation
- **Entry Condition**: Parent MO is cancelled
- **Purpose**: Clear indication of why step wasn't completed
- **Final State**: No further changes

## State Transition Rules

### Manufacturing Order Transitions

```
Draft → Planned → Released → In Progress → Completed
  ↓        ↓         ↓            ↓
  Cancelled    Cancelled      On Hold
                              ↓
                         In Progress
```

### Manufacturing Step Transitions

```
Pending → Queued → In Progress → Completed
            ↓           ↓      ↘
         Skipped    On Hold   Awaiting Quality
                       ↓            ↓
                  In Progress    Completed

All states (except Completed) → Cancelled (when MO cancelled)
```

## Cascading State Changes

The system implements intelligent cascading to maintain consistency:

### 1. **MO Released → Steps Queued**
- When: Manufacturing Order moves to Released status
- Effect: All first steps (no dependencies) automatically move from Pending to Queued
- Purpose: Makes work immediately available to operators

### 2. **MO On Hold → Active Steps On Hold**
- When: Manufacturing Order is put on hold
- Effect: All steps in "In Progress" or "Awaiting Quality" move to "On Hold"
- Purpose: Ensures no active work continues during hold

### 3. **MO Resumed → Steps Resume**
- When: Manufacturing Order is resumed from hold
- Effect: All "On Hold" steps return to their previous state
- Purpose: Seamless continuation of work

### 4. **MO Cancelled → Steps Cancelled**
- When: Manufacturing Order is cancelled
- Effect: All non-completed steps move to "Cancelled" status
- Purpose: Clear indication that work was stopped due to order cancellation

## Quality Control Integration

Quality check steps have special handling:

1. **Execution Phase**: Step moves through Pending → Queued → In Progress as normal
2. **Inspection Phase**: After execution, moves to "Awaiting Quality" instead of directly to Completed
3. **Result Recording**:
   - **Pass**: Step moves to Completed
   - **Fail with Rework**: Creates/queues a rework step
   - **Fail with Scrap**: Updates scrap quantities and completes step

## Best Practices

### For Operators
1. Always check that a step is "Queued" before starting work
2. Complete quality inspections promptly when steps are "Awaiting Quality"
3. Provide clear reasons when putting orders on hold

### For Supervisors
1. Ensure routes are properly defined before releasing orders
2. Monitor "On Hold" orders and address issues quickly
3. Use the cascading rules to manage multiple steps efficiently

### For System Administrators
1. Set up routes with clear dependencies to ensure proper flow
2. Configure quality check modes appropriately for different operations
3. Monitor for stuck states (e.g., long-term "Awaiting Quality")

## Common Scenarios

### Scenario 1: Standard Production Flow
1. Create MO in Draft status
2. Plan and configure routing → Planned status
3. Release order → Released status, first steps become Queued
4. Operator starts first step → MO becomes In Progress
5. Complete each step in sequence
6. When all steps complete → MO becomes Completed

### Scenario 2: Quality Failure with Rework
1. Quality check step executed → Awaiting Quality
2. Quality check fails, rework selected
3. System creates rework step and queues it
4. Operator completes rework
5. Production continues normally

### Scenario 3: Emergency Hold
1. Issue discovered during production
2. MO put on hold with reason
3. All active steps automatically paused
4. Issue resolved
5. Resume MO → all steps return to previous state
6. Production continues from where it stopped

## State Visibility Benefits

The granular state system provides:

1. **Clear Work Queues**: Operators see exactly what's ready (Queued state)
2. **Quality Tracking**: Distinction between execution and verification
3. **Pause/Resume Capability**: Full context preservation during holds
4. **Audit Trail**: Clear record of why steps weren't completed (Cancelled vs Skipped)
5. **Automatic Workflow**: Minimal manual intervention for state progression

## Troubleshooting State Issues

### Step Stuck in Pending
- Check: Are all dependencies completed?
- Check: Is the parent MO released?

### Step Not Moving to Queued
- Verify: Dependencies are truly completed (not cancelled/skipped)
- Verify: Parent MO is in Released or In Progress status

### Order Not Completing
- Check: Are there any steps still in progress or awaiting quality?
- Check: Are there any steps in "On Hold" status?

### Quality Results Not Recording
- Verify: Step is in "Awaiting Quality" status
- Verify: User has quality check permissions

## Summary

The state management system ensures:
- **Predictable Flow**: Clear progression paths for both orders and steps
- **Operational Safety**: Can't execute steps before prerequisites are met
- **Flexibility**: Support for holds, skips, and quality workflows
- **Transparency**: Always know why something didn't complete
- **Automation**: Minimal manual state management required

This hierarchical approach with intelligent cascading creates a robust system that handles both simple linear production and complex workflows with quality gates and potential rework paths.
