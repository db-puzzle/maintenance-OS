<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Copy any existing data from inventory_parts to parts (if any exists)
        if (Schema::hasTable('inventory_parts') && DB::table('inventory_parts')->exists()) {
            $inventoryParts = DB::table('inventory_parts')->get();
            
            foreach ($inventoryParts as $inventoryPart) {
                DB::table('parts')->insertOrIgnore([
                    'id' => $inventoryPart->id,
                    'part_number' => $inventoryPart->part_number ?? 'MIGRATED-' . $inventoryPart->id,
                    'name' => $inventoryPart->name,
                    'description' => $inventoryPart->description,
                    'unit_cost' => $inventoryPart->unit_cost ?? 0,
                    'available_quantity' => $inventoryPart->available_quantity ?? 0,
                    'minimum_quantity' => $inventoryPart->minimum_quantity ?? 0,
                    'maximum_quantity' => $inventoryPart->maximum_quantity ?? null,
                    'location' => $inventoryPart->location ?? null,
                    'supplier' => $inventoryPart->supplier ?? null,
                    'manufacturer' => $inventoryPart->manufacturer ?? null,
                    'active' => $inventoryPart->active ?? true,
                    'created_at' => $inventoryPart->created_at,
                    'updated_at' => $inventoryPart->updated_at,
                ]);
            }
        }

        // Step 2: Drop foreign key constraint on work_order_parts.part_id
        Schema::table('work_order_parts', function (Blueprint $table) {
            $table->dropForeign(['part_id']);
        });

        // Step 3: Add new foreign key constraint to parts table
        Schema::table('work_order_parts', function (Blueprint $table) {
            $table->foreign('part_id')->references('id')->on('parts')->onDelete('restrict');
        });

        // Step 4: Drop inventory_parts table
        Schema::dropIfExists('inventory_parts');
    }

    public function down(): void
    {
        // Recreate inventory_parts table
        Schema::create('inventory_parts', function (Blueprint $table) {
            $table->id();
            $table->string('part_number')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->integer('available_quantity')->nullable();
            $table->integer('minimum_quantity')->nullable();
            $table->integer('maximum_quantity')->nullable();
            $table->string('location')->nullable();
            $table->string('supplier')->nullable();
            $table->string('manufacturer')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Remove foreign key from work_order_parts
        Schema::table('work_order_parts', function (Blueprint $table) {
            $table->dropForeign(['part_id']);
        });

        // Re-add foreign key to inventory_parts
        Schema::table('work_order_parts', function (Blueprint $table) {
            $table->foreign('part_id')->references('id')->on('inventory_parts')->onDelete('restrict');
        });
    }
};