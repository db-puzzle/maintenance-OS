# AJAX to Inertia Migration Plan

This document lists all locations in the project where JSON/AJAX calls are being used instead of Inertia (the project default). These locations need to be migrated to use Inertia for consistency with the project's architecture.

## 🚨 Priority: High
All these changes should be made to ensure the project follows a consistent pattern and leverages Inertia's full capabilities.

---

## 📁 Backend Controllers - Mixed Response Handling

### 1. Asset Hierarchy Controllers

#### `app/Http/Controllers/AssetHierarchy/ShiftController.php`
**Issues:**
- **Lines 86, 158**: Returns JSON for AJAX requests in `index()` method
- **Lines 366, 463**: Returns JSON in `store()` and `show()` methods when `request()->wantsJson()`
- **Lines 629, 652, 665, 704, 834, 856, 956**: Multiple methods returning JSON responses

**Current Pattern:**
```php
if ($request->wantsJson() || $request->input('format') === 'json') {
    return response()->json($data);
}
return Inertia::render('view', $data);
```

**Should be:** Always return Inertia responses

#### `app/Http/Controllers/AssetHierarchy/AssetController.php`
**Issues:**
- **Lines 446, 616, 671, 702, 715, 735, 842, 937**: Multiple JSON API endpoints for runtime data, work order history, and calculations

**Methods to convert:**
- `getDependencyCheck()` - Line 446
- `getRuntimeData()` - Line 616  
- `reportRuntime()` - Line 671
- `getRuntimeHistory()` - Line 702
- `getRuntimeCalculationDetails()` - Line 715
- `getRuntimeBreakdown()` - Line 735
- `getWorkOrderHistory()` - Line 842

#### `app/Http/Controllers/AssetHierarchy/PlantsController.php`
**Issues:**
- **Lines 182, 202**: JSON responses in `getDependencyCheck()` and `show()` methods

#### `app/Http/Controllers/AssetHierarchy/AreaController.php`
**Issues:**
- **Lines 191, 369**: Mixed JSON/Inertia responses in `show()` and `getDependencyCheck()`

#### `app/Http/Controllers/AssetHierarchy/SectorController.php`
**Issues:**
- **Lines 226, 361**: JSON responses in `show()` and `getDependencyCheck()`

#### `app/Http/Controllers/AssetHierarchy/ManufacturerController.php`
**Issues:**
- **Lines 81, 173, 207, 217**: Mixed responses in `show()`, `getDependencyCheck()`, and utility methods

#### `app/Http/Controllers/AssetHierarchy/AssetTypeController.php`
**Issues:**
- **Lines 66, 169**: JSON responses in `show()` and `getDependencyCheck()`

### 2. Form Controllers

#### `app/Http/Controllers/Forms/TaskResponseController.php`
**Issues:**
- **Line 165**: `validateCompletion()` method returns JSON instead of Inertia response

#### `app/Http/Controllers/Forms/FormVersionController.php`
**Issues:**
- **Lines 23, 37, 42, 55, 64, 85, 93, 108, 128, 138, 143, 148, 153**: Entire controller is JSON-only, should support Inertia responses

### 3. Permission & User Management

#### `app/Http/Controllers/PermissionController.php`
**Issues:**
- **Lines 360, 385**: API endpoints `check()` and `checkBulk()` - consider if these need Inertia alternatives

#### `app/Http/Controllers/UserPermissionController.php`
**Issues:**
- **Lines 253, 264, 286**: JSON responses in permission management methods

#### `app/Http/Controllers/UserRoleController.php`
**Issues:**
- **Lines 98, 139**: JSON responses for available permissions and role preview

### 4. Maintenance Controllers

#### `app/Http/Controllers/Maintenance/RoutineController.php`
**Issues:**
- **Lines 294, 330, 338, 370, 377**: Multiple JSON endpoints for routine form management

#### `app/Http/Controllers/Maintenance/ExecutionExportController.php`
**Issues:**
- **Lines 46, 84, 98, 104, 188, 201, 206, 252, 261**: Export management methods returning JSON

### 5. Other Controllers

#### `app/Http/Controllers/AuditLogController.php`
**Issues:**
- **Lines 148, 159, 223, 239**: Audit log stats and details as JSON

#### `app/Http/Controllers/Settings/ProfileController.php`
**Issues:**
- **Line 55**: `updateTimezone()` returns JSON instead of Inertia redirect

---

## 📁 Frontend Components - Direct AJAX/HTTP Requests

### 1. Core Service Files

#### `resources/js/services/work-order.service.ts`
**Issues:**
- **Entire file**: Complete service using axios for CRUD operations
- **Should be:** Use Inertia forms and navigation instead

