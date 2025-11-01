# Manufacturing Order Integer Quantity Changes

## Summary
Changed manufacturing order quantities from decimal to integer values throughout the system.

## Changes Made

### 1. Database Migration
**File:** `database/migrations/2025_01_10_000009_create_manufacturing_orders_table.php`
- Changed `quantity`, `quantity_completed`, and `quantity_scrapped` from `decimal(10, 2)` to `integer`

### 2. Model Updates
**File:** `app/Models/Production/ManufacturingOrder.php`
- Changed casts from `'decimal:2'` to `'integer'` for quantity fields
- Updated child order quantity calculation to use `ceil()` to round up decimal calculations

### 3. Controller Validation
**File:** `app/Http/Controllers/Production/ManufacturingOrderController.php`
- Changed validation from `'required|numeric|min:0.01'` to `'required|integer|min:1'`

### 4. Frontend Components
**File:** `resources/js/components/production/CreateManufacturingOrderDialog.tsx`
- Changed from `parseFloat()` to `parseInt()`
- Updated `min` from `0.01` to `1`
- Updated `step` from `0.01` to `1`

**File:** `resources/js/pages/production/orders/create.tsx`
- Updated `min` from `0.01` to `1`
- Updated `step` from `0.01` to `1`

### 5. Debug Logging Cleanup
- Removed temporary debug logging from:
  - `app/Http/Controllers/Production/StepExecutionController.php`
  - `app/Models/Production/ManufacturingStep.php`

## Areas Not Changed
- BOM item quantities remain decimal (as they should for fractional components)
- TypeScript types already used `number` type (compatible with integers)
- Factories already used integer values
- Tests were not affected (BOM test uses decimals which is correct)

## Testing Recommendation
After running `php artisan migrate:fresh`, test:
1. Creating manufacturing orders with whole number quantities
2. Step execution transitions (the original error should be fixed)
3. Child order creation (quantities will be rounded up)
4. UI forms reject decimal inputs
