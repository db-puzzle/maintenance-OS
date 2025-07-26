# Production Module - Complete Pages List

## Overview

This document provides a comprehensive list of all pages required for the Production Module, organized by functional area to enable progressive development and testing. Each section includes both operational workflows and administrative CRUD interfaces.

## Key Architecture Notes

### Manufacturing Routes are Order-Specific
Unlike traditional systems where routes are tied to items, in this system:
- **Routes belong to Manufacturing Orders**, not items
- The same item can have different routes in different orders
- Routes are created after the order is released
- Route templates provide reusability across orders

### Parent-Child Order Relationships
When creating an order for a BOM:
- System automatically creates child orders for all BOM items
- Parent orders track child completion status
- Parent orders can auto-complete when all children complete
- Quantities are consolidated for duplicate items in the BOM

## Development Order & Dependencies

The sections are ordered to allow progressive development, where each phase builds upon the previous:

1. **Phase 1: Foundation** - Master data and configuration
2. **Phase 2: Product Structure** - Items and BOMs
3. **Phase 3: Manufacturing Setup** - Routing and work cells
4. **Phase 4: Planning & Execution** - Orders and scheduling
5. **Phase 5: Tracking & Fulfillment** - QR tracking and shipments
6. **Phase 6: Analytics & Reporting** - Dashboards and insights

---

## Phase 1: Foundation - Master Data & Configuration

### 1.1 System Configuration
**Purpose**: Set up foundational data used throughout the system

#### Administrative Pages:
- `/production/admin/units-of-measure`
  - List page with search, filter, pagination
  - Create/Edit form (code, description, type, conversion factors)
  - Bulk import capability
  
- `/production/admin/categories`
  - Hierarchical category list
  - Create/Edit form (name, parent, description, attributes)
  - Category merge tool
  
- `/production/admin/item-types`
  - Item type configuration list
  - Create/Edit form (type, capabilities, required fields)
  - Type migration tool

- `/production/admin/statuses`
  - Status configuration by entity type
  - Create/Edit form (status, transitions, permissions)
  - Workflow visualization

- `/production/admin/custom-attributes`
  - Custom field configuration
  - Create/Edit form (field type, validation, entity mapping)
  - Attribute templates

### 1.2 Vendor Management
**Purpose**: Manage external suppliers and service providers

#### Administrative Pages:
- `/production/vendors`
  - Vendor list with search, categories, status
  - Create/Edit form (details, contacts, capabilities, certifications)
  - Vendor performance dashboard
  
- `/production/vendors/{id}`
  - Vendor details with tabs (info, items, orders, performance)
  - Contact management
  - Document repository

---

## Phase 2: Product Structure - Items & BOMs

### 2.1 Item Management
**Purpose**: Central repository for all manufacturable, purchasable, and sellable items

#### Operational Pages:
- `/production/items` ✓ (Already in UI spec)
  - Item list with advanced filters
  - Quick actions menu
  
- `/production/items/create` ✓
  - Multi-step creation wizard
  - Template selection
  
- `/production/items/{id}` ✓
  - Comprehensive item view with tabs
  - Related data widgets
  
- `/production/items/{id}/edit` ✓
  - Full edit form with validation
  - Change tracking

#### Additional Administrative Pages:
- `/production/items/bulk-import`
  - CSV/Excel import wizard
  - Field mapping interface
  - Validation preview
  - Import history

- `/production/items/bulk-update`
  - Mass update tool
  - Conditional updates
  - Preview changes

- `/production/items/{id}/history`
  - Complete audit trail
  - Change comparison view
  - Rollback capability

- `/production/items/{id}/inventory`
  - Current stock levels
  - Location tracking
  - Movement history

### 2.2 Bill of Materials (BOM)
**Purpose**: Define product structure and component relationships

#### Operational Pages:
- `/production/bom` ✓
  - BOM list with filters
  - Quick preview
  
- `/production/bom/create` ✓
  - BOM creation wizard
  - Import options
  
- `/production/bom/{id}` ✓
  - BOM details view
  - Version selector
  
- `/production/bom/{id}/hierarchy` ✓
  - Visual hierarchy view
  - Interactive navigation

#### Additional Administrative Pages:
- `/production/bom/{id}/versions`
  - Version list and comparison
  - Create new version
  - Version approval workflow
  
- `/production/bom/{id}/where-used`
  - Where-used analysis
  - Impact assessment
  - Circular reference check

- `/production/bom/{id}/cost-rollup`
  - Cost calculation view
  - What-if analysis
  - Cost history

- `/production/bom/templates`
  - BOM template management
  - Template library
  - Create from template

---

## Phase 3: Manufacturing Orders & Routes

### 3.1 Manufacturing Order Management
**Purpose**: Create and manage manufacturing orders with parent-child relationships

#### Operational Pages:
- `/production/orders` ✓
  - Order list with status filters
  - Parent/child indicators
  - Quick actions (release, cancel)
  
- `/production/orders/create` ✓
  - Create single order for item
  - Set quantity, priority, dates
  - Auto-assign order number
  
