# Inertia Controller Standardization Plan

## Executive Summary

This document outlines a comprehensive plan to standardize the use of Inertia.js across all controllers in the Laravel maintenance OS project. After analyzing all controllers, I've identified inconsistencies and areas for improvement that will enhance code maintainability, consistency, and developer experience.

## Current State Analysis

### Identified Patterns

1. **Inconsistent Component Path Conventions**
   - Some use lowercase with hyphens: `asset-hierarchy/assets`
   - Some use lowercase with slashes: `maintenance/dashboard-maintenance`
   - Some use PascalCase: `Forms/Index`
   - Some use lowercase without structure: `auth/login`

2. **Mixed Response Types**
   - Some controllers return only Inertia responses
   - Others mix Inertia, JSON, and redirect responses
   - Inconsistent handling of AJAX requests

3. **Data Formatting Inconsistencies**
   - Some controllers format data inline
   - Others use dedicated formatting methods
   - Inconsistent pagination handling

4. **Validation Response Handling**
   - Some use `ValidationException`
   - Others use standard Laravel validation
   - Inconsistent error message formatting

## Standardization Guidelines

### 1. Component Path Convention

**Standard**: Use PascalCase with module-based folder structure

```php
// ✅ Correct
Inertia::render('AssetHierarchy/Assets/Index', [...]);
Inertia::render('Maintenance/Routines/Edit', [...]);
Inertia::render('Forms/Create', [...]);

// ❌ Avoid
Inertia::render('asset-hierarchy/assets', [...]);
Inertia::render('maintenance/dashboard-maintenance', [...]);
```

**Rationale**: PascalCase aligns with Vue component naming conventions and provides clear module separation.

### 2. Response Type Handling

**Standard**: Implement consistent request type detection

```php
protected function wantsJson(Request $request): bool
{
    return $request->wantsJson() || 
           $request->ajax() || 
           $request->header('X-Requested-With') === 'XMLHttpRequest' ||
           $request->input('format') === 'json';
}
```

**Implementation Pattern**:
```php
public function store(Request $request)
{
    // ... validation and logic ...
    
    if ($this->wantsJson($request)) {
        return response()->json([
            'success' => true,
            'data' => $resource,
            'message' => 'Resource created successfully'
        ]);
    }
    
    return redirect()->route('resource.show', $resource)
        ->with('success', 'Resource created successfully');
}
```

### 3. Data Formatting Standards

**Standard**: Use dedicated resource classes or formatting methods

```php
// Create app/Http/Resources/Inertia folder for Inertia-specific resources
class AssetInertiaResource
{
    public static function format($asset)
    {
        return [
            'id' => $asset->id,
            'tag' => $asset->tag,
            // ... consistent formatting
        ];
    }
    
    public static function collection($assets)
    {
        return $assets->map(fn($asset) => self::format($asset));
    }
}
```

### 4. Pagination Handling

**Standard**: Create a consistent pagination wrapper

```php
protected function paginateForInertia($query, Request $request, $perPage = 10)
{
    $paginated = $query->paginate($perPage)->withQueryString();
    
    return [
        'data' => $paginated->items(),
        'meta' => [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ],
        'links' => [
            'first' => $paginated->url(1),
            'last' => $paginated->url($paginated->lastPage()),
            'prev' => $paginated->previousPageUrl(),
            'next' => $paginated->nextPageUrl(),
        ],
    ];
}
```

### 5. Error Handling

**Standard**: Consistent validation and error responses

```php
protected function handleValidationException(ValidationException $e, Request $request)
{
    if ($this->wantsJson($request)) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $e->errors()
        ], 422);
    }
    
    throw $e; // Let Inertia handle it
}
```

## Implementation Plan

### Phase 1: Base Infrastructure (Week 1)

1. **Create Base Controller Traits**
   ```
   app/Http/Controllers/Traits/
   ├── HandlesInertiaResponses.php
   ├── FormatsInertiaData.php
   └── HandlesPagination.php
   ```

2. **Create Inertia Resource Classes**
   ```
   app/Http/Resources/Inertia/
   ├── AssetResource.php
   ├── RoutineResource.php
   ├── FormResource.php
   └── ...
   ```

