<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomVersion;
use App\Models\Production\BomItem;
use App\Models\Production\Item;
use App\Services\Production\BomImportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BillOfMaterialController extends Controller
{
    protected BomImportService $importService;

    public function __construct(BomImportService $importService)
    {
        $this->importService = $importService;
    }
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BillOfMaterial::class);

        $boms = BillOfMaterial::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('bom_number', 'like', "%{$search}%");
            })
            ->when($request->input('status'), function ($query, $status) {
                if ($status === 'active') {
                    $query->where('is_active', true);
                } elseif ($status === 'inactive') {
                    $query->where('is_active', false);
                }
            })
            ->with(['currentVersion', 'createdBy'])
            ->withCount(['versions' => function ($query) {
                $query->where('is_current', false);
            }])
            ->withCount(['itemMasters'])
            ->paginate($request->input('per_page', 10));

        // Add computed fields for frontend
        $boms->getCollection()->transform(function ($bom) {
            $bom->version = $bom->currentVersion ? $bom->currentVersion->version_number : 1;
            $bom->status = $bom->is_active ? 'active' : 'inactive';
            $bom->effective_date = $bom->currentVersion ? $bom->currentVersion->effective_date : null;
            $bom->items = $bom->currentVersion ? $bom->currentVersion->items : collect();
            return $bom;
        });

        return Inertia::render('production/bom/index', [
            'boms' => $boms,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', BillOfMaterial::class),
                'import' => $request->user()->can('import', BillOfMaterial::class),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', BillOfMaterial::class);

        $items = Item::where('can_be_manufactured', true)
            ->where('is_active', true)
            ->orderBy('item_number')
            ->get(['id', 'item_number', 'name']);

        return Inertia::render('production/bom/show', [
            'items' => $items,
            'isCreating' => true,
            'can' => [
                'update' => false,
                'delete' => false,
                'manageItems' => false,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', BillOfMaterial::class);

        $validated = $request->validate([
            'bom_number' => 'required|string|max:100|unique:bill_of_materials',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'external_reference' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();
        $bom = BillOfMaterial::create($validated);

        // Create initial version
        $bom->createVersion('Initial version', auth()->id());

        return redirect()->route('production.bom.show', $bom)
            ->with('success', 'BOM created successfully.');
    }

    public function show(BillOfMaterial $bom): Response
    {
        $this->authorize('view', $bom);

        $bom->load([
            'currentVersion.items.item',
            'versions' => function ($query) {
                $query->orderBy('version_number', 'desc')->limit(5);
            },
            'createdBy',
            'itemMasters'
        ]);

        // Add computed counts for tab labels
        $bom->versions_count = $bom->versions->count();
        $bom->item_masters_count = $bom->itemMasters->count();

        return Inertia::render('production/bom/show', [
            'bom' => $bom,
            'isCreating' => false,
            'can' => [
                'update' => auth()->user()->can('update', $bom),
                'delete' => auth()->user()->can('delete', $bom),
                'manageItems' => auth()->user()->can('manageItems', $bom),
            ],
        ]);
    }

    public function update(Request $request, BillOfMaterial $bom)
    {
        $this->authorize('update', $bom);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'external_reference' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        $bom->update($validated);

        return redirect()->route('production.bom.show', $bom)
            ->with('success', 'BOM updated successfully.');
    }

    public function destroy(BillOfMaterial $bom)
    {
        $this->authorize('delete', $bom);

        // Check if BOM can be deleted
        if ($bom->itemMasters()->exists()) {
            return back()->with('error', 'BOM cannot be deleted because it is assigned to items.');
        }

        if ($bom->productionOrders()->exists()) {
            return back()->with('error', 'BOM cannot be deleted because it is used in production orders.');
        }

        $bom->delete();

        return redirect()->route('production.bom.index')
            ->with('success', 'BOM deleted successfully.');
    }

    public function hierarchy(BillOfMaterial $bom)
    {
        $this->authorize('view', $bom);

        $bom->load('currentVersion.items.item');

        // Build hierarchy tree
        $hierarchy = $this->buildHierarchy($bom);

        return Inertia::render('production/bom/hierarchy', [
            'bom' => $bom,
            'hierarchy' => $hierarchy,
        ]);
    }

    public function duplicate(BillOfMaterial $bom)
    {
        $this->authorize('create', BillOfMaterial::class);

        // Generate new BOM number
        $baseBomNumber = $bom->bom_number;
        $counter = 1;
        $newBomNumber = $baseBomNumber . '-COPY';
        
        while (BillOfMaterial::where('bom_number', $newBomNumber)->exists()) {
            $counter++;
            $newBomNumber = $baseBomNumber . '-COPY-' . $counter;
        }

        // Create duplicate BOM
        $newBom = BillOfMaterial::create([
            'bom_number' => $newBomNumber,
            'name' => $bom->name . ' (Copy)',
            'description' => $bom->description,
            'external_reference' => $bom->external_reference,
            'is_active' => false, // Start as inactive
            'created_by' => auth()->id(),
        ]);

        // Create initial version and copy items if current version exists
        $newVersion = $newBom->createVersion('Copied from BOM: ' . $bom->bom_number, auth()->id());
        
        if ($bom->currentVersion && $bom->currentVersion->items) {
            foreach ($bom->currentVersion->items as $item) {
                BomItem::create([
                    'bom_version_id' => $newVersion->id,
                    'item_id' => $item->item_id,
                    'quantity' => $item->quantity,
                    'unit_of_measure' => $item->unit_of_measure,
                    'reference_designators' => $item->reference_designators,
                    'bom_notes' => $item->bom_notes,
                    'sequence_number' => $item->sequence_number,
                    'level' => $item->level,
                    'parent_item_id' => $item->parent_item_id,
                ]);
            }
        }

        return redirect()->route('production.bom.show', $newBom)
            ->with('success', 'BOM duplicated successfully.');
    }

    public function export(BillOfMaterial $bom, Request $request)
    {
        $this->authorize('view', $bom);

        $format = $request->input('format', 'json');
        
        // Load necessary relationships
        $bom->load([
            'currentVersion.items' => function ($query) {
                $query->with('item')->orderBy('level')->orderBy('sequence_number');
            },
            'createdBy'
        ]);

        $exportData = [
            'bom_number' => $bom->bom_number,
            'name' => $bom->name,
            'description' => $bom->description,
            'external_reference' => $bom->external_reference,
            'version' => $bom->currentVersion ? $bom->currentVersion->version_number : 1,
            'exported_at' => now()->toIso8601String(),
            'exported_by' => auth()->user()->name,
            'items' => []
        ];

        if ($bom->currentVersion) {
            // Build hierarchical structure for export
            $exportData['items'] = $this->buildExportHierarchy($bom->currentVersion->rootItems);
        }

        if ($format === 'csv') {
            return $this->exportExcel($bom);
        }

        return response()->json($exportData, 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="' . $bom->bom_number . '.json"'
        ]);
    }

    /**
     * Build hierarchical structure for export
     */
    private function buildExportHierarchy($items): array
    {
        $result = [];
        
        foreach ($items as $item) {
            $exportItem = [
                'level' => $item->level,
                'item_number' => $item->item->item_number,
                'item_name' => $item->item->name,
                'quantity' => $item->quantity,
                'unit_of_measure' => $item->unit_of_measure,
                'reference_designators' => $item->reference_designators,
                'bom_notes' => $item->bom_notes,
                'sequence_number' => $item->sequence_number,
            ];
            
            if ($item->children->isNotEmpty()) {
                $exportItem['children'] = $this->buildExportHierarchy($item->children);
            }
            
            $result[] = $exportItem;
        }
        
        return $result;
    }

    public function import(Request $request)
    {
        $this->authorize('import', BillOfMaterial::class);

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,json',
            'mapping' => 'nullable|array',
        ]);

        try {
            DB::beginTransaction();
            
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            
            if ($extension === 'json') {
                // Handle Inventor JSON import
                $data = json_decode(file_get_contents($file->getRealPath()), true);
                $bom = $this->importService->importFromInventor($data);
            } else {
                // Handle CSV import
                $mapping = $request->input('mapping', []);
                $bom = $this->importService->importFromCsv($file, $mapping);
            }
            
            DB::commit();
            
            return redirect()->route('production.bom.show', $bom)
                ->with('success', 'BOM imported successfully.');
                
        } catch (\Exception $e) {
            DB::rollback();
            return back()->with('error', 'Import failed: ' . $e->getMessage());
        }
    }

    /**
     * Import BOM from Autodesk Inventor
     */
    public function importInventor(Request $request)
    {
        $this->authorize('import', BillOfMaterial::class);

        $request->validate([
            'data' => 'required|array',
            'data.name' => 'required|string',
            'data.items' => 'required|array|min:1',
        ]);

        try {
            $bom = $this->importService->importFromInventor($request->input('data'));
            
            return response()->json([
                'success' => true,
                'bom' => $bom->load('currentVersion.items'),
                'redirect' => route('production.bom.show', $bom)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Show import wizard
     */
    public function importWizard(): Response
    {
        $this->authorize('import', BillOfMaterial::class);

        return Inertia::render('production/bom/import', [
            'supportedFormats' => ['csv', 'txt', 'json'],
            'csvHeaders' => [
                'item_number' => 'Item Number',
                'name' => 'Name',
                'description' => 'Description',
                'quantity' => 'Quantity',
                'unit_of_measure' => 'Unit of Measure',
                'level' => 'Level',
                'parent' => 'Parent Item',
            ],
        ]);
    }

    /**
     * Build hierarchy tree for BOM visualization
     */
    private function buildHierarchy(BillOfMaterial $bom, $level = 0, $visited = [])
    {
        if (in_array($bom->id, $visited) || $level > 10) {
            return null; // Prevent infinite recursion
        }

        $visited[] = $bom->id;
        $hierarchy = [
            'id' => $bom->id,
            'bom_number' => $bom->bom_number,
            'name' => $bom->name,
            'level' => $level,
            'children' => [],
        ];

        if ($bom->currentVersion && $bom->currentVersion->items) {
            foreach ($bom->currentVersion->items as $bomItem) {
                $item = $bomItem->item;
                $childBom = $item->currentBom;
                
                $child = [
                    'id' => $item->id,
                    'type' => 'item',
                    'item_number' => $item->item_number,
                    'name' => $item->name,
                    'quantity' => $bomItem->quantity,
                    'unit_of_measure' => $bomItem->unit_of_measure,
                    'level' => $level + 1,
                    'children' => [],
                ];

                if ($childBom && !in_array($childBom->id, $visited)) {
                    $childHierarchy = $this->buildHierarchy($childBom, $level + 2, $visited);
                    if ($childHierarchy) {
                        $child['children'][] = $childHierarchy;
                    }
                }

                $hierarchy['children'][] = $child;
            }
        }

        return $hierarchy;
    }

    /**
     * Add item to BOM
     */
    public function addItem(Request $request, BillOfMaterial $bom)
    {
        $this->authorize('manageItems', $bom);

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'parent_item_id' => 'nullable|exists:bom_items,id',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_of_measure' => 'required|string|max:20',
            'reference_designators' => 'nullable|string',
            'bom_notes' => 'nullable|array',
            'sequence_number' => 'nullable|integer',
        ]);

        $currentVersion = $bom->currentVersion;
        if (!$currentVersion) {
            return back()->with('error', 'BOM has no current version.');
        }

        // Determine level
        $level = 0;
        if ($validated['parent_item_id']) {
            $parent = BomItem::find($validated['parent_item_id']);
            $level = $parent->level + 1;
        }

        // Get next sequence number if not provided
        if (!isset($validated['sequence_number'])) {
            $validated['sequence_number'] = $currentVersion->items()
                ->where('parent_item_id', $validated['parent_item_id'])
                ->max('sequence_number') + 10;
        }

        $bomItem = $currentVersion->items()->create([
            'item_id' => $validated['item_id'],
            'parent_item_id' => $validated['parent_item_id'],
            'quantity' => $validated['quantity'],
            'unit_of_measure' => $validated['unit_of_measure'],
            'reference_designators' => $validated['reference_designators'] ?? null,
            'bom_notes' => $validated['bom_notes'] ?? null,
            'sequence_number' => $validated['sequence_number'],
            'level' => $level,
        ]);

        return back()->with('success', 'Item added to BOM successfully.');
    }

    /**
     * Update BOM item
     */
    public function updateItem(Request $request, BillOfMaterial $bom, BomItem $item)
    {
        $this->authorize('manageItems', $bom);

        if ($item->bomVersion->bill_of_material_id !== $bom->id) {
            abort(403, 'Item does not belong to this BOM.');
        }

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.0001',
            'unit_of_measure' => 'required|string|max:20',
            'reference_designators' => 'nullable|string',
            'bom_notes' => 'nullable|array',
            'sequence_number' => 'nullable|integer',
        ]);

        $item->update($validated);

        return back()->with('success', 'BOM item updated successfully.');
    }

    /**
     * Remove item from BOM
     */
    public function removeItem(BillOfMaterial $bom, BomItem $item)
    {
        $this->authorize('manageItems', $bom);

        if ($item->bomVersion->bill_of_material_id !== $bom->id) {
            abort(403, 'Item does not belong to this BOM.');
        }

        // Check if item has children
        if ($item->children()->exists()) {
            return back()->with('error', 'Cannot remove item that has child items.');
        }

        $item->delete();

        return back()->with('success', 'Item removed from BOM successfully.');
    }

    /**
     * Create new BOM version
     */
    public function createVersion(Request $request, BillOfMaterial $bom)
    {
        $this->authorize('update', $bom);

        $validated = $request->validate([
            'revision_notes' => 'required|string',
            'copy_from_version' => 'nullable|exists:bom_versions,id',
        ]);

        DB::transaction(function () use ($bom, $validated) {
            $newVersion = $bom->createVersion($validated['revision_notes']);

            // Copy items from previous version if requested
            if ($validated['copy_from_version']) {
                $sourceVersion = BomVersion::findOrFail($validated['copy_from_version']);
                
                if ($sourceVersion->bill_of_material_id !== $bom->id) {
                    throw new \Exception('Source version does not belong to this BOM.');
                }

                // Clone the version
                $sourceVersion->cloneToNewVersion($newVersion->version_number, auth()->id());
            }

            // Set as current version
            $bom->setCurrentVersion($newVersion);
        });

        return back()->with('success', 'New BOM version created successfully.');
    }

    /**
     * Set version as current
     */
    public function setCurrentVersion(BillOfMaterial $bom, BomVersion $version)
    {
        $this->authorize('update', $bom);

        if ($version->bill_of_material_id !== $bom->id) {
            abort(403, 'Version does not belong to this BOM.');
        }

        $bom->setCurrentVersion($version);

        return back()->with('success', 'BOM version set as current successfully.');
    }

    /**
     * Show BOM comparison
     */
    public function compare(Request $request, BillOfMaterial $bom): Response
    {
        $this->authorize('view', $bom);

        $request->validate([
            'version1' => 'required|exists:bom_versions,id',
            'version2' => 'required|exists:bom_versions,id',
        ]);

        $version1 = BomVersion::with('items.item')->findOrFail($request->version1);
        $version2 = BomVersion::with('items.item')->findOrFail($request->version2);

        // Ensure both versions belong to this BOM
        if ($version1->bill_of_material_id !== $bom->id || $version2->bill_of_material_id !== $bom->id) {
            abort(403, 'Versions do not belong to this BOM.');
        }

        return Inertia::render('production/bom/compare', [
            'bom' => $bom,
            'version1' => $version1,
            'version2' => $version2,
            'differences' => $this->compareVersions($version1, $version2),
        ]);
    }

    /**
     * Get BOM cost rollup
     */
    public function costRollup(BillOfMaterial $bom): JsonResponse
    {
        $this->authorize('view', $bom);

        $currentVersion = $bom->currentVersion;
        if (!$currentVersion) {
            return response()->json(['error' => 'No current version found'], 404);
        }

        $costData = $this->calculateCostRollup($currentVersion);

        return response()->json([
            'bom' => $bom,
            'version' => $currentVersion->version_number,
            'costs' => $costData,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Export BOM to Excel
     */
    public function exportExcel(BillOfMaterial $bom)
    {
        $this->authorize('view', $bom);

        // This would typically use a package like Laravel Excel
        // For now, we'll implement CSV export
        $bom->load('currentVersion.items.item');

        $headers = [
            'Level',
            'Item Number',
            'Item Name',
            'Quantity',
            'Unit',
            'Reference Designators',
            'Notes',
        ];

        $data = [];
        $this->flattenBomItems($bom->currentVersion->rootItems, $data);

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, $headers);
        
        foreach ($data as $row) {
            fputcsv($csv, $row);
        }
        
        rewind($csv);
        $output = stream_get_contents($csv);
        fclose($csv);

        return response($output)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $bom->bom_number . '.csv"');
    }

    /**
     * Generate QR codes for BOM items
     */
    public function generateQrCodes(BillOfMaterial $bom)
    {
        $this->authorize('manageItems', $bom);

        $currentVersion = $bom->currentVersion;
        if (!$currentVersion) {
            return back()->with('error', 'No current version found.');
        }

        $itemsWithoutQr = $currentVersion->items()->whereNull('qr_code')->get();
        
        if ($itemsWithoutQr->isEmpty()) {
            return back()->with('info', 'All items already have QR codes.');
        }

        // Queue job to generate QR codes
        dispatch(new \App\Jobs\Production\GenerateQrCodes($itemsWithoutQr->pluck('id')->toArray()));

        return back()->with('success', 'QR code generation queued for ' . $itemsWithoutQr->count() . ' items.');
    }

    /**
     * Print QR code labels
     */
    public function printLabels(Request $request, BillOfMaterial $bom)
    {
        $this->authorize('view', $bom);

        $validated = $request->validate([
            'item_ids' => 'required|array',
            'item_ids.*' => 'exists:bom_items,id',
            'format' => 'required|in:avery5160,avery5163,zebra',
        ]);

        $items = BomItem::with('item')
            ->whereIn('id', $validated['item_ids'])
            ->whereHas('bomVersion', function ($query) use ($bom) {
                $query->where('bill_of_material_id', $bom->id);
            })
            ->get();

        return Inertia::render('production/bom/print-labels', [
            'bom' => $bom,
            'items' => $items,
            'format' => $validated['format'],
        ]);
    }

    /**
     * Compare two BOM versions
     */
    private function compareVersions(BomVersion $version1, BomVersion $version2): array
    {
        $items1 = $version1->items->keyBy('item_id');
        $items2 = $version2->items->keyBy('item_id');

        $differences = [
            'added' => [],
            'removed' => [],
            'modified' => [],
        ];

        // Find added and modified items
        foreach ($items2 as $itemId => $item2) {
            if (!$items1->has($itemId)) {
                $differences['added'][] = $item2;
            } else {
                $item1 = $items1->get($itemId);
                if ($this->itemsAreDifferent($item1, $item2)) {
                    $differences['modified'][] = [
                        'old' => $item1,
                        'new' => $item2,
                    ];
                }
            }
        }

        // Find removed items
        foreach ($items1 as $itemId => $item1) {
            if (!$items2->has($itemId)) {
                $differences['removed'][] = $item1;
            }
        }

        return $differences;
    }

    /**
     * Check if two BOM items are different
     */
    private function itemsAreDifferent(BomItem $item1, BomItem $item2): bool
    {
        $compareFields = ['quantity', 'unit_of_measure', 'parent_item_id', 'level'];
        
        foreach ($compareFields as $field) {
            if ($item1->$field != $item2->$field) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Calculate cost rollup for a BOM version
     */
    private function calculateCostRollup(BomVersion $version): array
    {
        $totalCost = 0;
        $itemCosts = [];

        foreach ($version->rootItems as $rootItem) {
            $itemCost = $this->calculateItemCost($rootItem);
            $itemCosts[] = [
                'item' => $rootItem->item,
                'quantity' => $rootItem->quantity,
                'unit_cost' => $rootItem->item->cost ?? 0,
                'total_cost' => $itemCost,
            ];
            $totalCost += $itemCost;
        }

        return [
            'total_cost' => $totalCost,
            'items' => $itemCosts,
        ];
    }

    /**
     * Calculate cost for a BOM item including children
     */
    private function calculateItemCost(BomItem $item): float
    {
        return $item->getTotalCost();
    }

    /**
     * Flatten BOM items for export
     */
    private function flattenBomItems($items, &$data, $indent = '')
    {
        foreach ($items as $item) {
            $data[] = [
                $item->level,
                $indent . $item->item->item_number,
                $item->item->name,
                $item->quantity,
                $item->unit_of_measure,
                $item->reference_designators,
                is_array($item->bom_notes) ? json_encode($item->bom_notes) : $item->bom_notes,
            ];

            if ($item->children->isNotEmpty()) {
                $this->flattenBomItems($item->children, $data, $indent . '  ');
            }
        }
    }
} 