- `/production/orders/create-from-bom` ✓
  - Multi-step wizard for BOM orders
  - Preview child orders
  - Configure route templates
  
- `/production/orders/{id}` ✓
  - Order details with tabs
  - Progress tracking
  - Child order summary
  
- `/production/orders/{id}/edit` ✓
  - Edit order details
  - Update quantities/dates
  - Restricted based on status

#### Additional Pages:
- `/production/orders/{id}/children`
  - List all child orders
  - Tree view of hierarchy
  - Bulk status updates
  
- `/production/orders/{id}/routes`
  - View/manage order routes
  - Create route from template
  - Edit route steps
  
- `/production/orders/{id}/timeline`
  - Visual timeline of order
  - Step dependencies
  - Critical path view

### 3.2 Manufacturing Routes & Steps
**Purpose**: Define and manage manufacturing processes per order

#### Operational Pages:
- `/production/routes` 
  - All routes list
  - Filter by order, status
  - Route templates
  
- `/production/orders/{orderId}/routes/create` ✓
  - Create route for order
  - Visual route builder
  - Template selection
  
- `/production/routes/{id}/edit` ✓
  - Edit existing route
  - Add/remove/reorder steps
  - Update step details
  
- `/production/routes/{id}`
  - Route details view
  - Step sequence
  - Performance metrics

#### Manufacturing Steps:
- `/production/steps/{id}/execute` ✓
  - Mobile-optimized execution
  - Form integration
  - Quality check interface
  
- `/production/steps/{id}/history`
  - Step execution history
  - Time tracking
  - Quality results

### 3.3 Work Cell Management
**Purpose**: Define manufacturing resources and capacity

#### Administrative Pages:
- `/production/work-cells`
  - Work cell list with capacity indicators
  - Filter by type, location, status
  
- `/production/work-cells/create`
  - Create form (code, name, type, capacity)
  - Location assignment
  - Capability definition
  
- `/production/work-cells/{id}`
  - Details with tabs (info, schedule, performance, maintenance)
  - Capacity calendar
  - Utilization charts
  
- `/production/work-cells/{id}/edit`
  - Edit all work cell properties
  - Capacity planning tools
  - Skill requirements

- `/production/work-cells/{id}/schedule`
  - Visual schedule view
  - Drag-drop rescheduling
  - Conflict resolution

### 3.4 Route Templates
**Purpose**: Reusable manufacturing process templates

#### Administrative Pages:
- `/production/route-templates`
  - Template library
  - Category filtering
  - Usage statistics
  
- `/production/route-templates/create`
  - Create new template
  - Define standard steps
  - Set default times
  
- `/production/route-templates/{id}/edit`
  - Edit template steps
  - Update configurations
  - Version management
  
- `/production/route-templates/{id}/preview`
  - Visual preview
  - Step sequence
  - Time estimates

### 3.5 Quality Control Setup
**Purpose**: Configure quality checks and standards

#### Administrative Pages:
- `/production/quality/standards`
  - Quality standards list
  - Pass/fail criteria
  - Sampling plans
  
- `/production/quality/check-types`
  - Quality check types
  - Measurement methods
  - Form associations
  
- `/production/quality/sampling-plans`
  - ISO 2859 configurations
  - Lot size tables
  - AQL settings

### 3.6 Failure Mode Management
**Purpose**: Quality control and failure tracking setup

#### Administrative Pages:
- `/production/admin/failure-modes`
  - Failure mode list by category
  - Create/Edit forms
  - Cause-effect relationships
  
- `/production/admin/immediate-causes`
  - Immediate cause catalog
  - Link to failure modes
  - Prevention methods
  
- `/production/admin/root-causes`
  - Root cause hierarchy
  - Analysis templates
  - Corrective actions

---

## Phase 4: Planning & Execution

### 4.1 Production Planning & Scheduling
**Purpose**: Schedule and optimize production

#### Operational Pages:
- `/production/planning/calendar` ✓
  - Calendar view of schedules
  - Drag-drop interface
  
- `/production/planning/gantt` ✓
  - Gantt chart view
  - Resource allocation

#### Additional Pages:
- `/production/planning`
  - Planning dashboard
  - Capacity overview
  - Bottleneck analysis
  
- `/production/planning/mrp`
  - Material requirements planning
  - Shortage reports
  - Purchase suggestions
  
- `/production/planning/capacity`
  - Capacity planning board
  - Load leveling tools
  - What-if scenarios

- `/production/planning/optimizer`
  - Schedule optimization
  - Constraint configuration
  - Optimization results

### 4.2 Production Execution
**Purpose**: Track actual production progress

#### Operational Pages:
- `/production/tracking` ✓
  - Production status dashboard
  - Work cell monitors
  - Active orders by status
  
- `/production/tracking/scan` ✓
  - QR scanner interface
  - Mobile optimized
  - Step execution

#### Additional Pages:
- `/production/execution/by-order/{orderId}`
  - Order execution view
  - All steps for order
  - Progress tracking
  
