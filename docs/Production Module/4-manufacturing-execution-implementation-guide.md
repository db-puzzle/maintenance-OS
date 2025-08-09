# Production Module – Manufacturing Order & Step Execution Implementation Guide

## 1) Purpose and Scope

This guide describes the concrete implementation steps to complete the end-to-end lifecycle for Manufacturing Orders (MOs) and Manufacturing Route Steps with mobile QR-based execution. It aligns the codebase to the specifications in:

- `1-production-module-requirements.md`
- `1a-qr-code-tracking-requirements.md`
- `1c-item-images-specification.md`
- `2-production-module-detailed-design.md`
- `2a-item-master-migration-guide.md`
- `2b-manufacturing-order-migration-plan.md`
- `2c-bom-item-relationship-migration-plan.md`
- `2d-bom-single-top-item-enforcement.md`
- `2e-manufacturing-order-state-flow-refactor.md`
- `2f-qr-code-implementation-spec.md`

Primary persona: Shop-floor operators executing steps via mobile after scanning MO QR codes, plus supervisors and planners.


## 2) High-level Goals

- Operators scan MO QR → land on a mobile page showing current step and allowed actions.
- Start/hold/resume/complete steps with dependency and work-cell enforcement.
- Execute Quality Checks (every part, entire lot, sampling ISO 2859) including rework flows.
- Propagate state: Steps → Routes → Orders (including parent-child MO auto-completion).
- Unified QR URL structure and external scan handling with authentication redirects.
- Consistent analytics/auditing of scans and step transitions.


## 3) Backend Implementation

### 3.1 Data model and migrations (confirm/finish)

Ensure the following migrations exist and match `2a` and `2b`:

- Items and BOM
  - `items` (item master replacing products)
  - `bill_of_materials`, `bom_versions`, `bom_items` with single root enforcement (`2d`)

- Manufacturing
  - `manufacturing_orders` (parent-child links, status, quantity, dates)
  - `manufacturing_routes` (route tied to order + item)
  - `manufacturing_steps` (step_type, status, dependency, QC mode, work_cell, form links)
  - `manufacturing_step_executions` (lot/part tracking, status timestamps, QC results, work_cell, executed_by, form_execution_id)

- Forms (if applicable)
  - Add nullable `manufacturing_step_execution_id` to form executions/tasks per `2b` (Phase 1.5) when forms are executed inside steps.

Checklist

- [ ] All tables above present and columns align with specs
- [ ] Foreign keys and indexes created
- [ ] Legacy tables linking to the old “production_executions” are not used by the new flow


### 3.2 QR URL structure and external scan flow

Per `1a` and `2f`:

- URL format (absolute, include `/qr` suffix for analytics):
  - Items: `https://[domain]/production/items/{item-number}/qr`
  - Orders: `https://[domain]/production/orders/{mo-number}/qr`

Implementation

- `App/Services/Production/QrCodeService` (ensure or add):
  - `generateItemUrl(Item $item): string`
  - `generateOrderUrl(ManufacturingOrder $order): string`
  - `findClosestParentWithRoute(ManufacturingOrder $order): ?ManufacturingOrder`
  - Generate absolute URLs and append `/qr` suffix.

- `routes/qr.php` and `App/Http/Controllers/Production/QrCodeController`:
  - Methods: `handleItemScan(Request, string $itemNumber)`, `handleOrderScan(Request, string $orderNumber)`
  - If not authenticated → redirect to login with intended URL (FR-015)
  - If in-app (deep link) → return JSON `{ type, redirect, data }` without full-page Inertia
  - Else → render mobile-optimized Inertia pages: `production/qr/ItemScan`, `production/qr/OrderScan`
  - For MO tags with no route, link to closest parent MO with route (FR-008/FR-009)

Checklist

- [ ] QrCodeService generates absolute URLs with `/qr`
- [ ] `handleItemScan` and `handleOrderScan` support both in-app and browser flows
- [ ] Unauthenticated scans redirect to login and back
- [ ] Parent-with-route fallback for route-less MOs implemented


### 3.3 Step execution lifecycle (server authority)

Controllers

