<?php

namespace App\Services\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use App\Models\Production\Item;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BomImportService
{
    protected QrCodeGenerationService $qrCodeService;

    public function __construct(QrCodeGenerationService $qrCodeService)
    {
        $this->qrCodeService = $qrCodeService;
    }

    /**
     * Import BOM structure from Inventor.
     */
    public function importFromInventor(array $data): BillOfMaterial
    {
        return DB::transaction(function () use ($data) {
            // Validate Inventor data structure
            $this->validateInventorData($data);

            // Ensure output_item_id is provided
            if (!isset($data['output_item_id'])) {
                throw new \Exception('Output item ID is required for BOM creation');
            }

            $outputItem = Item::findOrFail($data['output_item_id']);
            if (!$outputItem->can_be_manufactured) {
                throw new \Exception('Selected item cannot be manufactured');
            }

            // Create BOM master record
            $bom = BillOfMaterial::create([
                'bom_number' => $data['bom_number'] ?? BillOfMaterial::generateBomNumber(),
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'external_reference' => $data['drawing_number'] ?? null,
                'output_item_id' => $data['output_item_id'],
                'is_active' => true,
                'created_by' => auth()->id(),
            ]);

            // Create initial version
            $version = $bom->versions()->create([
                'version_number' => 1,
                'revision_notes' => 'Initial import from Inventor',
                'published_at' => now(),
                'published_by' => auth()->id(),
                'is_current' => true,
            ]);

            // Create root BOM item for the output
            $rootBomItem = $version->items()->create([
                'item_id' => $bom->output_item_id,
                'parent_item_id' => null,
                'quantity' => 1,
                'unit_of_measure' => $outputItem->unit_of_measure,
                'level' => 0,
                'sequence_number' => 0,
            ]);

            // Process items recursively - all items become children of root
            $this->processInventorItems($version, $data['items'], $rootBomItem, 1);

            // Generate QR codes for all items
            $this->generateQrCodesForVersion($version);

            return $bom->fresh(['currentVersion.items']);
        });
    }

    /**
     * Import BOM from native JSON export format.
     */
    public function importFromNativeJson(array $data, array $bomInfo = []): BillOfMaterial
    {
        return DB::transaction(function () use ($data, $bomInfo) {
            // Use provided BOM info or fall back to data from export
            $bomName = $bomInfo['name'] ?? $data['name'] ?? 'Imported BOM ' . date('Y-m-d');
            $bomDescription = $bomInfo['description'] ?? $data['description'] ?? null;
            $externalReference = $bomInfo['external_reference'] ?? $data['external_reference'] ?? null;

            // Find output item - it's the root item (first item with no parent)
            $outputItem = null;
            if (!empty($data['items'])) {
                $firstItem = $data['items'][0] ?? null;
                if ($firstItem && isset($firstItem['item_number'])) {
                    $outputItem = Item::where('item_number', $firstItem['item_number'])->first();
                }
            }

            if (!$outputItem) {
                throw new \Exception('Could not determine output item from JSON. Ensure the root item exists in the system.');
            }

            if (!$outputItem->can_be_manufactured) {
                throw new \Exception('The root item cannot be manufactured');
            }

            // Create BOM master record
            $bom = BillOfMaterial::create([
                'bom_number' => BillOfMaterial::generateBomNumber(),
                'name' => $bomName,
                'description' => $bomDescription,
                'external_reference' => $externalReference,
                'output_item_id' => $outputItem->id,
                'is_active' => true,
                'created_by' => auth()->id(),
            ]);

            // Create initial version
            $version = $bom->versions()->create([
                'version_number' => 1,
                'revision_notes' => 'Imported from JSON export',
                'published_at' => now(),
                'published_by' => auth()->id(),
                'is_current' => true,
            ]);

            // Create root BOM item
            $rootBomItem = $version->items()->create([
                'item_id' => $outputItem->id,
                'parent_item_id' => null,
                'quantity' => 1,
                'unit_of_measure' => $outputItem->unit_of_measure,
                'level' => 0,
                'sequence_number' => 0,
            ]);

            // Process items recursively
            if (!empty($data['items'][0]['children'])) {
                $this->processNativeJsonItems($version, $data['items'][0]['children'], $rootBomItem, 1);
            }

            // Generate QR codes for all items
            $this->generateQrCodesForVersion($version);

            return $bom->fresh(['currentVersion.items']);
        });
    }

