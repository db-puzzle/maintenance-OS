# Units of Measure (UOM) System Implementation Specification

## Executive Summary

This document outlines the implementation of a standardized Units of Measure (UOM) system to replace the current free-text approach used in the items, bom_items, and manufacturing_orders tables. The new system will provide standardized unit codes, type validation, conversion support, and ensure data integrity across the production system.

## Current State Analysis

### Existing UOM Usage
Currently, UOM is stored as VARCHAR(20) fields in:
- **items.unit_of_measure** - Default: 'EA'
- **bom_items.unit_of_measure** - Default: 'EA'
- **manufacturing_orders.unit_of_measure** - Default: 'EA'
- **shipment_items.unit_of_measure** - Default: 'EA'

### Current Problems
1. **No Standardization**: 'kg', 'KG', 'Kg', 'kilograms' are all valid but mean the same thing
2. **No Validation**: Any 20-character string can be entered
3. **No Conversion Support**: Cannot convert between related units (kg ↔ lbs)
4. **No Type Safety**: Cannot prevent incompatible unit combinations
5. **Data Quality Issues**: Typos and inconsistencies in unit names

## Proposed UOM System Architecture

### 1. Master Tables

#### units_of_measure
```sql
CREATE TABLE units_of_measure (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10),
    uom_type VARCHAR(20) NOT NULL CHECK (uom_type IN ('COUNT', 'MASS', 'LENGTH', 'AREA', 'VOLUME', 'TIME')),
    is_base_unit BOOLEAN DEFAULT FALSE,
    base_unit_id BIGINT REFERENCES units_of_measure(id),
    conversion_to_base DECIMAL(20,10) DEFAULT 1.0,
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_uom_type (uom_type),
    INDEX idx_uom_active (is_active),
    CHECK (
        (is_base_unit = TRUE AND base_unit_id IS NULL AND conversion_to_base = 1.0) OR
        (is_base_unit = FALSE AND base_unit_id IS NOT NULL AND conversion_to_base > 0)
    )
);
```

#### uom_conversions (for complex/item-specific conversions)
```sql
CREATE TABLE uom_conversions (
    id BIGSERIAL PRIMARY KEY,
    from_uom_id BIGINT NOT NULL REFERENCES units_of_measure(id),
    to_uom_id BIGINT NOT NULL REFERENCES units_of_measure(id),
    conversion_factor DECIMAL(20,10) NOT NULL CHECK (conversion_factor > 0),
    item_id BIGINT REFERENCES items(id), -- NULL for global conversions
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(from_uom_id, to_uom_id, item_id),
    INDEX idx_conversion_lookup (from_uom_id, to_uom_id),
    INDEX idx_item_conversions (item_id)
);
```

### 2. Initial Data Load

```sql
-- Base units for each type
INSERT INTO units_of_measure (code, name, symbol, uom_type, is_base_unit) VALUES
-- COUNT
('EA', 'Each', 'ea', 'COUNT', true),
('PC', 'Piece', 'pc', 'COUNT', false),
('DOZ', 'Dozen', 'doz', 'COUNT', false),

-- MASS
('KG', 'Kilogram', 'kg', 'MASS', true),
('G', 'Gram', 'g', 'MASS', false),
('MG', 'Milligram', 'mg', 'MASS', false),
('MT', 'Metric Ton', 't', 'MASS', false),
('LB', 'Pound', 'lb', 'MASS', false),
('OZ', 'Ounce', 'oz', 'MASS', false),

-- LENGTH
('M', 'Meter', 'm', 'LENGTH', true),
('MM', 'Millimeter', 'mm', 'LENGTH', false),
('CM', 'Centimeter', 'cm', 'LENGTH', false),
('KM', 'Kilometer', 'km', 'LENGTH', false),
('FT', 'Foot', 'ft', 'LENGTH', false),
('IN', 'Inch', 'in', 'LENGTH', false),
('YD', 'Yard', 'yd', 'LENGTH', false),

-- AREA
('M2', 'Square Meter', 'm²', 'AREA', true),
('CM2', 'Square Centimeter', 'cm²', 'AREA', false),
('FT2', 'Square Foot', 'ft²', 'AREA', false),

-- VOLUME
('L', 'Liter', 'L', 'VOLUME', true),
('ML', 'Milliliter', 'mL', 'VOLUME', false),
('M3', 'Cubic Meter', 'm³', 'VOLUME', false),
('GAL', 'Gallon (US)', 'gal', 'VOLUME', false),
('QT', 'Quart', 'qt', 'VOLUME', false),
('PT', 'Pint', 'pt', 'VOLUME', false),
('FLOZ', 'Fluid Ounce', 'fl oz', 'VOLUME', false),

-- TIME
('HR', 'Hour', 'hr', 'TIME', true),
('MIN', 'Minute', 'min', 'TIME', false),
('SEC', 'Second', 's', 'TIME', false),
('DAY', 'Day', 'day', 'TIME', false);

-- Update base_unit_id and conversion factors
UPDATE units_of_measure SET base_unit_id = (SELECT id FROM units_of_measure WHERE code = 'EA'), conversion_to_base = 1.0 WHERE code = 'PC';
UPDATE units_of_measure SET base_unit_id = (SELECT id FROM units_of_measure WHERE code = 'EA'), conversion_to_base = 12.0 WHERE code = 'DOZ';
-- ... (additional conversion factors)
```

