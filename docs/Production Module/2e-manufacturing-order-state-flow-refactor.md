# Manufacturing Order State Flow Refactoring Plan

## Current Issue

The system currently enforces that a manufacturing order must have a route before it can be released. This is incorrect - manufacturing orders should be able to flow through their states (draft → planned → released → in_progress → completed) independently of route creation.

## Current State Analysis

### 1. Current State Transitions

- **Draft**: Initial state when order is created
- **Planned**: Currently not implemented - no transition from draft to planned
- **Released**: Requires route with steps (incorrect requirement)
- **In Progress**: Set when first step execution starts
- **Completed**: Automatically set when all steps complete OR all child orders complete
- **Cancelled**: Can be cancelled from any state except completed

### 2. Current Route Dependency

- `ManufacturingOrder::canBeReleased()` checks for route existence
- `ManufacturingOrderService::releaseOrder()` validates route and steps exist
- UI disables release button if no route exists
- Route creation is only allowed for draft/planned orders

## Proposed Changes

### 1. Backend Changes

#### A. Model Changes (ManufacturingOrder.php)
- Remove route validation from `canBeReleased()` method
- Add `canBePlanned()` method for draft → planned transition
- Keep status validation (only draft/planned can be released)

#### B. Service Changes (ManufacturingOrderService.php)
- Remove route validation from `releaseOrder()` method
- Add `planOrder()` method for draft → planned transition
- Keep step queuing logic but make it conditional (only if route exists)
- Add `startProduction()` method to transition released → in_progress

#### C. Controller Changes (ManufacturingOrderController.php)
- Add `plan()` action for draft → planned transition
- Update `release()` to work without route
- Add `start()` action for released → in_progress transition
- Update `show()` to always pass `canRelease` based on status only

#### D. Route Changes (routes/production.php)
- Add POST `/orders/{order}/plan` route
- Add POST `/orders/{order}/start` route

### 2. Frontend Changes

#### A. Show Page (manufacturing-orders/show.tsx)
- Remove route check from release button logic
- Add "Plan" button for draft orders
- Add "Start Production" button for released orders
- Update tooltip messages accordingly
- Show appropriate status transition buttons based on current status

#### B. Index Page (manufacturing-orders/index.tsx)
- Update action dropdown to show status-appropriate actions
- Remove route check from Release action
- Add Plan action for draft orders

#### C. Route Tab (ManufacturingOrderRouteTab.tsx)
- Allow route creation for any non-completed order
- Update messages to reflect that routes are optional
- Show different UI states based on order status

### 3. Database Changes

No migration changes needed - the status enum already supports all states.

### 4. Business Logic Flow

#### New State Transition Flow:
1. **Draft** → Can be edited, planned, or cancelled
2. **Planned** → Can be released, edited (limited), or cancelled
3. **Released** → Can start production (with or without route), or cancelled
4. **In Progress** → Tracks actual production (route-based or manual)
5. **Completed** → Final state

#### Route Independence:
- Routes can be created at any time before completion
- If route exists when released, steps are queued automatically
- If no route exists, order can still progress through manual tracking
- Production can be tracked via:
  - Route-based: Step executions drive progress
  - Manual: Direct quantity updates on the order

### 5. Implementation Steps

1. **Phase 1: Backend State Transitions**
   - Update `canBeReleased()` to remove route check
   - Add plan/start methods to service
   - Add controller actions
   - Add routes

2. **Phase 2: Frontend Updates**
   - Update button visibility logic
   - Add new action buttons
   - Update status badges and messages

3. **Phase 3: Route Independence**
   - Make route creation available for more states
   - Update UI messages
   - Add manual progress tracking UI (if no route)

4. **Phase 4: Testing & Validation**
   - Test all state transitions
   - Verify route-based and manual flows
   - Update seeders and factories

### 6. Considerations

- **Backward Compatibility**: Existing orders with routes continue to work
- **Permission System**: May need new permissions for plan/start actions
- **Child Orders**: Auto-completion logic remains unchanged
- **Reporting**: Analytics should handle both routed and non-routed orders

### 7. Benefits

- More flexible production management
- Support for simple orders without detailed routing
- Better alignment with real-world manufacturing processes
- Ability to release orders for material allocation before routing
- Support for external production (no internal routing needed)