    /**
     * Process native JSON items recursively.
     */
    protected function processNativeJsonItems(BomVersion $version, array $items, BomItem $parentBomItem, int $level, int $sequenceOffset = 0): int
    {
        $sequenceNumber = $sequenceOffset;

        foreach ($items as $itemData) {
            // Find or create the item
            $item = Item::where('item_number', $itemData['item_number'])->first();
            
            if (!$item) {
                $item = Item::create([
                    'item_number' => $itemData['item_number'],
                    'name' => $itemData['item_name'] ?? $itemData['item_number'],
                    'unit_of_measure' => $itemData['unit_of_measure'] ?? 'UN',
                    'is_active' => true,
                    'created_by' => auth()->id(),
                ]);
            }

            // Create BOM item
            $bomItem = $version->items()->create([
                'item_id' => $item->id,
                'parent_item_id' => $parentBomItem->id,
                'quantity' => $itemData['quantity'] ?? 1,
                'unit_of_measure' => $itemData['unit_of_measure'] ?? $item->unit_of_measure,
                'reference_designators' => $itemData['reference_designators'] ?? null,
                'bom_notes' => $itemData['bom_notes'] ?? null,
                'level' => $level,
                'sequence_number' => $sequenceNumber++,
            ]);

            // Process children if exist
            if (!empty($itemData['children'])) {
                $sequenceNumber = $this->processNativeJsonItems($version, $itemData['children'], $bomItem, $level + 1, $sequenceNumber);
            }
        }

        return $sequenceNumber;
    }

    /**
     * Import BOM from CSV file.
     */
    public function importFromCsv(UploadedFile $file, array $mapping = [], array $bomInfo = []): BillOfMaterial
    {
        return DB::transaction(function () use ($file, $mapping, $bomInfo) {
            // Parse CSV
            $data = $this->parseCsvFile($file);
            
            // Validate CSV data
            $this->validateCsvData($data, $mapping);

            // Get BOM info from provided data
            $bomName = $bomInfo['name'] ?? 'Imported BOM ' . date('Y-m-d');
            $bomDescription = $bomInfo['description'] ?? null;
            $externalReference = $bomInfo['external_reference'] ?? null;

            // First, we need to determine the output item from the CSV data
            // The output item is typically the top-level item (level 0 or no parent)
            $outputItem = null;
            foreach ($data as $row) {
                $level = isset($mapping['level']) && isset($row[$mapping['level']]) ? (int)$row[$mapping['level']] : null;
                $parent = isset($mapping['parent']) && isset($row[$mapping['parent']]) ? $row[$mapping['parent']] : null;
                
                if ($level === 0 || empty($parent)) {
                    $itemNumber = $row[$mapping['item_number']] ?? null;
                    if ($itemNumber) {
                        $outputItem = Item::where('item_number', $itemNumber)->first();
                        break;
                    }
                }
            }

            if (!$outputItem) {
                throw new \Exception('Could not determine output item from CSV. Ensure there is a top-level item (level 0 or no parent).');
            }

            if (!$outputItem->can_be_manufactured) {
                throw new \Exception('Selected item cannot be manufactured');
            }

            // Build hierarchy from flat data
            $hierarchy = $this->buildHierarchy($data, $mapping);

            // Create BOM master record
            $bom = BillOfMaterial::create([
                'bom_number' => BillOfMaterial::generateBomNumber(),
                'name' => $bomName,
                'description' => $bomDescription,
                'external_reference' => $externalReference,
                'output_item_id' => $outputItem->id,
                'is_active' => true,
                'created_by' => auth()->id(),
            ]);

            // Create initial version
            $version = $bom->versions()->create([
                'version_number' => 1,
                'revision_notes' => 'Imported from CSV',
                'published_at' => now(),
                'published_by' => auth()->id(),
                'is_current' => true,
            ]);

            // Create root BOM item for the output
            $rootBomItem = $version->items()->create([
                'item_id' => $bom->output_item_id,
                'parent_item_id' => null,
                'quantity' => 1,
                'unit_of_measure' => $outputItem->unit_of_measure,
                'level' => 0,
                'sequence_number' => 0,
            ]);

            // Process hierarchy - all items become children of root
            $this->processHierarchyItems($version, $hierarchy['items'], $rootBomItem, 1);

            // Generate QR codes for all items
            $this->generateQrCodesForVersion($version);

            return $bom->fresh(['currentVersion.items']);
        });
    }