### 2. Asset Management Components

#### `resources/js/pages/asset-hierarchy/assets/show.tsx`
**Issues:**
- **Lines 200, 227**: Loading shifts data via axios
- **Lines 259, 294**: Updating asset shift via axios

#### `resources/js/pages/asset-hierarchy/assets/import.tsx`
**Issues:**
- **Lines 140, 204, 222, 262**: CSV import process using axios

#### `resources/js/components/AssetFormComponent.tsx`
**Issues:**
- **Uses Inertia properly** ✅ (Good example)

### 3. Routine Management Components

#### `resources/js/components/RoutineList.tsx`
**Issues:**
- **Line 183**: Loading routine form data via axios

#### `resources/js/components/AssetRoutinesTab.tsx`
**Issues:**
- **Lines 435, 594**: Loading routine data and creating work orders via axios

#### `resources/js/components/EditRoutineSheet.tsx`
**Issues:**
- **Uses Inertia properly** ✅ (Good example)

#### `resources/js/components/InlineRoutineFormEditor.tsx`
**Issues:**
- **Uses Inertia properly** ✅ (Good example)

#### `resources/js/components/InlineRoutineForm.tsx`
**Issues:**
- **Lines 63, 189, 275, 317**: Task saving and execution completion via axios

### 4. Shift Management Components

#### `resources/js/components/CreateShiftSheet.tsx`
**Issues:**
- **Lines 558, 580, 653**: Creating and updating shifts via axios

#### `resources/js/components/ShiftSelectionCard.tsx`
**Issues:**
- **Line 137**: Loading shift details via axios

### 5. Runtime and Execution Components

#### `resources/js/components/ReportRuntimeSheet.tsx`
**Issues:**
- **Line 70**: Reporting runtime via axios

#### `resources/js/components/ExecutionHistory.tsx`
**Issues:**
- **Lines 79, 199, 243**: Loading execution history and export functionality via axios/fetch

### 6. User Management Components

#### `resources/js/pages/users/permissions.tsx`
**Issues:**
- **Lines 120, 128, 129, 130, 160**: Loading permissions and entities via axios

#### `resources/js/components/permissions/RoleManagement.tsx`
**Issues:**
- **Line 59**: Loading role permissions via fetch

### 7. Utility Components

#### `resources/js/components/TimezoneDetector.tsx`
**Issues:**
- **Line 61**: Updating timezone via axios

#### `resources/js/hooks/useEntityOperations.ts`
**Issues:**
- **Line 54**: Loading entity data for editing via axios

---

## 🔧 Specific Migration Tasks

### Backend Changes Required:

1. **Remove JSON conditionals** from all controllers listed above
2. **Convert JSON endpoints** to Inertia responses with appropriate view rendering
3. **Standardize response format** - all responses should return Inertia::render()
4. **Update API routes** that are used for UI interactions to return Inertia responses
5. **Keep JSON responses only** for true API endpoints (external integrations)

### Frontend Changes Required:

1. **Replace axios/fetch calls** with Inertia router methods (`router.get`, `router.post`, etc.)
2. **Use Inertia forms** (`useForm` hook) instead of manual form handling with axios
3. **Replace manual state management** with Inertia's built-in state management
4. **Update component props** to receive data from Inertia page props instead of API calls
5. **Remove service layer** for UI operations (keep only for external API integrations)

### Key Files Needing Complete Overhaul:

1. `resources/js/services/work-order.service.ts` - **High Priority**
2. All asset hierarchy controllers with mixed responses - **High Priority**
3. Form management controllers and components - **Medium Priority**
4. Export and utility endpoints - **Low Priority** (can remain JSON for downloads)

---

## ✅ Examples of Correct Inertia Usage

The following components demonstrate proper Inertia usage and can serve as templates:

- `resources/js/components/AssetFormComponent.tsx`
- `resources/js/components/EditRoutineSheet.tsx`
- `resources/js/components/InlineRoutineFormEditor.tsx`
- `resources/js/components/BaseEntitySheet.tsx`

---

## 🎯 Migration Strategy

1. **Phase 1**: Fix backend controllers to remove JSON conditionals
2. **Phase 2**: Update frontend components to use Inertia router
3. **Phase 3**: Replace service layer with Inertia forms
4. **Phase 4**: Test and validate all functionality works with Inertia

**Estimated Impact**: High - This affects core application functionality and user experience.

**Benefits**: 
- Consistent architecture
- Better SEO and initial page loads
- Simplified state management
- Reduced complexity in handling different response types 