3. **Update Base Controller**
   - Add common Inertia methods
   - Implement response type detection

### Phase 2: Module-by-Module Migration (Weeks 2-4)

#### Week 2: Core Modules
- **Auth Controllers** (8 controllers)
  - Standardize component paths
  - Implement consistent response handling
  
- **Settings Controllers** (2 controllers)
  - Update component paths
  - Add JSON response support where needed

#### Week 3: Asset Hierarchy Module
- **AssetHierarchy Controllers** (9 controllers)
  - Implement resource classes
  - Standardize pagination
  - Unify response formats
  - Special attention to AssetController and ShiftController (most complex)

#### Week 4: Feature Modules
- **Maintenance Controllers** (3 controllers)
  - Standardize component paths
  - Implement consistent data formatting
  
- **Forms Controllers** (6 controllers)
  - Update response handling
  - Implement resource classes
  
- **Other Controllers** (BOM, Scheduler)
  - Apply standards

### Phase 3: Testing and Documentation (Week 5)

1. **Create/Update Tests**
   - Test both Inertia and JSON responses
   - Validate data formatting
   - Test error handling

2. **Documentation**
   - Update controller documentation
   - Create Inertia usage guide
   - Document resource classes

## Specific Controller Changes

### High Priority Controllers (Most Complex)

1. **AssetController**
   - Split into smaller controllers if needed
   - Implement AssetResource class
   - Standardize runtime data responses
   - Unify photo handling responses

2. **ShiftController**
   - Create ShiftResource class
   - Standardize schedule formatting
   - Consistent timezone handling

3. **RoutineController**
   - Split asset-specific methods to separate controller
   - Implement RoutineResource class
   - Standardize form editor responses

### Component Path Migrations

```bash
# Current → New
asset-hierarchy/assets → AssetHierarchy/Assets/Index
asset-hierarchy/assets/show → AssetHierarchy/Assets/Show
maintenance/dashboard-maintenance → Maintenance/Dashboard
auth/login → Auth/Login
settings/profile → Settings/Profile
Forms/Index → Forms/Index (already correct)
```

## Best Practices Checklist

### For Each Controller:

- [ ] Use PascalCase component paths with module structure
- [ ] Implement `wantsJson()` check for mixed responses
- [ ] Use resource classes for data formatting
- [ ] Consistent pagination with meta and links
- [ ] Proper error handling for both Inertia and JSON
- [ ] Clear method documentation
- [ ] Type hints for all parameters and returns
- [ ] Use form requests for complex validation
- [ ] Consistent status messages

### Code Style:

```php
// ✅ Good
public function index(Request $request): Response|JsonResponse
{
    $assets = Asset::query()
        ->with(['assetType', 'manufacturer'])
        ->paginate();
    
    if ($this->wantsJson($request)) {
        return response()->json([
            'assets' => AssetResource::collection($assets)
        ]);
    }
    
    return Inertia::render('AssetHierarchy/Assets/Index', [
        'assets' => AssetResource::collection($assets),
        'filters' => $request->only(['search', 'sort'])
    ]);
}

// ❌ Avoid
public function index(Request $request)
{
    $assets = Asset::all();
    return Inertia::render('asset-hierarchy/assets', compact('assets'));
}
```

## Migration Priority

1. **Critical** (Week 1-2)
   - Base infrastructure
   - Auth controllers (affects all users)
   - AssetController (most used)

2. **High** (Week 3)
   - RoutineController
   - ShiftController
   - FormController

3. **Medium** (Week 4)
   - Remaining CRUD controllers
   - Settings controllers

4. **Low** (Week 5)
   - Simple controllers
   - Testing and documentation

## Success Metrics

- **Consistency**: 100% of controllers following naming conventions
- **Reusability**: 80% reduction in duplicated formatting code
- **Maintainability**: Clear separation of concerns
- **Developer Experience**: Faster feature development
- **Type Safety**: Full type hints coverage

## Conclusion

This standardization will result in:
- More maintainable codebase
- Consistent API responses
- Better developer experience
- Easier onboarding for new developers
- Improved testability

The phased approach ensures minimal disruption while progressively improving the codebase.