## Migration Strategy

### Phase 1: Create New Infrastructure (No Breaking Changes)

#### Step 1.1: Create UOM Tables
```sql
-- Run the CREATE TABLE statements above
-- Load initial UOM data
```

#### Step 1.2: Add Foreign Key Columns (Nullable Initially)
```sql
ALTER TABLE items ADD COLUMN unit_of_measure_id BIGINT REFERENCES units_of_measure(id);
ALTER TABLE bom_items ADD COLUMN unit_of_measure_id BIGINT REFERENCES units_of_measure(id);
ALTER TABLE manufacturing_orders ADD COLUMN unit_of_measure_id BIGINT REFERENCES units_of_measure(id);
ALTER TABLE shipment_items ADD COLUMN unit_of_measure_id BIGINT REFERENCES units_of_measure(id);

-- Add indexes
CREATE INDEX idx_items_uom ON items(unit_of_measure_id);
CREATE INDEX idx_bom_items_uom ON bom_items(unit_of_measure_id);
CREATE INDEX idx_manufacturing_orders_uom ON manufacturing_orders(unit_of_measure_id);
CREATE INDEX idx_shipment_items_uom ON shipment_items(unit_of_measure_id);
```

### Phase 2: Data Migration

#### Step 2.1: Create Migration Mapping
```sql
-- Create temporary mapping table for non-standard UOMs found in data
CREATE TEMPORARY TABLE uom_migration_map (
    old_uom VARCHAR(20),
    new_uom_code VARCHAR(20),
    notes TEXT
);

-- Populate with common variations
INSERT INTO uom_migration_map VALUES
('each', 'EA', 'Lowercase variation'),
('EACH', 'EA', 'Full word variation'),
('pcs', 'PC', 'Abbreviation'),
('piece', 'PC', 'Full word'),
('kg', 'KG', 'Lowercase'),
('Kg', 'KG', 'Mixed case'),
('kilograms', 'KG', 'Full word'),
-- Add more mappings based on actual data analysis
;
```

#### Step 2.2: Analyze Existing Data
```sql
-- Find all unique UOM values currently in use
SELECT DISTINCT unit_of_measure, COUNT(*) as usage_count
FROM (
    SELECT unit_of_measure FROM items
    UNION ALL
    SELECT unit_of_measure FROM bom_items
    UNION ALL
    SELECT unit_of_measure FROM manufacturing_orders
    UNION ALL
    SELECT unit_of_measure FROM shipment_items
) all_uoms
GROUP BY unit_of_measure
ORDER BY usage_count DESC;
```

#### Step 2.3: Migrate Data
```sql
-- Update items
UPDATE items i
SET unit_of_measure_id = u.id
FROM units_of_measure u
WHERE (
    UPPER(i.unit_of_measure) = u.code
    OR i.unit_of_measure IN (SELECT old_uom FROM uom_migration_map WHERE new_uom_code = u.code)
);

-- Repeat for other tables...
```

### Phase 3: Model Updates

#### Step 3.1: Update Eloquent Models
```php
// Item.php
class Item extends Model
{
    protected $fillable = [
        // ... existing fields
        'unit_of_measure_id', // Add new field
    ];
    
    public function unitOfMeasure()
    {
        return $this->belongsTo(UnitOfMeasure::class);
    }
    
    // Backward compatibility accessor
    public function getUnitOfMeasureAttribute($value)
    {
        if ($this->unitOfMeasure) {
            return $this->unitOfMeasure->code;
        }
        return $value; // Return old field value if no relation
    }
}
```

