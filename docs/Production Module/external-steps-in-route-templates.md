# External Steps Support in Route Templates

## Overview
This document describes the implementation of external step support (manufacturer and expected lead time) in the route template save and apply functionality.

## Date: November 20, 2025

## Changes Made

### 1. Backend - Route Template Service
**File:** `app/Services/Production/RouteTemplateService.php`

**Changes:**
- Updated the `saveAsTemplate()` method to include external step fields when copying steps from a route to a template
- Added fields:
  - `execution_location` (defaults to 'internal')
  - `manufacturer_id`
  - `expected_lead_time_days`

**Code Location:** Lines 49-76

**Impact:** When a route is saved as a template, all external step configuration (manufacturer and expected lead time) is now preserved.

---

### 2. Backend - Manufacturing Route Model
**File:** `app/Models/Production/ManufacturingRoute.php`

**Changes:**
- Updated the `createFromTemplate()` method to include external step fields when applying a template to a route
- Added the same three fields: `execution_location`, `manufacturer_id`, and `expected_lead_time_days`

**Code Location:** Lines 122-149

**Impact:** When a template is applied to a manufacturing order, the external step configuration is now copied to the new route.

---

### 3. Backend - Planning Controller
**File:** `app/Http/Controllers/Production/PlanningController.php`

**Changes:**
- Updated the `applyTemplate()` method to include external step fields when copying steps from template
- Added external step fields to the step creation array

**Code Location:** Lines 360-378

**Impact:** When applying a template through the planning controller, external step data is preserved.

---

### 4. Backend - Manufacturing Route Scope
**File:** `app/Models/Production/ManufacturingRoute.php`

**Changes:**
- Updated the `scopeForPlanningTemplates()` method to:
  - Include external step fields in the select statement (`execution_location`, `manufacturer_id`, `expected_lead_time_days`)
  - Eager load the `manufacturer` relationship for steps

**Code Location:** Lines 305-329

**Impact:** When loading templates for the planning page, the manufacturer information is now included, preventing N+1 queries and ensuring the frontend has access to manufacturer data.

---

### 5. Frontend - Type Verification
**Files:** 
- `resources/js/stores/useRouteChangesStore.ts`
- `resources/js/components/production/planning/RouteBuilder.tsx`
- `resources/js/pages/production/planning/index.tsx`

**Changes:**
- Verified that the `RouteStep` interface already includes external step fields
- Verified that RouteBuilder already converts ManufacturingStep to RouteStep including external fields
- Verified that the planning index page already includes external fields in originalSteps conversion

**Impact:** No frontend changes were needed - the external step fields were already being tracked and handled correctly in the UI.

---

## External Step Fields

### execution_location
- **Type:** `enum('internal', 'external')`
- **Default:** `'internal'`
- **Description:** Indicates where the step is executed (internally or at an external manufacturer)

### manufacturer_id
- **Type:** `foreignId` (nullable)
- **References:** `manufacturers.id`
- **Description:** The ID of the third-party manufacturer responsible for external steps

### expected_lead_time_days
- **Type:** `integer` (nullable)
- **Description:** Expected turnaround time at the manufacturer in days

---

## Data Flow

### Saving a Template
1. User selects "Save as Template" on a route with external steps
2. Frontend calls `production.routes.save-as-template` endpoint
3. Backend `RouteTemplateController::saveAsTemplate()` validates request
4. `RouteTemplateService::saveAsTemplate()` creates template
5. **NEW:** External step fields are now copied from each step to the template step
6. Template is saved with complete external step configuration

### Applying a Template
1. User selects "Apply Template" on a manufacturing order
2. Frontend calls template application endpoint
3. Backend retrieves template with steps (including manufacturer relationship)
4. `ManufacturingRoute::createFromTemplate()` creates new steps
5. **NEW:** External step fields are now copied from template steps to route steps
6. Route steps are created with complete external step configuration

---

## Testing Recommendations

### Manual Testing Steps
1. **Create a Route with External Steps:**
   - Create or edit a manufacturing order route
   - Add steps with external execution
   - Assign manufacturers and expected lead times

