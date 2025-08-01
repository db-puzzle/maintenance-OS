<?php

namespace App\Services\Production;

use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ItemImportService
{
    /**
     * Import items from native JSON format (our own export).
     */
    public function importFromNativeJson(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $imported = [];
            $errors = [];

            // Process items
            $items = isset($data['items']) ? $data['items'] : [];
            foreach ($items as $itemData) {
                try {
                    $item = $this->processItem($itemData);
                    $imported[] = $item;
                } catch (\Exception $e) {
                    $itemNumber = isset($itemData['item_number']) ? $itemData['item_number'] : 'unknown';
                    $errors[] = "Failed to import item {$itemNumber}: " . $e->getMessage();
                }
            }

            return [
                'imported' => $imported,
                'errors' => $errors,
                'count' => count($imported)
            ];
        });
    }

    /**
     * Import items from CSV file.
     */
    public function importFromCsv(UploadedFile $file, array $mapping): array
    {
        $rows = $this->parseCsvFile($file);
        $imported = [];
        $errors = [];

        DB::transaction(function () use ($rows, $mapping, &$imported, &$errors) {
            foreach ($rows as $index => $row) {
                try {
                    $mappedData = $this->mapCsvRow($row, $mapping);
                    if ($mappedData) {
                        $item = $this->processItem($mappedData);
                        $imported[] = $item;
                    }
                } catch (\Exception $e) {
                    $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                }
            }
        });

        return [
            'imported' => $imported,
            'errors' => $errors,
            'count' => count($imported)
        ];
    }

    /**
     * Process and create/update a single item.
     */
    protected function processItem(array $data): Item
    {
        // Find or create category if provided
        $categoryId = null;
        if (isset($data['category_name']) && $data['category_name']) {
            $category = ItemCategory::firstOrCreate(
                ['name' => $data['category_name']],
                ['description' => 'Imported category', 'is_active' => true]
            );
            $categoryId = $category->id;
        } elseif (isset($data['item_category_id'])) {
            $categoryId = $data['item_category_id'];
        }

        // Prepare item data
        $itemData = [
            'name' => $data['name'],
            'description' => isset($data['description']) ? $data['description'] : null,
            'item_category_id' => $categoryId,
            'can_be_sold' => isset($data['can_be_sold']) ? $data['can_be_sold'] : false,
            'can_be_purchased' => isset($data['can_be_purchased']) ? $data['can_be_purchased'] : true,
            'can_be_manufactured' => isset($data['can_be_manufactured']) ? $data['can_be_manufactured'] : false,
            'is_phantom' => isset($data['is_phantom']) ? $data['is_phantom'] : false,
            'is_active' => isset($data['is_active']) ? $data['is_active'] : true,
            'status' => isset($data['status']) ? $data['status'] : 'active',
            'unit_of_measure' => isset($data['unit_of_measure']) ? $data['unit_of_measure'] : 'UN',
            'weight' => isset($data['weight']) ? $data['weight'] : null,
            'dimensions' => isset($data['dimensions']) ? $data['dimensions'] : null,
            'list_price' => isset($data['list_price']) ? $data['list_price'] : null,
            'manufacturing_cost' => isset($data['manufacturing_cost']) ? $data['manufacturing_cost'] : null,
            'manufacturing_lead_time_days' => isset($data['manufacturing_lead_time_days']) ? $data['manufacturing_lead_time_days'] : null,
            'purchase_price' => isset($data['purchase_price']) ? $data['purchase_price'] : null,
            'purchase_lead_time_days' => isset($data['purchase_lead_time_days']) ? $data['purchase_lead_time_days'] : null,
            'track_inventory' => isset($data['track_inventory']) ? $data['track_inventory'] : true,
            'min_stock_level' => isset($data['min_stock_level']) ? $data['min_stock_level'] : null,
            'max_stock_level' => isset($data['max_stock_level']) ? $data['max_stock_level'] : null,
            'reorder_point' => isset($data['reorder_point']) ? $data['reorder_point'] : null,
            'preferred_vendor' => isset($data['preferred_vendor']) ? $data['preferred_vendor'] : null,
            'vendor_item_number' => isset($data['vendor_item_number']) ? $data['vendor_item_number'] : null,
            'tags' => isset($data['tags']) ? $data['tags'] : [],
            'custom_attributes' => isset($data['custom_attributes']) ? $data['custom_attributes'] : [],
            'created_by' => auth()->id(),
        ];

        // Create or update item
        $item = Item::updateOrCreate(
            ['item_number' => $data['item_number']],
            $itemData
        );

        return $item;
    }

    /**
     * Parse CSV file into array of rows.
     */
    protected function parseCsvFile(UploadedFile $file): array
    {
        $content = file_get_contents($file->getRealPath());
        $lines = explode("\n", $content);
        $headers = str_getcsv(array_shift($lines));
        
        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            
            $values = str_getcsv($line);
            $row = [];
            
            foreach ($headers as $index => $header) {
                $row[$header] = isset($values[$index]) ? $values[$index] : '';
            }
            
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Map CSV row to item data using field mapping.
     */
    protected function mapCsvRow(array $row, array $mapping): ?array
    {
        $data = [];

        foreach ($mapping as $csvField => $itemField) {
            if (empty($itemField) || $itemField === '_ignore') continue;

            $value = isset($row[$csvField]) ? $row[$csvField] : '';

            // Handle boolean fields
            if (in_array($itemField, ['can_be_sold', 'can_be_purchased', 'can_be_manufactured', 'is_phantom', 'is_active', 'track_inventory'])) {
                $value = in_array(strtolower($value), ['true', '1', 'yes', 'sim', 's']);
            }

            // Handle numeric fields
            if (in_array($itemField, ['weight', 'list_price', 'manufacturing_cost', 'purchase_price', 'min_stock_level', 'max_stock_level', 'reorder_point'])) {
                $value = is_numeric($value) ? (float)$value : null;
            }

            // Handle integer fields
            if (in_array($itemField, ['manufacturing_lead_time_days', 'purchase_lead_time_days'])) {
                $value = is_numeric($value) ? (int)$value : null;
            }

            // Handle array fields
            if (in_array($itemField, ['tags', 'dimensions'])) {
                $value = $value ? explode(',', $value) : [];
                $value = array_map('trim', $value);
            }

            $data[$itemField] = $value;
        }

        // Skip if no item number
        if (empty($data['item_number'])) {
            return null;
        }

        return $data;
    }
}
