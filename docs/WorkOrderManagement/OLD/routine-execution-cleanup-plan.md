# Routine Execution Cleanup Plan

## Overview
This document outlines the plan to complete the migration from the dual-execution model (RoutineExecution → FormExecution → TaskResponses) to the unified work order model. The RoutineExecution model has been removed, but several files still reference it and need to be updated.

## Current State
- ✅ RoutineExecution model removed
- ✅ Dashboard deprecated and removed
- ✅ Frontend components updated to use work orders
- ❌ Backend services and tests still reference RoutineExecution

## Files Requiring Updates

### 1. Test Files
- **Location**: `tests/Feature/Models/RoutineIntegrationTest.php`
- **Changes Needed**:
  - Update tests to verify work order generation instead of routine execution creation
  - Replace assertions about routine executions with work order assertions
  - Update test data factories to use WorkOrderFactory instead of RoutineExecutionFactory

### 2. ExecutionAnalyticsService
- **Location**: `app/Services/ExecutionAnalyticsService.php`
- **Changes Needed**:
  - Replace RoutineExecution queries with WorkOrder queries filtered by:
    - `category = 'preventive'`
    - `source_type = 'routine'`
  - Update metric calculations to use work order data
  - Modify completion rate calculations based on work order status

### 3. PDFGeneratorService
- **Location**: `app/Services/PDFGeneratorService.php`
- **Changes Needed**:
  - Update PDF generation to work with WorkOrderExecution instead of RoutineExecution
  - Modify data retrieval to fetch work order details
  - Update template variables to match work order structure

### 4. ExecutionExportController
- **Location**: `app/Http/Controllers/Maintenance/ExecutionExportController.php`
- **Changes Needed**:
  - Replace RoutineExecution queries with WorkOrder queries
  - Update export data structure to match work order fields
  - Modify filtering logic to work with work order attributes

### 5. RoutineExecutionPolicy
- **Location**: `app/Policies/RoutineExecutionPolicy.php`
- **Changes Needed**:
  - Either delete this file entirely (recommended) OR
  - Rename to WorkOrderExecutionPolicy and update all methods
  - Update authorization logic to work with work orders

### 6. RoutineExecutionFactory
- **Location**: `database/factories/Maintenance/RoutineExecutionFactory.php`
- **Changes Needed**:
  - Delete this file as it's no longer needed
  - Ensure WorkOrderFactory can create work orders with routine sources

## Implementation Steps

### Phase 1: Update Test Infrastructure
1. **Update RoutineIntegrationTest.php**
   ```php
   // Old: Test routine execution creation
   $execution = $routine->createExecution();
   
   // New: Test work order generation
   $workOrder = $routine->generateWorkOrder();
   ```

2. **Remove RoutineExecutionFactory**
   - Delete the factory file
   - Update any seeders that use it

### Phase 2: Update Analytics Service
1. **Refactor ExecutionAnalyticsService**
   ```php
   // Old
   $executions = RoutineExecution::query()
       ->where('routine_id', $routineId)
       ->get();
   
   // New
   $workOrders = WorkOrder::query()
       ->where('source_type', 'routine')
       ->where('source_id', $routineId)
       ->where('category', 'preventive')
       ->get();
   ```

2. **Update metric calculations**
   - Map work order statuses to completion states
   - Calculate MTBF/MTTR using work order timestamps

### Phase 3: Update Export Functionality
1. **Refactor ExecutionExportController**
   - Change route from `/executions/export` to `/work-orders/export`
   - Update query builders to use WorkOrder model
   - Modify CSV/Excel column mappings

2. **Update export job if exists**
   - Check for background job handling exports
   - Update to use work order data

### Phase 4: Update PDF Generation
1. **Refactor PDFGeneratorService**
   - Update data retrieval methods
   - Modify PDF templates to use work order fields
   - Ensure task responses are properly loaded through work order executions

### Phase 5: Clean Up Policies
1. **Handle RoutineExecutionPolicy**
   - Delete the file
   - Remove from AuthServiceProvider if registered
   - Update any middleware references

### Phase 6: Database Cleanup
1. **Create migration to drop routine_executions table**
   ```php
   Schema::dropIfExists('routine_executions');
   ```

2. **Update foreign key constraints**
   - Check for any remaining foreign keys referencing routine_executions
   - Update or remove as needed

## Testing Strategy

### Unit Tests
- Test work order generation from routines
- Verify analytics calculations with work order data
- Test export functionality with new data structure

### Integration Tests
- Test complete flow from routine to work order to execution
- Verify PDF generation works correctly
- Test permission checks for work order operations

### Manual Testing
- Generate work orders from active routines
- Export work order data
- Generate execution PDFs
- Review analytics dashboards

## Rollback Plan
If issues arise during implementation:
1. Keep database backup before dropping routine_executions table
2. Maintain version control checkpoints after each phase
3. Test thoroughly in staging before production deployment

## Success Criteria
- [ ] All tests pass without RoutineExecution references
- [ ] Analytics show correct data using work orders
- [ ] Exports function properly with work order data
- [ ] PDFs generate correctly from work order executions
- [ ] No runtime errors related to missing RoutineExecution class
- [ ] Database migration completes successfully

## Timeline Estimate
- Phase 1: 2-3 hours (Test updates)
- Phase 2: 3-4 hours (Analytics service)
- Phase 3: 2-3 hours (Export functionality)
- Phase 4: 2-3 hours (PDF generation)
- Phase 5: 1 hour (Policy cleanup)
- Phase 6: 1 hour (Database cleanup)
- Testing: 2-3 hours

**Total: 14-19 hours**

## Notes
- Consider creating a database backup before starting
- Run tests after each phase to ensure nothing breaks
- Document any API changes for frontend team
- Update API documentation if applicable 