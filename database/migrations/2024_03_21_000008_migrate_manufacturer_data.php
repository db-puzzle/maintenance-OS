<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Manufacturer;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all unique manufacturer names from assets
        $manufacturerNames = Asset::whereNotNull('manufacturer')
            ->where('manufacturer', '!=', '')
            ->distinct()
            ->pluck('manufacturer');

        // Create manufacturers for each unique name
        foreach ($manufacturerNames as $name) {
            $manufacturer = Manufacturer::firstOrCreate(['name' => $name]);
            
            // Update all assets with this manufacturer name
            Asset::where('manufacturer', $name)
                ->update(['manufacturer_id' => $manufacturer->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear all manufacturer_id values
        Asset::whereNotNull('manufacturer_id')
            ->update(['manufacturer_id' => null]);
    }
}; 