- `/production/execution/by-workcell/{workCellId}`
  - Work cell queue
  - Current/upcoming steps
  - Operator assignments
  
- `/production/execution/quality-dashboard`
  - Active quality checks
  - Failed items queue
  - Rework tracking
  
- `/production/execution/reports`
  - Daily production report
  - Efficiency metrics
  - Quality statistics

---

## Phase 5: Tracking & Fulfillment

### 5.1 QR Code Management
**Purpose**: Generate and manage tracking codes

#### Administrative Pages:
- `/production/qr-codes`
  - QR code registry
  - Search by code, item, date
  - Bulk operations
  
- `/production/qr-codes/generate`
  - Bulk generation interface
  - Label design
  - Print queue
  
- `/production/qr-codes/{code}/history`
  - Scan history timeline
  - Location tracking
  - Event details

### 5.2 Shipment Management
**Purpose**: Manage outbound shipments

#### Operational Pages:
- `/production/shipments/create` ✓
  - Shipment creation wizard
  - Photo capture

#### Additional Pages:
- `/production/shipments`
  - Shipment list with filters
  - Status tracking
  - Carrier performance
  
- `/production/shipments/{id}`
  - Shipment details
  - Document viewer
  - Tracking integration
  
- `/production/shipments/{id}/edit`
  - Update shipment info
  - Add/remove items
  - Adjust quantities
  
- `/production/shipments/{id}/manifest`
  - Manifest generation
  - Document templates
  - Signature capture

- `/production/shipments/calendar`
  - Shipping calendar
  - Carrier schedules
  - Capacity planning

---

## Phase 6: Analytics & Reporting

### 6.1 Production Analytics
**Purpose**: Insights and performance monitoring

#### Dashboard Pages:
- `/production/analytics`
  - Main analytics dashboard
  - KPI summary
  - Trend analysis
  
- `/production/analytics/efficiency`
  - OEE analysis
  - Efficiency trends
  - Bottleneck identification
  
- `/production/analytics/quality`
  - Quality metrics
  - Defect analysis
  - Pareto charts
  
- `/production/analytics/costs`
  - Cost analysis
  - Variance reports
  - Profitability by item

### 6.2 Custom Reports
**Purpose**: Flexible reporting tools

#### Report Pages:
- `/production/reports`
  - Report library
  - Saved reports
  - Schedule reports
  
- `/production/reports/builder`
  - Report builder interface
  - Data source selection
  - Visualization options
  
- `/production/reports/{id}`
  - Report viewer
  - Export options
  - Share functionality

### 6.3 Audit & Compliance
**Purpose**: Track changes and ensure compliance

#### Administrative Pages:
- `/production/audit-log`
  - Complete audit trail
  - Advanced filtering
  - Export capabilities
  
- `/production/compliance`
  - Compliance dashboard
  - Certification tracking
  - Audit preparation

---

## Supporting Pages

### Import/Export Management
- `/production/imports`
  - Import job history
  - Status monitoring
  - Error logs
  
- `/production/exports`
  - Export templates
  - Scheduled exports
  - Format configuration

### System Administration
- `/production/admin`
  - Module settings
  - Feature toggles
  - Performance tuning
  
- `/production/admin/permissions`
  - Role-based permissions
  - Custom role builder
  - Permission matrix

### Help & Documentation
- `/production/help`
  - Interactive help center
  - Video tutorials
  - Best practices
  
- `/production/help/workflows`
  - Process documentation
  - Step-by-step guides
  - Tips and tricks

---

## Mobile-Specific Pages

### Mobile Production App
- `/m/production/scan` - QR scanner
- `/m/production/execute` - Work execution
- `/m/production/report` - Quick reporting
- `/m/production/lookup` - Item/order lookup

---

## Integration Points

### External System Integrations
- `/production/integrations/inventor` - Autodesk Inventor sync
- `/production/integrations/erp` - ERP connection status
- `/production/integrations/webhooks` - Webhook configuration

---

## Testing Progression

### Phase 1 Testing Focus:
- Master data setup
- Configuration validation
- Permission testing

### Phase 2 Testing Focus:
- Item creation workflows
- BOM hierarchy validation
- Import/export functionality

### Phase 3 Testing Focus:
- Routing inheritance
- Capacity calculations
- Work cell scheduling

### Phase 4 Testing Focus:
- Order creation flows
- Schedule optimization
- MRP calculations

### Phase 5 Testing Focus:
- QR code scanning
- Mobile interfaces
- Shipment workflows

### Phase 6 Testing Focus:
- Report accuracy
- Performance metrics
- Analytics calculations

---

## Notes

1. Pages marked with ✓ are already specified in the UI/UX document
2. Each page should follow the existing design system using Shadcn/ui components
3. All lists should include standard features: search, filter, sort, pagination, export
4. All forms should include validation, auto-save, and change tracking
5. Mobile pages should be responsive and touch-optimized
6. Consider offline capability for shop floor pages

This comprehensive list ensures complete CRUD coverage for all entities while maintaining a logical development progression that allows for incremental testing and deployment. 