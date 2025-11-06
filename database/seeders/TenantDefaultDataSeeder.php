<?php

namespace Database\Seeders;

use App\Models\Production\UnitOfMeasure;
use Illuminate\Database\Seeder;

/**
 * Seeder for tenant default data.
 */
class TenantDefaultDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = tenant();

        // Always seed basic units of measure
        $this->seedUnitsOfMeasure();

        // You can add conditional seeding based on plan features
        // Example:
        // $plan = $tenant->subscription->plan ?? null;
        // if ($plan?->hasFeature('demo_data')) {
        //     $this->call([
        //         DemoAssetsSeeder::class,
        //         DemoWorkOrdersSeeder::class,
        //     ]);
        // }

        $this->command->info('Default tenant data seeded.');
    }

    /**
     * Seed default units of measure.
     */
    protected function seedUnitsOfMeasure(): void
    {
        $units = [
            ['code' => 'EA', 'name' => 'Each', 'symbol' => 'ea', 'uom_type' => 'COUNT', 'is_base_unit' => true],
            ['code' => 'PC', 'name' => 'Piece', 'symbol' => 'pc', 'uom_type' => 'COUNT', 'is_base_unit' => false],
            ['code' => 'SET', 'name' => 'Set', 'symbol' => 'set', 'uom_type' => 'COUNT', 'is_base_unit' => false],
            ['code' => 'BOX', 'name' => 'Box', 'symbol' => 'box', 'uom_type' => 'COUNT', 'is_base_unit' => false],
            ['code' => 'KG', 'name' => 'Kilogram', 'symbol' => 'kg', 'uom_type' => 'MASS', 'is_base_unit' => true],
            ['code' => 'LB', 'name' => 'Pound', 'symbol' => 'lb', 'uom_type' => 'MASS', 'is_base_unit' => false],
            ['code' => 'M', 'name' => 'Meter', 'symbol' => 'm', 'uom_type' => 'LENGTH', 'is_base_unit' => true],
            ['code' => 'FT', 'name' => 'Foot', 'symbol' => 'ft', 'uom_type' => 'LENGTH', 'is_base_unit' => false],
            ['code' => 'L', 'name' => 'Liter', 'symbol' => 'L', 'uom_type' => 'VOLUME', 'is_base_unit' => true],
            ['code' => 'GAL', 'name' => 'Gallon', 'symbol' => 'gal', 'uom_type' => 'VOLUME', 'is_base_unit' => false],
            ['code' => 'HR', 'name' => 'Hour', 'symbol' => 'hr', 'uom_type' => 'TIME', 'is_base_unit' => true],
            ['code' => 'MIN', 'name' => 'Minute', 'symbol' => 'min', 'uom_type' => 'TIME', 'is_base_unit' => false],
            ['code' => 'SEC', 'name' => 'Second', 'symbol' => 's', 'uom_type' => 'TIME', 'is_base_unit' => false],
        ];

        foreach ($units as $unit) {
            UnitOfMeasure::firstOrCreate(
                ['code' => $unit['code']],
                $unit
            );
        }

        $this->command->info('Units of measure seeded.');
    }
}
