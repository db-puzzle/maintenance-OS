<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\BaseSearchController;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomItem;
use App\Models\Production\BomVersion;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Services\JsonValidator;
use App\Services\Production\BomImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BillOfMaterialController extends BaseSearchController
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
                return $this->applySearchFilter($query, $search, ['name', 'bom_number']);
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
            ->paginate($request->input('per_page', 10));

        // Load items count for current versions efficiently
        $currentVersionIds = $boms->getCollection()
            ->map(fn ($bom) => $bom->currentVersion?->id)
            ->filter()
            ->unique()
            ->values();

        $itemCounts = BomItem::whereIn('bom_version_id', $currentVersionIds)
            ->groupBy('bom_version_id')
            ->selectRaw('bom_version_id, COUNT(*) as items_count')
            ->pluck('items_count', 'bom_version_id');

        // Add computed fields for frontend
        $boms->getCollection()->transform(function ($bom) use ($itemCounts) {
            $bom->version = $bom->currentVersion ? $bom->currentVersion->version_number : 1;
            $bom->status = $bom->is_active ? 'active' : 'inactive';
            $bom->effective_date = $bom->currentVersion ? $bom->currentVersion->effective_date : null;
            $bom->items_count = $bom->currentVersion ? ($itemCounts[$bom->currentVersion->id] ?? 0) : 0;

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

    public function create()
    {
        $this->authorize('create', BillOfMaterial::class);

        $items = Item::where('can_be_manufactured', true)
            ->where('is_active', true)
            ->with('media')  // Load media for available items
            ->orderBy('item_number')
            ->get(['id', 'item_number', 'name', 'unit_of_measure', 'can_be_manufactured', 'is_active']);

        // Load categories for CreateItemSheet
        $categories = ItemCategory::active()
            ->orderBy('name')
            ->get();

        return Inertia::render('production/bom/show', [
            'items' => $items,
            'categories' => $categories,
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
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'external_reference' => 'nullable|string|max:100',
            'output_item_id' => 'required|exists:items,id', // NEW validation
            'is_active' => 'nullable|boolean',
        ]);

        // Verify the item can be manufactured
        $item = Item::findOrFail($validated['output_item_id']);
        if (! $item->can_be_manufactured) {
            return back()->withErrors(['output_item_id' => 'Selected item cannot be manufactured']);
        }

        $validated['created_by'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        // Generate BOM number automatically
        $validated['bom_number'] = BillOfMaterial::generateBomNumber();

        DB::transaction(function () use ($validated, &$bom) {
            $bom = BillOfMaterial::create($validated);

            // Create initial version
            $version = $bom->createVersion('Initial version', auth()->id());

            // Create root BOM item for the output
            $version->items()->create([
                'item_id' => $bom->output_item_id,
                'parent_item_id' => null,
                'quantity' => 1,
                'unit_of_measure' => $bom->outputItem->unit_of_measure,
                'level' => 0,
                'sequence_number' => 0,
            ]);
        });

        return redirect()->route('production.bom.show', $bom)
            ->with('success', 'BOM created successfully.');
    }

    public function show(BillOfMaterial $bom): Response
    {
        $this->authorize('view', $bom);

        // Load BOM with all necessary relationships efficiently
        $bom->load([
            'createdBy',
            'outputItem',
            'versions' => function ($query) {
                $query->orderBy('version_number', 'desc')->limit(5);
            },
        ]);

        // Add computed counts for tab labels
        $bom->versions_count = $bom->versions->count();

        // Efficiently load current version with all nested items
        if ($bom->currentVersion) {
            // First, get all BOM items for the current version
            $allBomItems = BomItem::where('bom_version_id', $bom->currentVersion->id)
                ->with(['item.category']) // Load item relationship with category
                ->orderBy('level')
                ->orderBy('sequence_number')
                ->get();

            // Group items by parent_item_id for efficient hierarchy building
            $itemsByParent = $allBomItems->groupBy('parent_item_id');

            // Build the hierarchy in memory
            foreach ($allBomItems as $bomItem) {
                $children = $itemsByParent->get($bomItem->id, collect());
                $bomItem->setRelation('children', $children);
            }

            // Set all items on the current version (frontend expects all items, not just root)
            $bom->currentVersion->setRelation('items', $allBomItems);
        }

        // Load available items for BOM configuration
        $items = Item::where('is_active', true)
            ->orderBy('item_number')
            ->get(['id', 'item_number', 'name', 'unit_of_measure', 'can_be_manufactured', 'is_active']);

        // Collect all unique item IDs that need media
        $allItemIds = collect();

        // Add BOM item IDs
        if ($bom->currentVersion && $bom->currentVersion->items) {
            $bomItemIds = $bom->currentVersion->items->pluck('item_id');
            $allItemIds = $allItemIds->merge($bomItemIds);
        }

        // Add available item IDs
        $allItemIds = $allItemIds->merge($items->pluck('id'));

        // Add output item ID
        if ($bom->output_item_id) {
            $allItemIds->push($bom->output_item_id);
        }

        // Get unique IDs
        $uniqueItemIds = $allItemIds->unique()->values();

        // Load all media in a single query
        if ($uniqueItemIds->isNotEmpty()) {
            $media = \Spatie\MediaLibrary\MediaCollections\Models\Media::whereIn('model_id', $uniqueItemIds)
                ->where('model_type', 'App\Models\Production\Item')
                ->get()
                ->groupBy('model_id');

            // Attach media to BOM items
            if ($bom->currentVersion && $bom->currentVersion->items) {
                foreach ($bom->currentVersion->items as $bomItem) {
                    if ($bomItem->item) {
                        $itemMedia = $media->get($bomItem->item->id, collect());
                        $bomItem->item->setRelation('media', $itemMedia);
                    }
                }
            }

            // Attach media to available items
            foreach ($items as $item) {
                $itemMedia = $media->get($item->id, collect());
                $item->setRelation('media', $itemMedia);
            }

            // Attach media to output item if loaded
            if ($bom->outputItem) {
                $outputItemMedia = $media->get($bom->output_item_id, collect());
                $bom->outputItem->setRelation('media', $outputItemMedia);
            }
        }

        // Load categories for CreateItemSheet
        $categories = ItemCategory::active()
            ->orderBy('name')
            ->get();

        return Inertia::render('production/bom/show', [
            'bom' => $bom,
            'items' => $items,
            'categories' => $categories,
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
        if ($bom->manufacturingOrders()->exists()) {
            return back()->with('error', 'BOM cannot be deleted because it has manufacturing orders.');
        }

        $bom->delete();

        return redirect()->route('production.bom.index')
            ->with('success', 'BOM deleted successfully.');
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
            'output_item_id' => $bom->output_item_id, // Copy the same output item
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
        $bom->load(['createdBy']);

        $exportData = [
            'bom_number' => $bom->bom_number,
            'name' => $bom->name,
            'description' => $bom->description,
            'external_reference' => $bom->external_reference,
            'version' => $bom->currentVersion ? $bom->currentVersion->version_number : 1,
            'exported_at' => now()->toIso8601String(),
            'exported_by' => auth()->user()->name,
            'items' => [],
        ];

        if ($bom->currentVersion) {
            // Load all BOM items at once with their items to avoid N+1 queries
            $allItems = BomItem::where('bom_version_id', $bom->currentVersion->id)
                ->with('item')
                ->orderBy('sequence_number')
                ->get();

            // Group items by parent_item_id for efficient hierarchy building
            $itemsByParent = $allItems->groupBy('parent_item_id');

            // Get root items (where parent_item_id is null)
            $rootItems = $itemsByParent->get(null, collect());

            // Attach children to each item recursively
            $this->attachChildren($rootItems, $itemsByParent);

            $exportData['items'] = $this->buildExportHierarchy($rootItems);
        }

        if ($format === 'csv') {
            return $this->exportExcel($bom);
        }

        $jsonContent = json_encode($exportData, JSON_PRETTY_PRINT);

        return response($jsonContent)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="' . $bom->bom_number . '-' . date('Y-m-d') . '.json"');
    }

    /**
     * Recursively attach children to items for efficient hierarchy building.
     */
    private function attachChildren($items, $itemsByParent)
    {
        foreach ($items as $item) {
            $children = $itemsByParent->get($item->id, collect());
            if ($children->isNotEmpty()) {
                // Create a collection-like object that Laravel can work with
                $item->setRelation('children', $children);
                // Recursively attach children to the children
                $this->attachChildren($children, $itemsByParent);
            } else {
                // Set empty collection if no children
                $item->setRelation('children', collect());
            }
        }
    }

    /**
     * Build hierarchical structure for export.
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
            'bom_info' => 'nullable|json',
        ]);

        try {
            DB::beginTransaction();

            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();

            // Get BOM info from request
            $bomInfo = $request->input('bom_info') ? json_decode($request->input('bom_info'), true) : [];

            if ($extension === 'json') {
                // Handle JSON import
                $data = json_decode(file_get_contents($file->getRealPath()), true);

                // Check if this is a native export format
                if (isset($data['bom_number']) && isset($data['items']) && is_array($data['items'])) {
                    // This is our own export format
                    $bom = $this->importService->importFromNativeJson($data, $bomInfo);
                } else {
                    // This is Inventor format
                    $bom = $this->importService->importFromInventor($data);
                }
            } else {
                // Handle CSV import
                $mapping = $request->input('mapping') ? json_decode($request->input('mapping'), true) : [];
                $bom = $this->importService->importFromCsv($file, $mapping, $bomInfo);
            }

            DB::commit();

            return redirect()->route('production.bom.show', $bom)
                ->with('success', 'BOM importada com sucesso.');
        } catch (\Exception $e) {
            DB::rollback();

            return back()->withErrors(['file' => 'Falha na importação: ' . $e->getMessage()]);
        }
    }

    /**
     * Import BOM from Autodesk Inventor.
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
                'redirect' => route('production.bom.show', $bom),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Show import wizard.
     */
    public function importWizard(): Response
    {
        $this->authorize('import', BillOfMaterial::class);

        return Inertia::render('production/bom/import/index', [
            'supportedFormats' => ['csv', 'json'],
        ]);
    }

    /**
     * Add item to BOM.
     */
    public function addItem(Request $request, BillOfMaterial $bom)
    {
        $this->authorize('manageItems', $bom);

        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'parent_item_id' => 'required|exists:bom_items,id', // NOW REQUIRED
            'quantity' => 'required|numeric|min:0.0001',
            'unit_of_measure' => 'required|string|max:20',
            'reference_designators' => 'nullable|string',
            'bom_notes' => 'nullable|array',
            'assembly_instructions' => 'nullable|array',
            'sequence_number' => 'nullable|integer',
        ]);

        $currentVersion = $bom->currentVersion;
        if (! $currentVersion) {
            return back()->with('error', 'BOM has no current version.');
        }

        // Prevent adding items at root level
        if (! $validated['parent_item_id']) {
            return back()->withErrors(['parent_item_id' => 'Items must be added under the root product']);
        }

        // Verify parent belongs to this BOM
        $parent = BomItem::findOrFail($validated['parent_item_id']);
        if ($parent->bomVersion->bill_of_material_id !== $bom->id) {
            return back()->withErrors(['parent_item_id' => 'Parent item does not belong to this BOM']);
        }

        // Determine level based on parent
        $level = $parent->level + 1;

        // Get next sequence number if not provided
        if (! isset($validated['sequence_number'])) {
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
            'assembly_instructions' => $validated['assembly_instructions'] ?? null,
            'sequence_number' => $validated['sequence_number'],
            'level' => $level,
        ]);

        return back()->with('success', 'Item added to BOM successfully.');
    }

    /**
     * Update BOM item.
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
     * Remove item from BOM.
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
     * Move item in BOM hierarchy.
     */
    public function moveItem(Request $request, BillOfMaterial $bom, BomItem $item)
    {
        $this->authorize('manageItems', $bom);

        if ($item->bomVersion->bill_of_material_id !== $bom->id) {
            abort(403, 'Item does not belong to this BOM.');
        }

        $validated = $request->validate([
            'parent_item_id' => 'nullable|exists:bom_items,id',
        ]);

        // Update the parent item
        $item->parent_item_id = $validated['parent_item_id'];

        // Update level based on new parent
        if ($validated['parent_item_id']) {
            $parent = BomItem::find($validated['parent_item_id']);
            $item->level = $parent->level + 1;
        } else {
            $item->level = 0;
        }

        $item->save();

        return back()->with('success', 'Item moved successfully.');
    }

    /**
     * Create new BOM version.
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
     * Set version as current.
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
     * Show BOM comparison.
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

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented',
        ]);
    }

    /**
     * Get BOM cost rollup.
     */
    public function costRollup(BillOfMaterial $bom): JsonResponse
    {
        $this->authorize('view', $bom);

        $currentVersion = $bom->currentVersion;
        if (! $currentVersion) {
            return response()->json(['error' => 'No current version found'], 404);
        }

        // Load all items with their relationships efficiently
        $allItems = BomItem::where('bom_version_id', $currentVersion->id)
            ->with('item')
            ->get();
        $itemsByParent = $allItems->groupBy('parent_item_id');
        $rootItems = $itemsByParent->get(null, collect());
        $this->attachChildren($rootItems, $itemsByParent);

        // Temporarily set the relation for cost calculation
        $currentVersion->setRelation('rootItems', $rootItems);

        $costData = $this->calculateCostRollup($currentVersion);

        return response()->json([
            'bom' => $bom,
            'version' => $currentVersion->version_number,
            'costs' => $costData,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Export BOM to Excel.
     */
    public function exportExcel(BillOfMaterial $bom)
    {
        $this->authorize('view', $bom);

        // This would typically use a package like Laravel Excel
        // For now, we'll implement CSV export
        // Load all items efficiently to avoid N+1 queries
        $allItems = BomItem::where('bom_version_id', $bom->currentVersion->id)
            ->with('item')
            ->get();
        $itemsByParent = $allItems->groupBy('parent_item_id');
        $rootItems = $itemsByParent->get(null, collect());
        $this->attachChildren($rootItems, $itemsByParent);

        // Set the relation for the flattening process
        $bom->currentVersion->setRelation('rootItems', $rootItems);

        $headers = [
            'Level',
            'Item Number',
            'Item Name',
            'Quantity',
            'Unit',
            'Parent',
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
            ->header('Content-Disposition', 'attachment; filename="' . $bom->bom_number . '-' . date('Y-m-d') . '.csv"');
    }

    /**
     * Generate QR codes for BOM items.
     */
    public function generateQrCodes(BillOfMaterial $bom)
    {
        $this->authorize('manageItems', $bom);

        $currentVersion = $bom->currentVersion;
        if (! $currentVersion) {
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
     * Print QR code labels.
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

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented',
        ]);
    }

    /**
     * Compare two BOM versions.
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
            if (! $items1->has($itemId)) {
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
            if (! $items2->has($itemId)) {
                $differences['removed'][] = $item1;
            }
        }

        return $differences;
    }

    /**
     * Check if two BOM items are different.
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
     * Calculate cost rollup for a BOM version.
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
     * Calculate cost for a BOM item including children.
     */
    private function calculateItemCost(BomItem $item): float
    {
        return $item->getTotalCost();
    }

    /**
     * Flatten BOM items for export.
     */
    private function flattenBomItems($items, &$data, $indent = '', $parentItemNumber = '')
    {
        foreach ($items as $item) {
            $data[] = [
                $item->level,
                $indent . $item->item->item_number,
                $item->item->name,
                $item->quantity,
                $item->unit_of_measure,
                $parentItemNumber,
                $item->reference_designators,
                is_array($item->bom_notes) ? json_encode($item->bom_notes) : $item->bom_notes,
            ];

            if ($item->children->isNotEmpty()) {
                $this->flattenBomItems($item->children, $data, $indent . '  ', $item->item->item_number);
            }
        }
    }

    /**
     * Initialize a new BOM import session.
     */
    public function initImportSession(Request $request): JsonResponse
    {
        $this->authorize('import', BillOfMaterial::class);

        $sessionId = Str::uuid()->toString();
        $sessionData = [
            'user_id' => auth()->id(),
            'created_at' => now(),
            'status' => 'initialized',
            'file_info' => null,
            'bom_info' => null,
            'mapping' => null,
            'data' => null,
            'validation' => null,
            'result' => null,
        ];

        Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        return response()->json([
            'sessionId' => $sessionId,
            'expiresAt' => now()->addHours(24)->toIso8601String(),
        ]);
    }

    /**
     * Upload and parse import file.
     */
    public function uploadImportFile(Request $request): JsonResponse
    {
        $this->authorize('import', BillOfMaterial::class);

        $request->validate([
            'sessionId' => 'required|string|uuid',
            'file' => 'required|file|mimes:csv,json,txt|max:10240', // 10MB max
            'bom_info' => 'required|json',
        ]);

        $sessionId = $request->input('sessionId');
        $sessionData = Cache::get("bom_import_session_{$sessionId}");

        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $file = $request->file('file');
        $bomInfo = json_decode($request->input('bom_info'), true);

        // Store file temporarily
        $tempPath = "temp/bom-imports/{$sessionId}/" . $file->getClientOriginalName();
        $fullPath = Storage::disk('local')->putFileAs(
            "temp/bom-imports/{$sessionId}",
            $file,
            $file->getClientOriginalName()
        );

        // Parse file based on type
        $fileType = strtolower($file->getClientOriginalExtension());
        $data = [];
        $headers = [];

        if (in_array($fileType, ['csv', 'txt'])) {
            // Parse CSV file directly here
            $content = file_get_contents($file->getRealPath());
            $lines = explode("\n", $content);
            $headers = str_getcsv(array_shift($lines));

            $data = [];
            foreach ($lines as $line) {
                if (trim($line) === '') {
                    continue;
                }

                $values = str_getcsv($line);
                $row = [];

                foreach ($headers as $index => $header) {
                    $row[$header] = isset($values[$index]) ? $values[$index] : '';
                }

                $data[] = $row;
            }

            if (! empty($data)) {
                $headers = array_keys($data[0]);
            }
        } elseif ($fileType === 'json') {
            $content = file_get_contents($file->getRealPath());

            // Try to clean up common JSON formatting issues
            // Remove BOM if present
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

            // Validate JSON with detailed error information
            $validation = JsonValidator::validate($content);

            if (! $validation['valid']) {
                \Log::error('JSON decode error in BOM import', [
                    'error' => $validation['error'],
                    'file' => $file->getClientOriginalName(),
                    'line' => $validation['line'] ?? null,
                    'column' => $validation['column'] ?? null,
                    'content_preview' => substr($content, 0, 500),
                ]);

                // Build detailed error message
                $errorMessage = 'Arquivo JSON inválido';
                $details = [];

                // Add specific error type
                if (str_contains($validation['error'], 'Syntax error') || str_contains($validation['error'], 'State mismatch')) {
                    $errorMessage = 'Erro de sintaxe no JSON';
                } elseif (str_contains($validation['error'], 'UTF-8')) {
                    $errorMessage = 'Caracteres inválidos no arquivo';
                } elseif (str_contains($validation['error'], 'Control character')) {
                    // Control character errors often indicate unclosed strings
                    $errorMessage = 'Erro de sintaxe no JSON (possível string não fechada)';
                }

                // Add position information
                if (isset($validation['line']) && isset($validation['column'])) {
                    $details[] = sprintf('Erro na linha %d, coluna %d', $validation['line'], $validation['column']);
                }

                // Add context if available
                if (isset($validation['context'])) {
                    $details[] = 'Contexto: ' . $validation['context'];
                }

                // Add generic help
                $details[] = 'Verifique se o arquivo está bem formatado, com aspas duplas corretas, vírgulas nos lugares certos e chaves/colchetes balanceados.';

                return response()->json([
                    'error' => $errorMessage,
                    'details' => implode(' ', $details),
                    'line' => $validation['line'] ?? null,
                    'column' => $validation['column'] ?? null,
                ], 422);
            }

            $data = $validation['data'];

            // Validate JSON structure for BOM
            if (! is_array($data)) {
                return response()->json([
                    'error' => 'Estrutura JSON inválida',
                    'details' => 'O arquivo JSON deve conter um objeto ou array válido.',
                ], 422);
            }
        }

        // Update session
        $sessionData['status'] = 'file_uploaded';
        $sessionData['file_info'] = [
            'original_name' => $file->getClientOriginalName(),
            'type' => $fileType,
            'size' => $file->getSize(),
            'path' => $tempPath,
        ];
        $sessionData['bom_info'] = $bomInfo;
        $sessionData['data'] = $data;

        if (! empty($headers)) {
            $sessionData['csv_headers'] = $headers;
        }

        Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        return response()->json([
            'status' => 'success',
            'fileType' => $fileType,
            'headers' => $headers,
            'rowCount' => is_array($data) ? count($data) : 0,
        ]);
    }

    /**
     * Validate import data - check if all items exist.
     */
    public function validateImportData(Request $request): JsonResponse
    {
        $this->authorize('import', BillOfMaterial::class);

        $request->validate([
            'sessionId' => 'required|string|uuid',
            'mapping' => 'nullable|array', // For CSV only
        ]);

        $sessionId = $request->input('sessionId');
        $mapping = $request->input('mapping', []);

        $sessionData = Cache::get("bom_import_session_{$sessionId}");
        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Store mapping if provided (CSV)
        if (! empty($mapping)) {
            $sessionData['mapping'] = $mapping;
        }

        $fileType = $sessionData['file_info']['type'] ?? '';
        $data = $sessionData['data'] ?? [];

        $validationResult = [
            'total_items' => 0,
            'valid_items' => 0,
            'invalid_items' => 0,
            'missing_items' => [],
            'errors' => [],
        ];

        try {
            if ($fileType === 'json') {
                // First, validate that this is a BOM structure, not an Item import
                if (! $this->isValidBomJsonStructure($data)) {
                    $validationResult['errors'][] = 'Arquivo inválido: Este parece ser um arquivo de importação de Itens, não de BOM. Arquivos de BOM devem ter estrutura hierárquica com componentes.';
                    $sessionData['validation'] = $validationResult;
                    Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

                    return response()->json($validationResult);
                }

                // Validate JSON structure
                $items = $this->extractItemsFromJson($data);
            } else {
                // Validate CSV data
                if (empty($mapping)) {
                    $validationResult['errors'][] = 'Field mapping is required for CSV files';
                    $sessionData['validation'] = $validationResult;
                    Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

                    return response()->json($validationResult);
                }

                $items = $this->extractItemsFromCsv($data, $mapping);

                // For CSV files, check if this looks like an Item import based on mapped fields
                if (! $this->isValidBomCsvMapping($mapping)) {
                    $validationResult['errors'][] = 'Mapeamento inválido: Os campos mapeados parecem ser de uma importação de Itens, não de BOM. Arquivos de BOM devem conter informações de estrutura/hierarquia.';
                    $sessionData['validation'] = $validationResult;
                    Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

                    return response()->json($validationResult);
                }
            }

            // Check each item exists in database
            foreach ($items as $index => $itemData) {
                $validationResult['total_items']++;

                $itemNumber = $itemData['item_number'] ?? null;
                if (! $itemNumber) {
                    $validationResult['invalid_items']++;
                    $validationResult['errors'][] = 'Row ' . ($index + 1) . ': Missing item number';
                    continue;
                }

                $item = Item::where('item_number', $itemNumber)->first();
                if (! $item) {
                    $validationResult['invalid_items']++;
                    $validationResult['missing_items'][] = [
                        'item_number' => $itemNumber,
                        'name' => $itemData['name'] ?? 'Unknown',
                        'row_index' => $index + 1,
                    ];
                } else {
                    $validationResult['valid_items']++;
                }
            }

            // Additional validation
            if ($validationResult['total_items'] === 0) {
                $validationResult['errors'][] = 'No items found in the file';
            }

            // Check for required fields in CSV mapping
            if ($fileType !== 'json' && ! empty($mapping)) {
                $requiredFields = ['item_number', 'name', 'quantity', 'unit_of_measure'];
                $mappedFields = array_values($mapping);
                foreach ($requiredFields as $field) {
                    if (! in_array($field, $mappedFields)) {
                        $validationResult['errors'][] = "Required field '{$field}' is not mapped";
                    }
                }
            }
        } catch (\Exception $e) {
            $validationResult['errors'][] = 'Validation error: ' . $e->getMessage();
        }

        // Update session with validation results
        $sessionData['status'] = 'validated';
        $sessionData['validation'] = $validationResult;
        Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        return response()->json($validationResult);
    }

    /**
     * Process the BOM import (queue background job).
     */
    public function processImport(Request $request): JsonResponse
    {
        $this->authorize('import', BillOfMaterial::class);

        $request->validate([
            'sessionId' => 'required|string|uuid',
        ]);

        $sessionId = $request->input('sessionId');
        $sessionData = Cache::get("bom_import_session_{$sessionId}");

        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Check validation was successful
        $validation = $sessionData['validation'] ?? null;
        if (! $validation || $validation['invalid_items'] > 0 || ! empty($validation['errors'])) {
            return response()->json(['error' => 'Cannot process import with validation errors'], 422);
        }

        // Update status to processing
        $sessionData['status'] = 'processing';
        Cache::put("bom_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        // Queue the import job
        dispatch(new \App\Jobs\Production\ProcessBomImportSession($sessionId));

        return response()->json([
            'status' => 'processing',
            'message' => 'BOM import processing started',
        ]);
    }

    /**
     * Get import session status.
     */
    public function getImportSessionStatus(string $sessionId): JsonResponse
    {
        $this->authorize('import', BillOfMaterial::class);

        $sessionData = Cache::get("bom_import_session_{$sessionId}");
        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        return response()->json($sessionData);
    }

    /**
     * Cancel import session.
     */
    public function cancelImportSession(string $sessionId): JsonResponse
    {
        $this->authorize('import', BillOfMaterial::class);

        $sessionData = Cache::get("bom_import_session_{$sessionId}");
        if (! $sessionData) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Clean up temporary files
        Storage::disk('local')->deleteDirectory("temp/bom-imports/{$sessionId}");
        Cache::forget("bom_import_session_{$sessionId}");

        return response()->json(['message' => 'Import session cancelled']);
    }

    /**
     * Extract items from JSON data.
     */
    private function extractItemsFromJson(array $data): array
    {
        $items = [];

        // Handle native format
        if (isset($data['items'])) {
            $this->extractItemsRecursively($data['items'], $items);
        }
        // Handle array of items (Inventor format)
        elseif (isset($data[0]) && is_array($data[0])) {
            foreach ($data as $item) {
                if (isset($item['item_number'])) {
                    $items[] = $item;
                }
                if (isset($item['children'])) {
                    $this->extractItemsRecursively($item['children'], $items);
                }
            }
        }

        return $items;
    }

    /**
     * Extract items recursively from nested structure.
     */
    private function extractItemsRecursively(array $nestedItems, array &$items): void
    {
        foreach ($nestedItems as $item) {
            if (isset($item['item_number'])) {
                $items[] = $item;
            }
            if (isset($item['children']) && is_array($item['children'])) {
                $this->extractItemsRecursively($item['children'], $items);
            }
        }
    }

    /**
     * Extract items from CSV data using mapping.
     */
    private function extractItemsFromCsv(array $data, array $mapping): array
    {
        $items = [];

        foreach ($data as $row) {
            $item = [];
            foreach ($mapping as $csvHeader => $field) {
                if (isset($row[$csvHeader])) {
                    $item[$field] = $row[$csvHeader];
                }
            }

            if (! empty($item['item_number'])) {
                $items[] = $item;
            }
        }

        return $items;
    }

    /**
     * Validate if the JSON structure is a valid BOM structure (not a flat Item import).
     */
    private function isValidBomJsonStructure(array $data): bool
    {
        // Check if it's a native BOM format with hierarchical structure
        if (isset($data['items']) && is_array($data['items'])) {
            // If any item has children or the structure suggests hierarchy, it's likely a BOM
            foreach ($data['items'] as $item) {
                if (isset($item['children']) || isset($item['level']) || isset($item['parent_item_number'])) {
                    return true;
                }
            }

            // If it's just a flat array of items without any hierarchical indicators, it's likely an Item import
            if (count($data['items']) > 0) {
                $firstItem = $data['items'][0];
                // Check for typical Item export fields that don't appear in BOM exports
                if (isset($firstItem['can_be_sold']) || isset($firstItem['can_be_purchased']) ||
                    isset($firstItem['purchase_price']) || isset($firstItem['track_inventory'])) {
                    return false; // This is an Item import file
                }
            }
        }

        // Check if it's an Inventor format (array at root level)
        if (isset($data[0]) && is_array($data[0])) {
            // Inventor format should have children or hierarchical structure
            foreach ($data as $item) {
                if (isset($item['children']) || isset($item['level'])) {
                    return true;
                }
            }
        }

        // If no hierarchical structure is found, it's not a valid BOM
        return false;
    }

    /**
     * Validate if the CSV mapping looks like a BOM import (not an Item import).
     */
    private function isValidBomCsvMapping(array $mapping): bool
    {
        $mappedFields = array_values($mapping);

        // Fields that indicate this is an Item import, not a BOM import
        $itemOnlyFields = [
            'can_be_sold',
            'can_be_purchased',
            'purchase_price',
            'purchase_lead_time_days',
            'track_inventory',
            'min_stock_level',
            'max_stock_level',
            'reorder_point',
            'preferred_vendor',
            'vendor_item_number',
            'list_price',
            'weight',
            'dimensions',
        ];

        // Check if any Item-only fields are mapped
        foreach ($itemOnlyFields as $field) {
            if (in_array($field, $mappedFields)) {
                return false; // This is likely an Item import
            }
        }

        // BOM imports should have at least item_number and quantity
        if (! in_array('item_number', $mappedFields) || ! in_array('quantity', $mappedFields)) {
            return false;
        }

        return true;
    }
}