    /**
     * Process Inventor items recursively.
     */
    protected function processInventorItems(
        BomVersion $version,
        array $items,
        ?BomItem $parent,
        int $level
    ): void {
        foreach ($items as $index => $itemData) {
            // Find or create the item in the items table
            $item = Item::where('item_number', $itemData['item_number'])->first();
            
            if (!$item) {
                // Create new item if it doesn't exist
                $item = Item::create([
                    'item_number' => $itemData['item_number'],
                    'name' => $itemData['name'],
                    'description' => $itemData['description'] ?? null,
                    'can_be_manufactured' => isset($itemData['children']) && !empty($itemData['children']),
                    'can_be_purchased' => !isset($itemData['children']) || empty($itemData['children']),
                    'is_active' => true,
                    'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                    'weight' => $itemData['weight'] ?? null,
                    'dimensions' => $itemData['dimensions'] ?? null,
                    'created_by' => auth()->id(),
                ]);
            }

            // Import thumbnail to S3 if provided
            $thumbnailPath = null;
            if (!empty($itemData['thumbnail'])) {
                $thumbnailPath = $this->importThumbnail($itemData['thumbnail'], $itemData['item_number']);
            }

            // Create BOM item referencing the item
            $bomItem = $version->items()->create([
                'parent_item_id' => $parent?->id,
                'item_id' => $item->id,
                'quantity' => $itemData['quantity'] ?? 1,
                'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                'level' => $level,
                'sequence_number' => $index + 1,
                'reference_designators' => $itemData['reference_designators'] ?? null,
                'thumbnail_path' => $thumbnailPath,
                'model_file_path' => $itemData['model_file_path'] ?? null,
                'bom_notes' => [
                    'material' => $itemData['material'] ?? null,
                    'custom_attributes' => $itemData['custom_attributes'] ?? null,
                ],
            ]);

            // Process children recursively
            if (!empty($itemData['children'])) {
                $this->processInventorItems($version, $itemData['children'], $bomItem, $level + 1);
            }
        }
    }

    /**
     * Parse CSV file.
     */
    protected function parseCsvFile(UploadedFile $file): array
    {
        $data = [];
        $handle = fopen($file->getRealPath(), 'r');
        $headers = null;

        while (($row = fgetcsv($handle)) !== false) {
            if ($headers === null) {
                $headers = $row;
                continue;
            }

            $data[] = array_combine($headers, $row);
        }

        fclose($handle);
        return $data;
    }

    /**
     * Build hierarchy from flat CSV data.
     */
    protected function buildHierarchy(array $flatData, array $mapping): array
    {
        $hierarchy = [
            'name' => 'Root Assembly',
            'items' => [],
        ];

        $itemsByLevel = [];
        $parentMap = [];

        // First pass: organize by level
        foreach ($flatData as $row) {
            $level = (int) ($row[$mapping['level'] ?? 'level'] ?? 0);
            $itemNumber = $row[$mapping['item_number'] ?? 'item_number'];
            
            $item = [
                'item_number' => $itemNumber,
                'name' => $row[$mapping['name'] ?? 'name'],
                'description' => $row[$mapping['description'] ?? 'description'] ?? null,
                'quantity' => (float) ($row[$mapping['quantity'] ?? 'quantity'] ?? 1),
                'unit_of_measure' => $row[$mapping['unit_of_measure'] ?? 'unit_of_measure'] ?? 'EA',
                'level' => $level,
                'parent' => $row[$mapping['parent'] ?? 'parent'] ?? null,
                'children' => [],
            ];

            $itemsByLevel[$level][] = $item;
            $parentMap[$itemNumber] = &$itemsByLevel[$level][count($itemsByLevel[$level]) - 1];
        }

        // Second pass: build hierarchy
        foreach ($itemsByLevel as $level => $items) {
            foreach ($items as &$item) {
                if ($item['parent'] && isset($parentMap[$item['parent']])) {
                    $parentMap[$item['parent']]['children'][] = &$item;
                } elseif ($level === 0) {
                    $hierarchy['items'][] = &$item;
                }
            }
        }

        return $hierarchy;
    }