- `App/Http/Controllers/Production/ManufacturingStepController`:
  - `execute(step)` (GET): Preload step, route, order, images, and permissions
  - `start(step)`:
    - Enforce dependency (`depends_on_step_id`, `can_start_when_dependency`)
    - Enforce work-cell assignment (operator must belong to `step.work_cell_id`)
    - Create `ManufacturingStepExecution` records (per QC mode):
      - every_part → one execution per lot part
      - entire_lot → one execution for the lot
      - sampling → compute sample size via ISO 2859 (see service below)
    - If first step on route → set MO status `in_progress`
    - Mark step `in_progress` (or `queued`→`in_progress`), timestamp `actual_start_time`

  - `hold(step, execution)`: set `on_hold`, timestamp, notes; validate only if `in_progress`
  - `resume(step, execution)`: compute hold duration; set `in_progress`
  - `recordQualityResult(step, execution)`: set `quality_result`, `quality_notes`, optional `failure_action` (scrap|rework)
    - If `rework` and no rework step → create `rework` step dependent on current (append number) and queue it
  - `complete(step, execution)`:
    - For standard steps: accept `quantity_completed`, `quantity_scrapped`
    - Set `completed_at`, compute `actual_duration_minutes`; update MO quantities
    - If all executions for step complete → set step to `completed`, `actual_end_time`
    - Find next step whose dependency is now satisfied → set `queued`
    - If all steps complete → set MO `completed` (also cascade to parent `checkAutoComplete()`)

Services

- `App/Services/Production/ManufacturingOrderService`:
  - Keep: create order (BOM children), create route from template
  - New: `advanceNextStep(ManufacturingRoute $route, ManufacturingStep $fromStep)`; `markOrderInProgressIfNeeded(ManufacturingOrder)`; `markOrderCompleteIfNeeded(ManufacturingOrder)`

- `App/Services/Production/QualitySamplingService` (new):
  - Given lot size and sampling settings, compute ISO 2859 sample size (`1a` FR-013)

Policies

- Ensure/complete:
  - `production.steps.execute` (operators)
  - `production.steps.executeQualityCheck` (inspectors/supervisors)
  - `production.steps.handleRework` (supervisors)
  - Work-cell-based access control: operators must be assigned to the step’s work cell

Audit & Analytics

- On each scan and state transition, log events via `AuditLogService` and a unified QR event model (e.g., `qr_tracking_events`), including `event_type` and metadata (user, device, location when available).

Checklist

- [ ] Dependency rules enforced server-side on `start`
- [ ] Work-cell access enforced on `start/hold/resume/complete`
- [ ] QC modes correctly create executions and UI reflects remaining parts/samples
- [ ] Rework creation and queuing behavior implemented
- [ ] Next-step queuing upon dependency resolution
- [ ] Route/MO status propagation


### 3.4 Routes and cleanup

- `routes/qr.php`: keep scan entry points; ensure `/production/.../qr` endpoints exist and delegate to `QrCodeController`
- `routes/production.php`:
  - Steps: `steps.execute`, `steps.start`, `steps.hold`, `steps.resume`, `steps.quality`, `steps.complete`
  - Orders: `orders.release`, `orders.cancel`, `orders.routes.store`
  - Tracking dashboard and analytics: keep separate from execution endpoints

Cleanup (legacy)

- Retire legacy `ProductionExecutionController` QR production actions in favor of `ManufacturingStep*` flow
- Ensure no pages return plain JSON unless intended API endpoints; prefer Inertia responses elsewhere


### 3.5 Tests

Add Feature tests covering:

- Scan → mobile page → start step → (QC optional) → complete step → next step queued
- Work-cell permission denial on start
- Parent-child MO auto-completion
- Sampling mode (sample size calc) and every_part behavior
- Route-less MO tag opens closest parent with route


## 4) Frontend Implementation

### 4.1 In-app QR scanning and deep linking

- Build a reusable scanner component (PWA-friendly) with camera support and manual entry fallback
- When scanning a full URL, parse `/production/(items|orders)/{identifier}/qr` and navigate in-app without opening browser (FR-013)

Targets

- `resources/js/pages/production/qr/OrderScan.tsx`
- `resources/js/pages/production/qr/ItemScan.tsx`
- `resources/js/pages/production/qr-tracking/scan.tsx` (promote camera scanner; remove demo warning)


### 4.2 Mobile OrderScan page

Enhance `OrderScan.tsx` to:

- Show item primary image and (if applicable) parent-with-route image per `1c`
- Show route and step list with current step highlighted; indicate dependencies and work cell
- Provide contextual actions based on permissions and work cell assignment:
  - Start current step (opens Execute)
  - Record QC (when step is QC)
  - Complete step
  - Navigate to next step after completion
- If MO has no route, clearly link to closest parent MO with route and show child MO statuses
- Respect Inertia responses and existing UI kit (shadcn) and in-project components


### 4.3 Step Execute page

Enhance `resources/js/pages/production/steps/execute.tsx`:

- Keep states: starting → in_progress → (quality_check) → completing → completed
- QC modes UX:
  - every_part: show part counter and approve/reject per part; failing one can shortcut to completing
  - sampling: show sample counter; integrate ISO 2859 sample size
  - entire_lot: single decision UI
- Rework: upon failure and `rework` selection, show feedback; next screen should reflect rework step when created
- Hold/Resume dialogs; show timer and durations; record reasons
- Disable actions when user lacks permission or wrong work cell; show reason text


### 4.4 Offline support (phaseable)

- Add service worker for scanner pages; cache shell and allow queueing scan events for retry on reconnect


### 4.5 Images integration

- Use item image preview/carousel components from `1c` (primary image indicator, count badge, carousel on tap)
- Ensure variant URLs (WebP) used where available


## 5) Permissions and Roles

Confirm and seed the following (see `2b` and `1-production-module-requirements.md`):

- Manufacturing Orders: view/create/update/release/cancel
- Manufacturing Routes: view/create/update/delete; create from template
- Manufacturing Steps: view/update/execute/executeQualityCheck/handleRework
- Items/BOMs: view/create/update/delete/import/manage
- Shipments: view/create/update/uploadPhotos/markDelivered

Scope-aware permissions (Plant/Area/Sector) must cascade; enforce work-cell-based access for machine operators.


## 6) Legacy → New Flow Migration

- Replace legacy production execution endpoints with the new step execution endpoints
- Keep QR tracking dashboard/analytics but unify the scan event model and fields
- Update any old product references to items across controllers and views (per `2a`)


## 7) Rollout & Sequencing Plan

Recommended order:

1) Confirm migrations and models; add sampling service; finalize policies
2) Implement server-side step lifecycle (dependencies, work-cell, QC modes, rework)
3) Align QR URL generation, controller scan flows, and public `/qr` handling
4) Enhance OrderScan and Step Execute pages; add scanner component and deep link parsing
5) Add offline/PWA support (optional phase)
6) Migrate legacy execution flows; remove unused endpoints
7) Tests: unit, feature, and end-to-end flows


## 8) Definition of Done (DoD)

- Scanning an MO QR (external or in-app) lands the operator in a mobile page showing current step and allowed actions
- Starting a step enforces dependency + work-cell checks and transitions MO/route states
- QC execution supports all three modes; rework steps are created/queued on failure when selected
- Completing last step completes MO and triggers parent auto-completion when applicable
- URLs conform to `/production/.../{id}/qr`, with absolute links in tags and auth redirect
- All pages return Inertia responses; permission-gated UI; images integrated per `1c`
- Tests pass for the scenarios in section 3.5


## 9) File-by-File Worklist (key touches)

Backend

- `app/Services/Production/QrCodeService.php` (URLs + parent-with-route)
- `app/Http/Controllers/Production/QrCodeController.php` (public scan flow)
- `app/Http/Controllers/Production/ManufacturingStepController.php` (full lifecycle)
- `app/Http/Controllers/Production/ManufacturingOrderController.php` (release/cancel + helpers)
- `app/Services/Production/ManufacturingOrderService.php` (advance, MO state helpers)
- `app/Services/Production/QualitySamplingService.php` (new)
- `app/Policies/Production/*` (permissions; work-cell checks)
- `routes/qr.php`, `routes/production.php` (endpoints)
- `app/Services/AuditLogService.php` usage in transitions

Frontend

- `resources/js/pages/production/qr/OrderScan.tsx` (actions, images, steps)
- `resources/js/pages/production/qr/ItemScan.tsx` (images, actions)
- `resources/js/pages/production/steps/execute.tsx` (QC modes, rework, hold/resume)
- `resources/js/pages/production/qr-tracking/scan.tsx` (camera scanning, deep linking)
- Shared scanner + image components per `1c`


## 10) References

See the specification files listed in section 1 for detailed requirements, acceptance criteria, and UI/UX guidelines.


