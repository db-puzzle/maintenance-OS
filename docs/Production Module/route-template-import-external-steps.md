# Route Template Import - External Step Support

## Overview

Updated the route template import/export functionality to support the new EXTERNAL step type with manufacturers and lead time information.

## Date

November 20, 2025

## Changes Made

### 1. Updated Import Types (`resources/js/pages/production/routing/import/types.ts`)

Added support for external step fields in the CSV field definitions:

- **execution_location**: The location where the step is executed (internal/external)
- **manufacturer_name**: Name of the third-party manufacturer for external steps
- **expected_lead_time_days**: Expected turnaround time at manufacturer in days

Added new constant for validation:
```typescript
export const EXECUTION_LOCATIONS = ['internal', 'external'];
```

Updated the `findBestMatch` function to automatically map common CSV header variations to these new fields.

### 2. Updated Import Service (`app/Services/Production/RouteTemplateImportService.php`)

**New Import:**
- Added `use App\Models\AssetHierarchy\Manufacturer;` to support manufacturer lookups

**New Method:**
```php
protected function findOrCreateManufacturer(string $name): Manufacturer
```
- Automatically creates manufacturers if they don't exist during import
- Similar to the existing `findOrCreateWorkCell` method
- Sets imported manufacturers as active with a note to configure details

**Updated `processTemplate` Method:**
- Added logic to handle manufacturer lookup/creation for external steps
- Only processes manufacturer if `execution_location` is set to 'external'
- Adds manufacturer_id, execution_location, and expected_lead_time_days to step creation
- Defaults execution_location to 'internal' if not specified

**Updated CSV Mapping:**
- Added 'expected_lead_time_days' to the list of numeric fields for proper type casting

### 3. Updated Export Methods (`app/Http/Controllers/Production/ProductionRoutingController.php`)

**JSON Export (`exportJson` method):**
Added external step fields to the exported JSON:
- execution_location
- manufacturer_name (resolved from relationship)
- expected_lead_time_days

**CSV Export (`exportCsv` method):**
Added three new columns to the CSV export:
- "Execution Location"
- "Manufacturer"
- "Expected Lead Time (Days)"

Updated both the empty row export and the step row export to include these fields.

## Import/Export Format

### CSV Format

The CSV format now includes these additional columns:

```
..., Execution Location, Manufacturer, Expected Lead Time (Days)
..., internal, , 
..., external, ABC Manufacturing, 5
```

### JSON Format

The JSON export format now includes:

```json
{
  "templates": [
    {
      "steps": [
        {
          "execution_location": "external",
          "manufacturer_name": "ABC Manufacturing",
          "expected_lead_time_days": 5
        }
      ]
    }
  ]
}
```

## Usage

### Importing External Steps

When importing route templates with external steps:

1. Set the "Execution Location" column to "external"
2. Provide the "Manufacturer" name
3. Optionally provide "Expected Lead Time (Days)"

If a manufacturer doesn't exist, it will be automatically created during import and marked for configuration.

### Exporting External Steps

When exporting route templates:

1. External steps will have their execution_location exported
2. Manufacturer names will be resolved and included
3. Lead times will be exported as-is

## Validation

The import service validates:
- execution_location must be 'internal' or 'external'
- expected_lead_time_days must be numeric
- manufacturer_name is optional but recommended for external steps

## Backward Compatibility

- Existing imports without external step fields will continue to work
- All new fields default to safe values (execution_location defaults to 'internal')
- Existing CSV/JSON files without these columns will import successfully

## Testing Recommendations

1. Export an existing template to CSV/JSON
2. Add external steps with manufacturer information
3. Import the modified file
4. Verify that manufacturers are created or referenced correctly
5. Verify that external steps are properly marked and configured

## Related Files

- `resources/js/pages/production/routing/import/types.ts`
- `app/Services/Production/RouteTemplateImportService.php`
- `app/Http/Controllers/Production/ProductionRoutingController.php`
- `database/migrations/tenant/2025_01_10_000011_create_manufacturing_steps_table.php`

## Notes

- Imported manufacturers are created with `is_active` set to `true`
- A note is added to the manufacturer description indicating it needs configuration
- The import service returns a list of created work cells and manufacturers
- External step validation is handled by the ManufacturingStep model's `boot` method