2. **Save as Template:**
   - Click "Save as Template"
   - Provide template name and category
   - Verify template is saved

3. **Apply Template:**
   - Create a new manufacturing order
   - Apply the saved template
   - Verify that external step configuration is preserved:
     - Execution location should be 'external'
     - Manufacturer should be assigned
     - Expected lead time should match

4. **Verify in Database:**
   ```sql
   -- Check template steps
   SELECT id, name, execution_location, manufacturer_id, expected_lead_time_days
   FROM manufacturing_steps
   WHERE manufacturing_route_id IN (
       SELECT id FROM manufacturing_routes WHERE is_template = true
   );

   -- Check applied route steps
   SELECT id, name, execution_location, manufacturer_id, expected_lead_time_days
   FROM manufacturing_steps
   WHERE manufacturing_route_id = :route_id;
   ```

### Automated Testing Suggestions
While no specific tests exist for route templates, consider creating:

1. **RouteTemplateServiceTest:**
   - Test saving a route with external steps as template
   - Verify external fields are preserved
   - Test applying template with external steps
   - Verify external fields are copied correctly

2. **Integration Test:**
   - End-to-end test of saving and applying templates with external steps
   - Verify manufacturer relationship is loaded
   - Verify data integrity throughout the process

---

## Related Files

### Backend
- `app/Services/Production/RouteTemplateService.php`
- `app/Models/Production/ManufacturingRoute.php`
- `app/Models/Production/ManufacturingStep.php`
- `app/Http/Controllers/Production/PlanningController.php`
- `app/Http/Controllers/Production/RouteTemplateController.php`

### Frontend
- `resources/js/pages/production/planning/index.tsx`
- `resources/js/components/production/planning/RouteBuilder.tsx`
- `resources/js/components/production/templates/SaveAsTemplateDialog.tsx`
- `resources/js/stores/useRouteChangesStore.ts`
- `resources/js/types/production.ts`

### Migrations
- `database/migrations/tenant/2025_01_10_000011_create_manufacturing_steps_table.php`

---

## Code Quality

### PHP Standards
- All PHP files formatted with Laravel Pint
- No linting errors introduced
- Follows Laravel coding standards

### TypeScript Standards
- No TypeScript type errors introduced
- Existing type definitions already supported external step fields
- No ESLint errors related to our changes

---

## Backwards Compatibility

### Database
- **Fully backwards compatible**
- External step fields are nullable
- Existing templates without external steps continue to work
- Default value for `execution_location` is 'internal'

### API
- **Fully backwards compatible**
- No breaking changes to existing endpoints
- Additional fields are optional in requests
- Responses include new fields but clients can ignore them

### Frontend
- **Fully backwards compatible**
- UI already supported external steps
- No changes needed to existing components
- Template functionality enhanced without breaking existing behavior

---

## Future Improvements

1. **Add Validation:**
   - Ensure manufacturer_id is required when execution_location is 'external'
   - Validate expected_lead_time_days is positive when provided

2. **Enhanced UI:**
   - Show manufacturer name in template preview
   - Display external step indicators in template list
   - Filter templates by execution location
   - ✅ **IMPLEMENTED:** External steps are automatically marked with "(ext)" in template names (see [external-steps-template-naming-convention.md](./external-steps-template-naming-convention.md))

3. **Testing:**
   - Create comprehensive test suite for route templates
   - Add feature tests for external step preservation
   - Add unit tests for RouteTemplateService

4. **Documentation:**
   - Update user documentation with external step template workflow
   - Add screenshots showing external step configuration in templates
   - Document best practices for managing external step templates

---

## Summary

The implementation successfully augments the route template functionality to fully support external steps. All three external step fields (`execution_location`, `manufacturer_id`, and `expected_lead_time_days`) are now:

1. ✅ Saved when creating a template from a route
2. ✅ Applied when using a template to create a route
3. ✅ Loaded with manufacturer relationship to prevent N+1 queries
4. ✅ Tracked in frontend state for change detection
5. ✅ Fully backwards compatible with existing code

The changes were minimal because the frontend infrastructure already supported external steps. Only backend template save/apply logic needed updates to persist and restore this data.

