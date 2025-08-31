<?php

namespace Database\Seeders;

use App\Models\Production\UnitOfMeasure;
use Illuminate\Database\Seeder;

class UnitOfMeasureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Count type units
        $pc = UnitOfMeasure::create([
            'code' => 'PC',
            'name' => 'Piece',
            'symbol' => 'pc',
            'uom_type' => 'COUNT',
            'is_base_unit' => true,
            'conversion_to_base' => 1.0,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'EA',
            'name' => 'Each',
            'symbol' => 'ea',
            'uom_type' => 'COUNT',
            'is_base_unit' => false,
            'base_unit_id' => $pc->id,
            'conversion_to_base' => 1.0,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'DOZ',
            'name' => 'Dozen',
            'symbol' => 'doz',
            'uom_type' => 'COUNT',
            'is_base_unit' => false,
            'base_unit_id' => $pc->id,
            'conversion_to_base' => 12.0,
            'decimal_places' => 0,
        ]);

        // Mass type units
        $kg = UnitOfMeasure::create([
            'code' => 'KG',
            'name' => 'Kilogram',
            'symbol' => 'kg',
            'uom_type' => 'MASS',
            'is_base_unit' => true,
            'conversion_to_base' => 1.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'G',
            'name' => 'Gram',
            'symbol' => 'g',
            'uom_type' => 'MASS',
            'is_base_unit' => false,
            'base_unit_id' => $kg->id,
            'conversion_to_base' => 0.001,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'MG',
            'name' => 'Milligram',
            'symbol' => 'mg',
            'uom_type' => 'MASS',
            'is_base_unit' => false,
            'base_unit_id' => $kg->id,
            'conversion_to_base' => 0.000001,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'TON',
            'name' => 'Metric Ton',
            'symbol' => 't',
            'uom_type' => 'MASS',
            'is_base_unit' => false,
            'base_unit_id' => $kg->id,
            'conversion_to_base' => 1000.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'LB',
            'name' => 'Pound',
            'symbol' => 'lb',
            'uom_type' => 'MASS',
            'is_base_unit' => false,
            'base_unit_id' => $kg->id,
            'conversion_to_base' => 0.45359237,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'OZ',
            'name' => 'Ounce',
            'symbol' => 'oz',
            'uom_type' => 'MASS',
            'is_base_unit' => false,
            'base_unit_id' => $kg->id,
            'conversion_to_base' => 0.0283495231,
            'decimal_places' => 3,
        ]);

        // Length type units
        $m = UnitOfMeasure::create([
            'code' => 'M',
            'name' => 'Meter',
            'symbol' => 'm',
            'uom_type' => 'LENGTH',
            'is_base_unit' => true,
            'conversion_to_base' => 1.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'MM',
            'name' => 'Millimeter',
            'symbol' => 'mm',
            'uom_type' => 'LENGTH',
            'is_base_unit' => false,
            'base_unit_id' => $m->id,
            'conversion_to_base' => 0.001,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'CM',
            'name' => 'Centimeter',
            'symbol' => 'cm',
            'uom_type' => 'LENGTH',
            'is_base_unit' => false,
            'base_unit_id' => $m->id,
            'conversion_to_base' => 0.01,
            'decimal_places' => 1,
        ]);

        UnitOfMeasure::create([
            'code' => 'KM',
            'name' => 'Kilometer',
            'symbol' => 'km',
            'uom_type' => 'LENGTH',
            'is_base_unit' => false,
            'base_unit_id' => $m->id,
            'conversion_to_base' => 1000.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'FT',
            'name' => 'Foot',
            'symbol' => 'ft',
            'uom_type' => 'LENGTH',
            'is_base_unit' => false,
            'base_unit_id' => $m->id,
            'conversion_to_base' => 0.3048,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'IN',
            'name' => 'Inch',
            'symbol' => 'in',
            'uom_type' => 'LENGTH',
            'is_base_unit' => false,
            'base_unit_id' => $m->id,
            'conversion_to_base' => 0.0254,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'YD',
            'name' => 'Yard',
            'symbol' => 'yd',
            'uom_type' => 'LENGTH',
            'is_base_unit' => false,
            'base_unit_id' => $m->id,
            'conversion_to_base' => 0.9144,
            'decimal_places' => 3,
        ]);

        // Area type units
        $m2 = UnitOfMeasure::create([
            'code' => 'M2',
            'name' => 'Square Meter',
            'symbol' => 'm²',
            'uom_type' => 'AREA',
            'is_base_unit' => true,
            'conversion_to_base' => 1.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'CM2',
            'name' => 'Square Centimeter',
            'symbol' => 'cm²',
            'uom_type' => 'AREA',
            'is_base_unit' => false,
            'base_unit_id' => $m2->id,
            'conversion_to_base' => 0.0001,
            'decimal_places' => 1,
        ]);

        UnitOfMeasure::create([
            'code' => 'FT2',
            'name' => 'Square Foot',
            'symbol' => 'ft²',
            'uom_type' => 'AREA',
            'is_base_unit' => false,
            'base_unit_id' => $m2->id,
            'conversion_to_base' => 0.092903,
            'decimal_places' => 3,
        ]);

        // Volume type units
        $l = UnitOfMeasure::create([
            'code' => 'L',
            'name' => 'Liter',
            'symbol' => 'L',
            'uom_type' => 'VOLUME',
            'is_base_unit' => true,
            'conversion_to_base' => 1.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'ML',
            'name' => 'Milliliter',
            'symbol' => 'mL',
            'uom_type' => 'VOLUME',
            'is_base_unit' => false,
            'base_unit_id' => $l->id,
            'conversion_to_base' => 0.001,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'M3',
            'name' => 'Cubic Meter',
            'symbol' => 'm³',
            'uom_type' => 'VOLUME',
            'is_base_unit' => false,
            'base_unit_id' => $l->id,
            'conversion_to_base' => 1000.0,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'GAL',
            'name' => 'Gallon (US)',
            'symbol' => 'gal',
            'uom_type' => 'VOLUME',
            'is_base_unit' => false,
            'base_unit_id' => $l->id,
            'conversion_to_base' => 3.78541,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'QT',
            'name' => 'Quart',
            'symbol' => 'qt',
            'uom_type' => 'VOLUME',
            'is_base_unit' => false,
            'base_unit_id' => $l->id,
            'conversion_to_base' => 0.946353,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'PT',
            'name' => 'Pint',
            'symbol' => 'pt',
            'uom_type' => 'VOLUME',
            'is_base_unit' => false,
            'base_unit_id' => $l->id,
            'conversion_to_base' => 0.473176,
            'decimal_places' => 3,
        ]);

        UnitOfMeasure::create([
            'code' => 'FLOZ',
            'name' => 'Fluid Ounce',
            'symbol' => 'fl oz',
            'uom_type' => 'VOLUME',
            'is_base_unit' => false,
            'base_unit_id' => $l->id,
            'conversion_to_base' => 0.0295735,
            'decimal_places' => 3,
        ]);

        // Time type units
        $hr = UnitOfMeasure::create([
            'code' => 'HR',
            'name' => 'Hour',
            'symbol' => 'hr',
            'uom_type' => 'TIME',
            'is_base_unit' => true,
            'conversion_to_base' => 1.0,
            'decimal_places' => 2,
        ]);

        UnitOfMeasure::create([
            'code' => 'MIN',
            'name' => 'Minute',
            'symbol' => 'min',
            'uom_type' => 'TIME',
            'is_base_unit' => false,
            'base_unit_id' => $hr->id,
            'conversion_to_base' => 0.0166667,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'SEC',
            'name' => 'Second',
            'symbol' => 's',
            'uom_type' => 'TIME',
            'is_base_unit' => false,
            'base_unit_id' => $hr->id,
            'conversion_to_base' => 0.000277778,
            'decimal_places' => 0,
        ]);

        UnitOfMeasure::create([
            'code' => 'DAY',
            'name' => 'Day',
            'symbol' => 'day',
            'uom_type' => 'TIME',
            'is_base_unit' => false,
            'base_unit_id' => $hr->id,
            'conversion_to_base' => 24.0,
            'decimal_places' => 2,
        ]);
    }
}