    /**
     * Process hierarchy items.
     */
    protected function processHierarchyItems(
        BomVersion $version,
        array $items,
        ?BomItem $parent,
        int $level
    ): void {
        foreach ($items as $index => $itemData) {
            // Find or create the item in the items table
            $item = Item::where('item_number', $itemData['item_number'])->first();
            
            if (!$item) {
                // Create new item if it doesn't exist
                $item = Item::create([
                    'item_number' => $itemData['item_number'],
                    'name' => $itemData['name'],
                    'description' => $itemData['description'] ?? null,
                    'can_be_manufactured' => isset($itemData['children']) && !empty($itemData['children']),
                    'can_be_purchased' => !isset($itemData['children']) || empty($itemData['children']),
                    'is_active' => true,
                    'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                    'created_by' => auth()->id(),
                ]);
            }

            // Create BOM item referencing the item
            $bomItem = $version->items()->create([
                'parent_item_id' => $parent?->id,
                'item_id' => $item->id,
                'quantity' => $itemData['quantity'] ?? 1,
                'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                'level' => $level,
                'sequence_number' => $index + 1,
            ]);

            // Process children recursively
            if (!empty($itemData['children'])) {
                $this->processHierarchyItems($version, $itemData['children'], $bomItem, $level + 1);
            }
        }
    }

    /**
     * Import thumbnail to S3.
     */
    protected function importThumbnail($thumbnailData, $itemNumber): ?string
    {
        if (is_string($thumbnailData) && file_exists($thumbnailData)) {
            // Local file path
            $contents = file_get_contents($thumbnailData);
            $extension = pathinfo($thumbnailData, PATHINFO_EXTENSION);
        } elseif (is_string($thumbnailData) && filter_var($thumbnailData, FILTER_VALIDATE_URL)) {
            // URL
            $contents = file_get_contents($thumbnailData);
            $extension = 'jpg'; // Default extension
        } elseif (is_string($thumbnailData) && preg_match('/^data:image\/(\w+);base64,/', $thumbnailData, $matches)) {
            // Base64 data
            $extension = $matches[1];
            $contents = base64_decode(substr($thumbnailData, strpos($thumbnailData, ',') + 1));
        } else {
            return null;
        }

        $filename = Str::slug($itemNumber) . '-' . time() . '.' . $extension;
        $path = 'production/bom-thumbnails/' . $filename;

        Storage::disk('s3')->put($path, $contents, 'public');

        return $path;
    }

    /**
     * Determine item type based on data.
     */
    protected function determineItemType(array $data): string
    {
        if (!empty($data['children'])) {
            return 'assembly';
        }

        if (isset($data['item_type'])) {
            return $data['item_type'];
        }

        // Default logic based on item number pattern
        $itemNumber = $data['item_number'] ?? '';
        
        if (preg_match('/^ASM-/', $itemNumber)) {
            return 'assembly';
        } elseif (preg_match('/^SUB-/', $itemNumber)) {
            return 'subassembly';
        }

        return 'part';
    }

    /**
     * Generate QR codes for all items in a version.
     */
    protected function generateQrCodesForVersion(BomVersion $version): void
    {
        try {
            // Check if S3 is configured
            $s3Config = config('filesystems.disks.s3');
            if (!$s3Config || empty($s3Config['key']) || empty($s3Config['secret'])) {
                \Log::info('S3 not configured, skipping QR code generation during import');
                return;
            }

            foreach ($version->items as $item) {
                try {
                    $this->qrCodeService->generateForBomItem($item);
                } catch (\Exception $e) {
                    \Log::warning("Failed to generate QR code for BOM item {$item->id}: " . $e->getMessage());
                    // Continue with other items
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to generate QR codes during BOM import: ' . $e->getMessage());
            // Don't fail the import due to QR code generation issues
        }
    }



    /**
     * Validate Inventor data structure.
     */
    protected function validateInventorData(array $data): void
    {
        $required = ['name', 'items'];
        
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("Field '{$field}' is required in Inventor data.");
            }
        }

        if (!is_array($data['items']) || count($data['items']) === 0) {
            throw new \InvalidArgumentException("BOM must contain at least one item.");
        }
    }

    /**
     * Validate CSV data.
     */
    protected function validateCsvData(array $data, array $mapping): void
    {
        if (empty($data)) {
            throw new \InvalidArgumentException("CSV file is empty.");
        }

        $requiredFields = ['item_number', 'name'];
        
        foreach ($requiredFields as $field) {
            $mappedField = $mapping[$field] ?? $field;
            
            if (!isset($data[0][$mappedField])) {
                throw new \InvalidArgumentException("Required field '{$field}' not found in CSV.");
            }
        }
    }
}