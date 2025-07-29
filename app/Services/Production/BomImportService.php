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
                'bom_number' => $data['bom_number'] ?? $this->generateBomNumber(),
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
     * Import BOM from CSV file.
     */
    public function importFromCsv(UploadedFile $file, array $mapping = []): BillOfMaterial
    {
        return DB::transaction(function () use ($file, $mapping) {
            // Parse CSV
            $data = $this->parseCsvFile($file);
            
            // Validate CSV data
            $this->validateCsvData($data, $mapping);

            // Ensure output_item_id is provided in mapping
            if (!isset($mapping['output_item_id'])) {
                throw new \Exception('Output item ID is required for BOM creation');
            }

            $outputItem = Item::findOrFail($mapping['output_item_id']);
            if (!$outputItem->can_be_manufactured) {
                throw new \Exception('Selected item cannot be manufactured');
            }

            // Build hierarchy from flat data
            $hierarchy = $this->buildHierarchy($data, $mapping);

            // Create BOM master record
            $bom = BillOfMaterial::create([
                'bom_number' => $this->generateBomNumber(),
                'name' => $hierarchy['name'] ?? 'Imported BOM',
                'description' => $hierarchy['description'] ?? null,
                'output_item_id' => $mapping['output_item_id'],
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
        foreach ($version->items as $item) {
            $this->qrCodeService->generateForBomItem($item);
        }
    }

    /**
     * Generate a unique BOM number.
     */
    protected function generateBomNumber(): string
    {
        $year = now()->format('Y');
        $lastBom = BillOfMaterial::where('bom_number', 'like', "BOM-{$year}-%")
            ->orderBy('bom_number', 'desc')
            ->first();

        $sequence = $lastBom 
            ? intval(substr($lastBom->bom_number, -4)) + 1 
            : 1;

        return sprintf('BOM-%s-%04d', $year, $sequence);
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