#### Step 3.2: Create UOM Model
```php
// UnitOfMeasure.php
class UnitOfMeasure extends Model
{
    protected $fillable = [
        'code', 'name', 'symbol', 'uom_type',
        'is_base_unit', 'base_unit_id', 'conversion_to_base',
        'decimal_places', 'is_active'
    ];
    
    public function baseUnit()
    {
        return $this->belongsTo(UnitOfMeasure::class, 'base_unit_id');
    }
    
    public function derivedUnits()
    {
        return $this->hasMany(UnitOfMeasure::class, 'base_unit_id');
    }
    
    public function canConvertTo(UnitOfMeasure $targetUom)
    {
        return $this->uom_type === $targetUom->uom_type;
    }
    
    public function convertTo($quantity, UnitOfMeasure $targetUom)
    {
        if (!$this->canConvertTo($targetUom)) {
            throw new \Exception("Cannot convert between different UOM types");
        }
        
        // Convert to base unit first
        $baseQuantity = $quantity * $this->conversion_to_base;
        
        // Then convert to target unit
        return $baseQuantity / $targetUom->conversion_to_base;
    }
}
```

### Phase 4: Application Updates

#### Step 4.1: Update Forms and Validation
```php
// ItemRequest.php
public function rules()
{
    return [
        // ... existing rules
        'unit_of_measure_id' => 'required|exists:units_of_measure,id',
        // Remove old validation: 'unit_of_measure' => 'required|string|max:20',
    ];
}
```

#### Step 4.2: Update UI Components
```javascript
// ItemForm.vue or similar
<template>
  <select v-model="form.unit_of_measure_id" required>
    <option value="">Select Unit</option>
    <optgroup v-for="type in uomTypes" :key="type" :label="type">
      <option v-for="uom in uomsByType[type]" 
              :key="uom.id" 
              :value="uom.id">
        {{ uom.code }} - {{ uom.name }}
      </option>
    </optgroup>
  </select>
</template>
```

### Phase 5: Cleanup (After Full Migration)

#### Step 5.1: Remove Old Columns
```sql
-- Only after confirming all data is migrated and system is stable
ALTER TABLE items DROP COLUMN unit_of_measure;
ALTER TABLE bom_items DROP COLUMN unit_of_measure;
ALTER TABLE manufacturing_orders DROP COLUMN unit_of_measure;
ALTER TABLE shipment_items DROP COLUMN unit_of_measure;
```

## Validation Rules

### 1. Item Creation/Update
- Must specify a valid unit_of_measure_id
- UOM must be active
- UOM type should be appropriate for item type

### 2. BOM Creation
- Child item UOM type must be compatible with parent expectations
- Quantity conversions must be possible

### 3. Manufacturing Orders
- Order UOM must match or be convertible to item's base UOM
- All quantity calculations must use proper conversions

### 4. Work Cell Scheduling (Future)
- Item UOM type must match work cell UOM type
- Conversions only within same type

## API Changes

### 1. Item Endpoints
```json
// Old POST /api/items
{
  "unit_of_measure": "KG"
}

// New POST /api/items
{
  "unit_of_measure_id": 5
}

// Response includes full UOM object
{
  "id": 1,
  "unit_of_measure_id": 5,
  "unit_of_measure": {
    "id": 5,
    "code": "KG",
    "name": "Kilogram",
    "symbol": "kg",
    "uom_type": "MASS"
  }
}
```

### 2. New UOM Endpoints
```
GET /api/units-of-measure
GET /api/units-of-measure/types
GET /api/units-of-measure/convert?from=5&to=8&quantity=100
```

## Benefits

1. **Data Integrity**: Enforced standardization of units
2. **Type Safety**: Prevent incompatible unit combinations
3. **Conversion Support**: Automatic conversion between compatible units
4. **Better UX**: Dropdown selection instead of free text
5. **Reporting**: Consistent units for aggregation
6. **International Support**: Easy to add new units for different regions

## Risks and Mitigation

### Risk 1: Data Migration Errors
**Mitigation**: 
- Comprehensive mapping table
- Manual review of unmapped units
- Parallel run period with both systems

### Risk 2: Performance Impact
**Mitigation**:
- Proper indexing
- Caching of frequently used UOMs
- Eager loading in queries

### Risk 3: User Resistance
**Mitigation**:
- Training on new system
- Clear benefits communication
- Intuitive UI with search/filter

## Success Criteria

1. All existing UOM values successfully mapped
2. No data loss during migration
3. System performance maintained
4. Zero production disruptions
5. Improved data quality metrics

## Timeline

- **Week 1-2**: Create tables and load master data
- **Week 3-4**: Data analysis and mapping
- **Week 5-6**: Add new columns and migrate data
- **Week 7-8**: Update application code
- **Week 9-10**: Testing and validation
- **Week 11-12**: Production deployment and monitoring
- **Week 13+**: Remove old columns after stability confirmed
