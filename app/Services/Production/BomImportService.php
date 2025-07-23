<?php

namespace App\Services\Production;

use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
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
     * Import BOM from Inventor data.
     */
    public function importFromInventor(array $data): BillOfMaterial
    {
        return DB::transaction(function () use ($data) {
            // Validate Inventor data structure
            $this->validateInventorData($data);

            // Create BOM master record
            $bom = BillOfMaterial::create([
                'bom_number' => $data['bom_number'] ?? $this->generateBomNumber(),
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'external_reference' => $data['drawing_number'] ?? null,
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

            // Process items recursively
            $this->processInventorItems($version, $data['items'], null, 0);

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

            // Build hierarchy from flat data
            $hierarchy = $this->buildHierarchy($data, $mapping);

            // Create BOM master record
            $bom = BillOfMaterial::create([
                'bom_number' => $this->generateBomNumber(),
                'name' => $hierarchy['name'] ?? 'Imported BOM',
                'description' => $hierarchy['description'] ?? null,
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

            // Process hierarchy
            $this->processHierarchyItems($version, $hierarchy['items'], null, 0);

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
            // Import thumbnail to S3 if provided
            $thumbnailPath = null;
            if (!empty($itemData['thumbnail'])) {
                $thumbnailPath = $this->importThumbnail($itemData['thumbnail'], $itemData['item_number']);
            }

            // Create BOM item
            $item = $version->items()->create([
                'parent_item_id' => $parent?->id,
                'item_number' => $itemData['item_number'],
                'name' => $itemData['name'],
                'description' => $itemData['description'] ?? null,
                'item_type' => $itemData['item_type'] ?? $this->determineItemType($itemData),
                'quantity' => $itemData['quantity'] ?? 1,
                'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                'level' => $level,
                'sequence_number' => $index + 1,
                'thumbnail_path' => $thumbnailPath,
                'model_file_path' => $itemData['model_file_path'] ?? null,
                'material' => $itemData['material'] ?? null,
                'weight' => $itemData['weight'] ?? null,
                'dimensions' => $itemData['dimensions'] ?? null,
                'custom_attributes' => $itemData['custom_attributes'] ?? null,
            ]);

            // Process children recursively
            if (!empty($itemData['children'])) {
                $this->processInventorItems($version, $itemData['children'], $item, $level + 1);
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
            // Create BOM item
            $item = $version->items()->create([
                'parent_item_id' => $parent?->id,
                'item_number' => $itemData['item_number'],
                'name' => $itemData['name'],
                'description' => $itemData['description'] ?? null,
                'item_type' => $this->determineItemType($itemData),
                'quantity' => $itemData['quantity'] ?? 1,
                'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                'level' => $level,
                'sequence_number' => $index + 1,
            ]);

            // Process children recursively
            if (!empty($itemData['children'])) {
                $this->processHierarchyItems($version, $itemData['children'], $item, $level + 1);
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