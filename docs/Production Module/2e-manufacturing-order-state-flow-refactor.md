# Manufacturing Order State Flow Refactoring Plan

## Executive Summary

This specification outlines the refactoring of the Manufacturing Order (MO) state flow to:
1. Add **Scheduled** state between Planned and Released
2. Add **On Hold** state for pausing active production
3. Support **optional direct release** from Draft to Released
4. Align with three-stage lifecycle: Planning, Scheduling, and Execution
5. Remove mandatory route requirement for release

### Key Changes:
- **New States**: `scheduled` and `on_hold`
- **New Transitions**: Plan, Schedule, Hold, Resume
- **Flexible Flow**: Support both simple (direct release) and complex (full planning/scheduling) orders

## Overview

This specification outlines the refactoring of the Manufacturing Order (MO) state flow to support a three-stage lifecycle: Planning, Scheduling, and Execution. The system will support both complex orders that go through full planning/scheduling and simple orders that can be directly released.

## Current State Analysis

### 1. Current State Transitions

- **Draft**: Initial state when order is created
- **Planned**: Currently not implemented - no transition from draft to planned
- **Released**: Requires route with steps (incorrect requirement)
- **In Progress**: Set when first step execution starts
- **Completed**: Automatically set when all steps complete OR all child orders complete
- **Cancelled**: Can be cancelled from any state except completed

### 2. Missing States

- **Scheduled**: Not implemented - needed between Planned and Released for time slot assignment
- **On Hold**: Not implemented - needed for pausing active production

### 3. Current Route Dependency

- `ManufacturingOrder::canBeReleased()` checks for route existence
- `ManufacturingOrderService::releaseOrder()` validates route and steps exist
- UI disables release button if no route exists
- Route creation is only allowed for draft/planned orders

## Proposed State Flow

### 1. New State Model

The system will support the following states aligned with the three-stage lifecycle:

**Planning Stage (Optional):**
- **Draft**: Initial order creation
- **Planned**: Routing steps assigned to work cells (what is done where)

**Scheduling Stage (Optional):**
- **Scheduled**: Time slots assigned to steps on work cells (when things happen)

**Execution Stage:**
- **Released**: Order released to production floor
- **In Progress**: Active manufacturing
- **On Hold**: Production temporarily paused
- **Completed**: Manufacturing finished
- **Cancelled**: Order cancelled (terminal state)

### 2. State Transitions

Primary Flow:
- Draft → Planned → Scheduled → Released → In Progress → Completed

Alternative Flows:
- Draft → Released (direct release for simple orders)
- In Progress ↔ On Hold (pause/resume production)
- Draft/Planned/Released/On Hold → Cancelled

### 3. Transition Requirements

- **Draft → Planned**: Requires route with all steps assigned to work cells
- **Draft → Released**: No requirements (direct release option)
- **Planned → Scheduled**: Requires time slots for all steps
- **Scheduled → Released**: All scheduling complete
- **Released → In Progress**: Production starts (manual or first step execution)
- **In Progress → On Hold**: Pause production
- **On Hold → In Progress**: Resume production
- **In Progress → Completed**: All quantities produced

## Proposed Changes

### 1. Database Changes

#### A. Status Enum Update
- Add 'scheduled' to the status enum after 'planned'
- Add 'on_hold' to the status enum after 'in_progress'
- Migration to update existing database enum

### 2. Backend Changes

#### A. Model Changes (ManufacturingOrder.php)
- Remove route validation from `canBeReleased()` method
- Add state transition methods:
  - `canBePlanned()`: Validates route with work cell assignments exists
  - `canBeScheduled()`: Validates order is planned
  - `canBeReleased()`: Allows from draft or scheduled states
  - `canBePutOnHold()`: Validates order is in_progress
  - `canBeResumed()`: Validates order is on_hold
- Update status validation logic for all transitions

#### B. Service Changes (ManufacturingOrderService.php)
- Remove route validation from `releaseOrder()` method
- Add new transition methods:
  - `planOrder()`: Draft → Planned (validates routing)
  - `scheduleOrder()`: Planned → Scheduled (validates time slots)
  - `releaseOrder()`: Updated to work from Draft or Scheduled
  - `startProduction()`: Released → In Progress
  - `holdOrder()`: In Progress → On Hold
  - `resumeOrder()`: On Hold → In Progress
- Keep step queuing logic conditional (only if route exists)

#### C. Controller Changes (ManufacturingOrderController.php)
- Add new actions:
  - `plan()`: Draft → Planned transition
  - `schedule()`: Planned → Scheduled transition
  - `start()`: Released → In Progress transition
  - `hold()`: In Progress → On Hold transition
  - `resume()`: On Hold → In Progress transition
