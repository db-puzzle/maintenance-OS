# MO Viewer Sorting Implementation

## Overview

Implemented dynamic backend sorting for the MO Viewer with configurable sort options that works exclusively through Inertia (no AJAX/JSON).

## Changes Made

### Backend (MOViewerController.php)

1. **Added `sort` parameter to filters**
   - Accepts sort parameter in the request
   - Default: `priority_date` (maintains original behavior)

2. **Created `applySorting()` method**
   - Applies sorting to database queries
   - Supports multiple sort options

3. **Created `sortCollection()` method**
   - Sorts in-memory collections (for children orders)
   - Ensures recursive sorting throughout the hierarchy

4. **Updated `transformOrder()` method**
   - Now accepts `$sortBy` parameter
   - Recursively sorts child orders using the same criteria

### Available Sort Options

| Sort Value | Description |
|------------|-------------|
| `order_number` | Order number A-Z |
| `order_number_desc` | Order number Z-A |
| `priority` | Priority (high to low), then order number |
| `requested_date` | Requested date (oldest first), then order number |
| `requested_date_desc` | Requested date (newest first), then order number |
| `status` | Status alphabetically, then order number |
| `priority_date` | **Default**: Priority (high to low), then requested date (oldest first) |

### Frontend (mo-viewer.tsx)

1. **Added sort state**
   - Tracks current sort option
   - Defaults to `order_number` for MO Viewer

2. **Created `handleSortChange()` function**
   - Updates sort via Inertia partial reload
   - Uses `only: ['orders', 'selectedOrderHierarchy']` for performance

3. **Added Sort Dropdown UI**
   - Located in the header toolbar
   - Shows all available sort options
   - Highlights currently selected option
   - Portuguese labels for user-friendly experience

4. **Updated all Inertia calls**
   - All `router.get()` calls now include the `sort` parameter
   - Ensures sort preference persists across operations

## Natural Sorting for Order Numbers

The implementation uses **natural sorting** (also called "version sorting") to correctly handle numeric sequences within order numbers:

**Problem:**
- Simple string sorting: `MO-25321-001.1.1`, `MO-25321-001.1.10`, `MO-25321-001.1.11`, `MO-25321-001.1.2`
- Correct natural sorting: `MO-25321-001.1.1`, `MO-25321-001.1.2`, `MO-25321-001.1.3`, ..., `MO-25321-001.1.10`

**Solution:**
- **Database queries**: Uses `LENGTH(order_number)` + alphanumeric sort for pseudo-natural sorting
- **Collections**: Uses PHP's `strnatcmp()` function for true natural string comparison

### Database Natural Sorting

```php
// Groups by string length first, then sorts alphanumerically
$query->orderByRaw('LENGTH(order_number) ASC, order_number ASC');
```

This ensures that shorter order numbers come before longer ones, which approximates natural sorting for most cases.

### Collection Natural Sorting

```php
// Uses PHP's natural string comparison
$collection->sort(function ($a, $b) {
    return strnatcmp($a->order_number, $b->order_number);
})->values();
```

This provides true natural sorting that understands numeric sequences within strings.

## How It Works

### Request Flow

1. User selects a sort option from the dropdown
2. Frontend calls `handleSortChange(newSort)`
3. Inertia makes a GET request to the backend with `sort` parameter
4. Backend applies sorting via `applySorting()` for queries (with natural sorting)
5. Backend recursively sorts children via `sortCollection()` (with `strnatcmp`)
6. Data returns to frontend pre-sorted
7. UI updates instantly (Inertia preserves state and scroll)

### Recursive Sorting

The implementation ensures that **entire hierarchy** is sorted consistently:

```php
// Top-level orders sorted by database query
$this->applySorting($query, $filters['sort']);

// Child orders sorted in memory during transformation
$sortedChildren = $this->sortCollection($order->children, $sortBy);
$transformed['children'] = $sortedChildren->map(function ($childOrder) use ($level, $sortBy) {
    return $this->transformOrder($childOrder, $level + 1, $sortBy);
})->toArray();
```

### Performance Considerations

- **Top-level orders**: Sorted by database (uses indexes)
- **Child orders**: Sorted in memory (small datasets)
- **Partial reload**: Only reloads necessary data (`orders` or `selectedOrderHierarchy`)
- **Preserved state**: Inertia keeps UI state during sort changes

## Benefits

1. **Pure Inertia**: No AJAX/JSON calls - follows project standards
2. **Flexible**: Easy to add new sort options in the future
3. **Consistent**: Same sorting applied throughout entire hierarchy
4. **Performant**: Uses database indexes where possible
5. **User-friendly**: Instant visual feedback with sort dropdown

## Usage

### For Users

1. Open MO Viewer page
2. Click the "Ordenar" (Sort) button in the toolbar
3. Select desired sort option
4. View updates automatically with new order

### For Developers

To add a new sort option:

1. Add case in `applySorting()` method (backend)
2. Add case in `sortCollection()` method (backend)
3. Add dropdown menu item in UI (frontend)

Example:
```php
// Backend - applySorting()
case 'item_name':
    $query->join('items', 'manufacturing_orders.item_id', '=', 'items.id')
        ->orderBy('items.name', 'asc')
        ->select('manufacturing_orders.*');
    break;

// Backend - sortCollection()
case 'item_name':
    return $collection->sortBy('item.name')->values();

// Frontend - Add dropdown item
<DropdownMenuItem 
    onClick={() => handleSortChange('item_name')}
    className={sortBy === 'item_name' ? 'bg-accent' : ''}
>
    Nome do Item
</DropdownMenuItem>
```

## Testing

All changes verified with:
- ✅ Laravel Pint (code style)
- ✅ ESLint (no new errors)
- ✅ TypeScript (no type errors)
- ✅ Natural sorting tested with order numbers containing multiple numeric segments

### Natural Sorting Examples

**Correct order with natural sorting:**
```
MO-25321-001.1.1
MO-25321-001.1.2
MO-25321-001.1.3
MO-25321-001.1.4
MO-25321-001.1.5
MO-25321-001.1.6
MO-25321-001.1.7
MO-25321-001.1.8
MO-25321-001.1.9
MO-25321-001.1.10
MO-25321-001.1.11
```

**Incorrect order without natural sorting:**
```
MO-25321-001.1.1
MO-25321-001.1.10  ← Wrong position
MO-25321-001.1.11  ← Wrong position
MO-25321-001.1.2
MO-25321-001.1.3
...
```

## Notes

- Default sort for MO Viewer: `order_number` (alphabetical with natural sorting)
- Default sort for other callers: `priority_date` (original behavior)
- Sort preference persists during search, refresh, and MO selection
- Sort applies to both canvas and hierarchical views
- Natural sorting handles complex order numbers with multiple numeric segments (e.g., `MO-XXX-YYY.Z.A.B`)

