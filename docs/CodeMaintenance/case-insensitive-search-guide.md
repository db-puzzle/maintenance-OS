# Case-Insensitive Search Implementation Guide

## Overview

This guide explains how to implement case-insensitive search functionality across all controllers in the Laravel application. We've created a centralized solution that makes all searches case-insensitive without modifying frontend code.

## Architecture

### 1. **HasCaseInsensitiveSearch Trait** (`app/Traits/HasCaseInsensitiveSearch.php`)
- Provides methods for case-insensitive search queries
- Works with direct columns and relationships
- Uses `LOWER()` SQL function for database-agnostic case-insensitive comparison

### 2. **BaseSearchController** (`app/Http/Controllers/BaseSearchController.php`)
- Extends the base Laravel Controller
- Uses the HasCaseInsensitiveSearch trait
- Provides a convenient `applySearchFilter()` method

## Implementation Steps

### Step 1: Update Controller Inheritance

Change your controller from extending `Controller` to extending `BaseSearchController`:

```php
// Before
use App\Http\Controllers\Controller;
class YourController extends Controller

// After
use App\Http\Controllers\BaseSearchController;
class YourController extends BaseSearchController
```

### Step 2: Replace Search Logic

#### Simple Column Search

```php
// Before
->when($request->input('search'), function ($query, $search) {
    $query->where(function ($q) use ($search) {
        $q->where('name', 'like', "%{$search}%")
            ->orWhere('email', 'like', "%{$search}%");
    });
})

// After
->when($request->input('search'), function ($query, $search) {
    return $this->applySearchFilter($query, $search, ['name', 'email']);
})
```

#### Search with Relationships

```php
// Before
->when($search, function ($query) use ($search) {
    $query->where(function ($q) use ($search) {
        $q->where('work_order_number', 'like', "%{$search}%")
            ->orWhere('title', 'like', "%{$search}%")
            ->orWhereHas('asset', function ($q) use ($search) {
                $q->where('tag', 'like', "%{$search}%");
            });
    });
})

// After
->when($search, function ($query) use ($search) {
    $searchConfig = [
        'work_order_number',
        'title',
        [
            'relation' => 'asset',
            'columns' => ['tag']
        ]
    ];
    return $this->applySearchFilter($query, $search, $searchConfig);
})
```

## Examples

### Example 1: UserController
```php
// Search in name and email columns
$users = User::query()
    ->when($request->input('search'), function ($query, $search) {
        return $this->applySearchFilter($query, $search, ['name', 'email']);
    })
    ->paginate();
```

### Example 2: AssetController with Multiple Relations
```php
$searchConfig = [
    'tag',
    'description',
    'serial_number',
    [
        'relation' => 'plant',
        'columns' => ['name']
    ],
    [
        'relation' => 'area',
        'columns' => ['name']
    ],
    [
        'relation' => 'sector',
        'columns' => ['name']
    ]
];

$assets = Asset::query()
    ->when($search, function ($query) use ($search, $searchConfig) {
        return $this->applySearchFilter($query, $search, $searchConfig);
    })
    ->paginate();
```

## Controllers to Update

Here's a list of controllers that need to be updated to use case-insensitive search:

### Already Updated ✅
1. `WorkOrderController` - Work orders search
2. `ItemController` - Items, BOMs, and Manufacturing Orders search

### Pending Updates 🔄
1. `AssetController` - Assets search (currently uses whereRaw with LOWER)
2. `UserController` - Users search
3. `PartsController` - Parts search (currently uses whereRaw with LOWER)
4. `BillOfMaterialController` - BOMs search
5. `ManufacturingOrderController` - Manufacturing orders search
6. `ProductionScheduleController` - Production schedule search
7. `ProductionRoutingController` - Routing templates search
8. `QrTrackingController` - QR tracking search
9. `ProductionExecutionController` - Production execution search
10. `RoleController` - Roles search
11. `UserInvitationController` - Invitations search
12. `ShiftController` - Shifts search
13. `WorkCellController` - Work cells search
14. `ShipmentController` - Shipments search
15. `SkillController` - Skills search
16. `CertificationController` - Certifications search
17. `PlantController` - Plants search
18. `AreaController` - Areas search
19. `SectorController` - Sectors search

## Benefits

1. **Consistency**: All searches behave the same way across the application
2. **User Experience**: Users don't need to worry about case sensitivity [[memory:5746841]]
3. **Maintainability**: Centralized search logic is easier to maintain and update
4. **Database Agnostic**: Works with MySQL, PostgreSQL, and SQLite
5. **No Frontend Changes**: The implementation is purely backend, no need to update React components

## Testing

After implementing case-insensitive search in a controller:

1. Test searching with different case variations:
   - All lowercase: "john doe"
   - All uppercase: "JOHN DOE"
   - Mixed case: "John Doe"
   
2. Test searching with special characters and accents if applicable

3. Test relationship searches work correctly

4. Verify pagination still works with search filters

## Notes

- The trait handles both simple column searches and complex relationship searches
- The `LOWER()` function is used for case-insensitive comparison
- Search terms are automatically converted to lowercase before comparison
- Empty search terms are handled gracefully (no filtering applied)
