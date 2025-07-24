# Production Module - Complete Pages List

## Overview

This document provides a comprehensive list of all pages required for the Production Module, organized by functional area to enable progressive development and testing. Each section includes both operational workflows and administrative CRUD interfaces.

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

## Phase 3: Manufacturing Setup - Routing & Resources

### 3.1 Work Cell Management
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

### 3.2 Production Routing
**Purpose**: Define manufacturing process steps

#### Operational Pages:
- `/production/routing/{id}/edit` ✓
  - Visual routing builder
  - Step sequencing

#### Additional Administrative Pages:
- `/production/routing`
  - All routings list
  - Filter by item, status, work cell
  - Routing templates
  
- `/production/routing/create`
  - Create new routing
  - Copy from existing
  - Import from CAD
  
- `/production/routing/{id}`
  - Routing details view
  - Where-used list
  - Performance metrics
  
- `/production/routing/{id}/simulate`
  - Time study simulation
  - Capacity validation
  - Cost estimation

- `/production/routing/templates`
  - Routing template library
  - Standard operations
  - Time standards

### 3.3 Failure Mode Management
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

### 4.1 Production Orders
**Purpose**: Create and manage manufacturing orders

#### Operational Pages:
- `/production/orders`
  - Order list with status filters
  - Priority indicators
  - Quick actions
  
- `/production/orders/create`
  - Order creation wizard
  - Demand source selection
  - Availability check
  
- `/production/orders/{id}`
  - Order details with progress
  - Component availability
  - Schedule timeline
  
- `/production/orders/{id}/edit`
  - Edit quantities, dates
  - Priority adjustment
  - Note management

- `/production/orders/bulk-create`
  - Mass order creation
  - From forecast/demand
  - Template-based

### 4.2 Production Planning & Scheduling
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

### 4.3 Production Execution
**Purpose**: Track actual production progress

#### Operational Pages:
- `/production/tracking` ✓
  - Production status dashboard
  - Work cell monitors
  
- `/production/tracking/scan` ✓
  - QR scanner interface
  - Mobile optimized

#### Additional Pages:
- `/production/execution`
  - Execution list view
  - Filter by status, work cell
  - Batch operations
  
- `/production/execution/{id}`
  - Execution details
  - Time tracking
  - Quality checks
  
- `/production/execution/{id}/report`
  - Production reporting
  - Quantity confirmation
  - Scrap reporting
  
- `/production/execution/dashboard`
  - Real-time monitors
  - OEE metrics
  - Alert management

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