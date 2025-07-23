<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomItem;
use App\Services\Production\BomImportService;
use App\Services\Production\RoutingInheritanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BomController extends Controller
{
    protected BomImportService $importService;
    protected RoutingInheritanceService $routingService;

    public function __construct(
        BomImportService $importService,
        RoutingInheritanceService $routingService
    ) {
        $this->importService = $importService;
        $this->routingService = $routingService;
    }

    /**
     * Display a listing of BOMs.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BillOfMaterial::class);

        $boms = BillOfMaterial::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('bom_number', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%")
                      ->orWhere('external_reference', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->with(['currentVersion', 'createdBy'])
            ->withCount('versions')
            ->orderBy('bom_number')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/bom/index', [
            'boms' => $boms,
            'filters' => $request->only(['search', 'is_active', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', BillOfMaterial::class),
                'import' => $request->user()->can('import', BillOfMaterial::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new BOM.
     */
    public function create(): Response
    {
        $this->authorize('create', BillOfMaterial::class);

        return Inertia::render('production/bom/create');
    }

    /**
     * Store a newly created BOM.
     */
    public function store(Request $request)
    {
        $this->authorize('create', BillOfMaterial::class);

        $validated = $request->validate([
            'bom_number' => 'nullable|string|max:100|unique:bill_of_materials',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'external_reference' => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated) {
            // Generate BOM number if not provided
            if (empty($validated['bom_number'])) {
                $validated['bom_number'] = $this->generateBomNumber();
            }

            $bom = BillOfMaterial::create(array_merge($validated, [
                'is_active' => true,
                'created_by' => auth()->id(),
            ]));

            // Create initial version
            $bom->versions()->create([
                'version_number' => 1,
                'revision_notes' => 'Initial version',
                'published_at' => now(),
                'published_by' => auth()->id(),
                'is_current' => true,
            ]);
        });

        return redirect()->route('production.bom.index')
            ->with('success', 'BOM created successfully.');
    }

    /**
     * Display the specified BOM.
     */
    public function show(BillOfMaterial $bom): Response
    {
        $this->authorize('view', $bom);

        $bom->load([
            'versions' => function ($query) {
                $query->orderBy('version_number', 'desc');
            },
            'currentVersion.items' => function ($query) {
                $query->orderBy('level')->orderBy('sequence_number');
            },
            'createdBy',
        ]);

        // Build hierarchy tree
        $hierarchy = $this->buildHierarchyTree($bom->currentVersion?->items ?? collect());

        return Inertia::render('production/bom/show', [
            'bom' => $bom,
            'hierarchy' => $hierarchy,
            'can' => [
                'update' => auth()->user()->can('update', $bom),
                'delete' => auth()->user()->can('delete', $bom),
                'manage_items' => auth()->user()->can('manageItems', $bom),
            ],
        ]);
    }

    /**
     * Show the form for editing the BOM.
     */
    public function edit(BillOfMaterial $bom): Response
    {
        $this->authorize('update', $bom);

        return Inertia::render('production/bom/edit', [
            'bom' => $bom,
        ]);
    }

    /**
     * Update the specified BOM.
     */
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

    /**
     * Remove the specified BOM.
     */
    public function destroy(BillOfMaterial $bom)
    {
        $this->authorize('delete', $bom);

        // Check if BOM is used by any products
        if ($bom->products()->exists()) {
            return back()->with('error', 'Cannot delete BOM that is assigned to products.');
        }

        // Check if BOM is used in any production orders
        if ($bom->productionOrders()->exists()) {
            return back()->with('error', 'Cannot delete BOM that is used in production orders.');
        }

        $bom->delete();

        return redirect()->route('production.bom.index')
            ->with('success', 'BOM deleted successfully.');
    }

    /**
     * Import BOM from Inventor.
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
                'message' => 'BOM imported successfully.',
                'bom_id' => $bom->id,
                'redirect' => route('production.bom.show', $bom),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Import BOM from CSV.
     */
    public function importCsv(Request $request)
    {
        $this->authorize('import', BillOfMaterial::class);

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'mapping' => 'nullable|array',
        ]);

        try {
            $bom = $this->importService->importFromCsv(
                $request->file('file'),
                $request->input('mapping', [])
            );
            
            return response()->json([
                'success' => true,
                'message' => 'BOM imported successfully.',
                'bom_id' => $bom->id,
                'redirect' => route('production.bom.show', $bom),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get BOM hierarchy.
     */
    public function hierarchy(BillOfMaterial $bom): Response
    {
        $this->authorize('view', $bom);

        $bom->load([
            'currentVersion.items' => function ($query) {
                $query->with('routing')
                    ->orderBy('level')
                    ->orderBy('sequence_number');
            },
        ]);

        return Inertia::render('production/bom/hierarchy', [
            'bom' => $bom,
            'items' => $bom->currentVersion?->items ?? collect(),
            'missingRouting' => $this->routingService->validateBomRouting($bom->currentVersion?->id),
        ]);
    }

    /**
     * Add item to BOM.
     */
    public function addItem(Request $request, BillOfMaterial $bom)
    {
        $this->authorize('manageItems', $bom);

        $validated = $request->validate([
            'parent_item_id' => 'nullable|exists:bom_items,id',
            'item_number' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_type' => 'required|in:part,assembly,subassembly',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_of_measure' => 'required|string|max:20',
            'material' => 'nullable|string|max:100',
            'weight' => 'nullable|numeric|min:0',
            'dimensions' => 'nullable|array',
        ]);

        $currentVersion = $bom->currentVersion;
        if (!$currentVersion) {
            return back()->with('error', 'BOM has no current version.');
        }

        // Determine level based on parent
        $level = 0;
        if ($validated['parent_item_id']) {
            $parent = BomItem::find($validated['parent_item_id']);
            $level = $parent->level + 1;
        }

        // Get next sequence number
        $maxSequence = $currentVersion->items()
            ->where('parent_item_id', $validated['parent_item_id'])
            ->max('sequence_number') ?? 0;

        $item = $currentVersion->items()->create(array_merge($validated, [
            'level' => $level,
            'sequence_number' => $maxSequence + 1,
        ]));

        return back()->with('success', 'Item added to BOM successfully.');
    }

    /**
     * Build hierarchy tree from items.
     */
    protected function buildHierarchyTree($items)
    {
        $itemsById = $items->keyBy('id');
        $tree = [];

        foreach ($items as $item) {
            if ($item->parent_item_id === null) {
                $tree[] = $this->buildNode($item, $itemsById);
            }
        }

        return $tree;
    }

    /**
     * Build node for hierarchy tree.
     */
    protected function buildNode($item, $itemsById)
    {
        $node = $item->toArray();
        $node['children'] = [];

        foreach ($itemsById as $child) {
            if ($child->parent_item_id === $item->id) {
                $node['children'][] = $this->buildNode($child, $itemsById);
            }
        }

        return $node;
    }

    /**
     * Generate BOM number.
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
}