- Update `release()` to handle both draft and scheduled states
- Update `show()` to pass all available transitions

#### D. Route Changes (routes/production.php)
- Add POST `/orders/{order}/plan`
- Add POST `/orders/{order}/schedule`
- Add POST `/orders/{order}/start`
- Add POST `/orders/{order}/hold`
- Add POST `/orders/{order}/resume`

### 3. Frontend Changes

#### A. Show Page (manufacturing-orders/show.tsx)
- Remove route check from release button logic
- Add transition buttons based on current state:
  - "Plan" button for draft orders (only if route exists)
  - "Schedule" button for planned orders
  - "Release" button for draft and scheduled orders
  - "Start Production" button for released orders
  - "Hold" button for in-progress orders
  - "Resume" button for on-hold orders
- Update tooltip messages for each transition
- Update status badges to include new states

#### B. Index Page (manufacturing-orders/index.tsx)
- Update action dropdown to show status-appropriate actions
- Remove route check from Release action
- Add all new transition actions to dropdown
- Update status display to show scheduled and on_hold states

#### C. Route Tab (ManufacturingOrderRouteTab.tsx)
- Allow route creation for draft, planned, and scheduled states
- Update messages to reflect that routes are optional for release
- Show work cell assignments for planned/scheduled orders
- Display scheduling information for scheduled orders

#### D. New Components
- Create SchedulingPanel component for time slot assignment
- Update StatusBadge component to handle new states
- Add visual indicators for optional vs required flow paths

### 4. Business Logic Flow

#### State Transition Logic:

1. **Draft**
   - Can be edited freely
   - Can transition to Planned (if route with work cells exists)
   - Can transition directly to Released (optional fast path)
   - Can be cancelled

2. **Planned**
   - Limited editing (quantity, dates)
   - Can transition to Scheduled
   - Can be cancelled
   - Route modifications allowed

3. **Scheduled**
   - Very limited editing
   - Can transition to Released
   - Can be cancelled
   - Schedule adjustments allowed

4. **Released**
   - No editing of core properties
   - Can transition to In Progress
   - Can be cancelled
   - Ready for production floor

5. **In Progress**
   - Tracks actual production
   - Can transition to On Hold
   - Can transition to Completed
   - Production reporting enabled

6. **On Hold**
   - Production paused
   - Can transition back to In Progress
   - Can be cancelled
   - Maintains production history

7. **Completed**
   - Final state, no transitions
   - All quantities produced
   - Historical record

#### Production Tracking:
- **With Route**: Step executions drive progress automatically
- **Without Route**: Manual quantity updates on the order
- **Hybrid**: Route for guidance, manual overrides allowed

### 5. Implementation Steps

1. **Phase 1: Database and Model Updates**
   - Create migration to add 'scheduled' and 'on_hold' to status enum
   - Update ManufacturingOrder model with new state methods
   - Add validation logic for each transition
   - Update existing factories and seeders

2. **Phase 2: Backend Service Layer**
   - Implement all new transition methods in service
   - Update existing release logic for dual paths
   - Add scheduling validation logic
   - Implement hold/resume functionality

3. **Phase 3: Controller and Routes**
   - Add all new controller actions
   - Define new routes
   - Update API responses with transition availability
   - Add proper authorization checks

4. **Phase 4: Frontend State Management**
   - Update TypeScript interfaces for new states
   - Add new action buttons and handlers
   - Update status displays throughout UI
   - Implement scheduling interface

5. **Phase 5: Testing & Documentation**
   - Test all state transitions
   - Verify both simple and complex order flows
   - Update API documentation
   - Create user guides for new workflow

### 6. Considerations

- **Backward Compatibility**: Existing orders maintain current behavior
- **Permission System**: New permissions needed:
  - `manufacturing_orders.plan`
  - `manufacturing_orders.schedule`
  - `manufacturing_orders.hold`
  - `manufacturing_orders.resume`
- **Child Orders**: Parent state changes may cascade to children
- **Reporting**: Analytics must handle all state paths
- **Scheduling Integration**: Future integration with capacity planning
- **Work Cell Availability**: Scheduling must consider work cell calendars

### 7. Benefits

- **Flexibility**: Support both simple and complex production scenarios
- **Clear Lifecycle**: Three distinct stages (Planning, Scheduling, Execution)
- **Better Control**: Hold/Resume for production interruptions
- **Scalability**: Foundation for advanced scheduling features
- **Real-world Alignment**: Matches typical manufacturing workflows
- **Optional Complexity**: Simple orders can bypass planning/scheduling