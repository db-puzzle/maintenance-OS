<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingOrder;
use App\Services\Production\ItemImportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    protected ItemImportService $importService;

    public function __construct(ItemImportService $importService)
    {
        $this->importService = $importService;
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Item::class);

        $items = Item::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('item_number', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->input('category'), function ($query, $category) {
                $query->where('item_category_id', $category);
            })
            ->when($request->input('status'), function ($query, $status) {
                if ($status === 'active') {
                    $query->where('is_active', true);
                } elseif ($status === 'inactive') {
                    $query->where('is_active', false);
                }
            })
            ->when($request->input('type'), function ($query, $type) {
                if ($type === 'sellable') {
                    $query->where('can_be_sold', true);
                } elseif ($type === 'purchasable') {
                    $query->where('can_be_purchased', true);
                } elseif ($type === 'manufacturable') {
                    $query->where('can_be_manufactured', true);
                }
            })
            ->with(['category', 'createdBy', 'primaryImage'])
            ->withCount('images')
            ->orderBy('item_number')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        $categories = ItemCategory::active()->orderBy('name')->get();

        return Inertia::render('production/items/index', [
            'items' => $items,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category', 'status', 'type', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', Item::class),
                'import' => $request->user()->can('import', Item::class),
                'export' => $request->user()->can('export', Item::class),
            ],
        ]);
    }

    public function create()
    {
        $this->authorize('create', Item::class);

        $categories = ItemCategory::active()->orderBy('name')->get();

        return Inertia::render('production/items/show', [
            'categories' => $categories,
            'isCreating' => true,
            'can' => [
                'update' => true, // Allow editing during creation
                'delete' => false,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Item::class);

        $validated = $request->validate([
            'item_number' => 'required|string|max:50|unique:items,item_number',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'is_phantom' => 'boolean',
            'is_active' => 'boolean',
            'unit_of_measure' => 'required|string|max:10',
            'weight' => 'nullable|numeric|min:0',
            'dimensions' => 'nullable|array',
            'list_price' => 'nullable|numeric|min:0',
            'manufacturing_cost' => 'nullable|numeric|min:0',
            'manufacturing_lead_time_days' => 'nullable|integer|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_lead_time_days' => 'nullable|integer|min:0',
            'track_inventory' => 'boolean',
            'min_stock_level' => 'nullable|numeric|min:0',
            'max_stock_level' => 'nullable|numeric|min:0',
            'reorder_point' => 'nullable|numeric|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'active';

        $item = Item::create($validated);

        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item created successfully.');
    }

    public function show(Request $request, Item $item): Response
    {
        $this->authorize('view', $item);

        $item->load(['category', 'createdBy', 'billOfMaterials', 'primaryBom', 'images', 'primaryImage']);

        // Get BOMs where this item is used as a component (where-used analysis)
        $whereUsedBomsQuery = BillOfMaterial::whereHas('currentVersion.items', function ($query) use ($item) {
            $query->where('item_id', $item->id);
        })
        ->with(['outputItem', 'currentVersion']);

        // Apply search filter
        if ($request->filled('bom_search')) {
            $search = $request->get('bom_search');
            $whereUsedBomsQuery->where(function ($query) use ($search) {
                $query->where('bom_number', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%")
                      ->orWhereHas('outputItem', function ($itemQuery) use ($search) {
                          $itemQuery->where('item_number', 'like', "%{$search}%")
                                   ->orWhere('name', 'like', "%{$search}%");
                      });
            });
        }

        // Apply pagination
        $perPage = $request->get('bom_per_page', 10);
        $whereUsedBoms = $whereUsedBomsQuery
            ->orderBy('bom_number')
            ->paginate($perPage, ['*'], 'bom_page')
            ->withQueryString();

        // Get Manufacturing Orders for this item
        $manufacturingOrdersQuery = ManufacturingOrder::where('item_id', $item->id)
            ->with(['billOfMaterial', 'createdBy', 'manufacturingRoute']);

        // Apply search filter for manufacturing orders
        if ($request->filled('mo_search')) {
            $moSearch = $request->get('mo_search');
            $manufacturingOrdersQuery->where(function ($query) use ($moSearch) {
                $query->where('order_number', 'like', "%{$moSearch}%")
                      ->orWhere('status', 'like', "%{$moSearch}%")
                      ->orWhere('source_reference', 'like', "%{$moSearch}%");
            });
        }

        // Apply pagination for manufacturing orders
        $moPerPage = $request->get('mo_per_page', 10);
        $manufacturingOrders = $manufacturingOrdersQuery
            ->orderBy('created_at', 'desc')
            ->paginate($moPerPage, ['*'], 'mo_page')
            ->withQueryString();

        return Inertia::render('production/items/show', [
            'item' => $item,
            'whereUsedBoms' => $whereUsedBoms,
            'bomFilters' => $request->only(['bom_search', 'bom_per_page']),
            'manufacturingOrders' => $manufacturingOrders,
            'moFilters' => $request->only(['mo_search', 'mo_per_page']),
            'can' => [
                'update' => auth()->user()->can('update', $item),
                'delete' => auth()->user()->can('delete', $item),
            ],
        ]);
    }

    public function edit(Item $item)
    {
        $this->authorize('update', $item);

        $categories = ItemCategory::active()->orderBy('name')->get();

        // Method temporarily disabled - page not implemented yet
        return response()->json(["message" => "This feature is not yet implemented"], 501);
    }

    public function update(Request $request, Item $item)
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'item_number' => 'required|string|max:50|unique:items,item_number,' . $item->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'is_phantom' => 'boolean',
            'is_active' => 'boolean',
            'unit_of_measure' => 'required|string|max:10',
            'weight' => 'nullable|numeric|min:0',
            'dimensions' => 'nullable|array',
            'list_price' => 'nullable|numeric|min:0',
            'manufacturing_cost' => 'nullable|numeric|min:0',
            'manufacturing_lead_time_days' => 'nullable|integer|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_lead_time_days' => 'nullable|integer|min:0',
            'track_inventory' => 'boolean',
            'min_stock_level' => 'nullable|numeric|min:0',
            'max_stock_level' => 'nullable|numeric|min:0',
            'reorder_point' => 'nullable|numeric|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
        ]);

        $item->update($validated);

        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item updated successfully.');
    }

    public function destroy(Item $item)
    {
        $this->authorize('delete', $item);

        if (!$item->canBeDeleted()) {
            return back()->withErrors(['error' => 'This item cannot be deleted because it is being used.']);
        }

        $item->delete();

        return redirect()->route('production.items.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Export items to JSON or CSV
     */
    public function export(Request $request)
    {
        $this->authorize('export', Item::class);

        $format = $request->input('format', 'json');
        
        // Get filtered items based on request parameters
        $query = Item::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('item_number', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->input('category'), function ($query, $category) {
                $query->where('item_category_id', $category);
            })
            ->when($request->input('status'), function ($query, $status) {
                if ($status === 'active') {
                    $query->where('is_active', true);
                } elseif ($status === 'inactive') {
                    $query->where('is_active', false);
                }
            })
            ->with(['category', 'createdBy']);

        $items = $query->get();

        if ($format === 'csv') {
            return $this->exportCsv($items);
        }

        return $this->exportJson($items);
    }

    /**
     * Export items as JSON
     */
    protected function exportJson($items)
    {
        $exportData = [
            'exported_at' => now()->toIso8601String(),
            'exported_by' => auth()->user()->name,
            'total_items' => $items->count(),
            'items' => $items->map(function ($item) {
                return [
                    'item_number' => $item->item_number,
                    'name' => $item->name,
                    'description' => $item->description,
                    'category_name' => $item->category?->name,
                    'can_be_sold' => $item->can_be_sold,
                    'can_be_purchased' => $item->can_be_purchased,
                    'can_be_manufactured' => $item->can_be_manufactured,
                    'is_phantom' => $item->is_phantom,
                    'is_active' => $item->is_active,
                    'status' => $item->status,
                    'unit_of_measure' => $item->unit_of_measure,
                    'weight' => $item->weight,
                    'dimensions' => $item->dimensions,
                    'list_price' => $item->list_price,
                    'manufacturing_cost' => $item->manufacturing_cost,
                    'manufacturing_lead_time_days' => $item->manufacturing_lead_time_days,
                    'purchase_price' => $item->purchase_price,
                    'purchase_lead_time_days' => $item->purchase_lead_time_days,
                    'track_inventory' => $item->track_inventory,
                    'min_stock_level' => $item->min_stock_level,
                    'max_stock_level' => $item->max_stock_level,
                    'reorder_point' => $item->reorder_point,
                    'preferred_vendor' => $item->preferred_vendor,
                    'vendor_item_number' => $item->vendor_item_number,
                    'tags' => $item->tags,
                    'custom_attributes' => $item->custom_attributes,
                ];
            })
        ];

        $jsonContent = json_encode($exportData, JSON_PRETTY_PRINT);
        
        return response($jsonContent)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="items-' . date('Y-m-d') . '.json"');
    }

    /**
     * Export items as CSV
     */
    protected function exportCsv($items)
    {
        $headers = [
            'Item Number',
            'Name',
            'Description',
            'Category',
            'Unit of Measure',
            'Can Be Sold',
            'Can Be Purchased',
            'Can Be Manufactured',
            'Is Phantom',
            'Is Active',
            'Status',
            'Weight',
            'List Price',
            'Manufacturing Cost',
            'Manufacturing Lead Time (Days)',
            'Purchase Price',
            'Purchase Lead Time (Days)',
            'Track Inventory',
            'Min Stock Level',
            'Max Stock Level',
            'Reorder Point',
            'Preferred Vendor',
            'Vendor Item Number',
            'Tags',
        ];

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, $headers);
        
        foreach ($items as $item) {
            fputcsv($csv, [
                $item->item_number,
                $item->name,
                $item->description,
                $item->category?->name,
                $item->unit_of_measure,
                $item->can_be_sold ? 'Yes' : 'No',
                $item->can_be_purchased ? 'Yes' : 'No',
                $item->can_be_manufactured ? 'Yes' : 'No',
                $item->is_phantom ? 'Yes' : 'No',
                $item->is_active ? 'Yes' : 'No',
                $item->status,
                $item->weight,
                $item->list_price,
                $item->manufacturing_cost,
                $item->manufacturing_lead_time_days,
                $item->purchase_price,
                $item->purchase_lead_time_days,
                $item->track_inventory ? 'Yes' : 'No',
                $item->min_stock_level,
                $item->max_stock_level,
                $item->reorder_point,
                $item->preferred_vendor,
                $item->vendor_item_number,
                is_array($item->tags) ? implode(', ', $item->tags) : '',
            ]);
        }
        
        rewind($csv);
        $output = stream_get_contents($csv);
        fclose($csv);

        return response($output)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="items-' . date('Y-m-d') . '.csv"');
    }

    /**
     * Show import wizard
     */
    public function importWizard(): Response
    {
        $this->authorize('import', Item::class);

        $categories = ItemCategory::active()->orderBy('name')->get();

        return Inertia::render('production/items/import', [
            'categories' => $categories,
            'supportedFormats' => ['csv', 'txt', 'json'],
            'csvHeaders' => [
                'item_number' => 'Item Number',
                'name' => 'Name',
                'description' => 'Description',
                'category_name' => 'Category',
                'unit_of_measure' => 'Unit of Measure',
                'can_be_sold' => 'Can Be Sold',
                'can_be_purchased' => 'Can Be Purchased',
                'can_be_manufactured' => 'Can Be Manufactured',
                'weight' => 'Weight',
                'list_price' => 'List Price',
                'purchase_price' => 'Purchase Price',
            ],
        ]);
    }

    /**
     * Import items from file
     */
    public function import(Request $request)
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,json',
            'mapping' => 'nullable|array',
        ]);

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            
            if ($extension === 'json') {
                // Handle JSON import
                $data = json_decode(file_get_contents($file->getRealPath()), true);
                $result = $this->importService->importFromNativeJson($data);
            } else {
                // Handle CSV import
                $mapping = $request->input('mapping') ? json_decode($request->input('mapping'), true) : [];
                $result = $this->importService->importFromCsv($file, $mapping);
            }
            
            if (count($result['errors']) > 0) {
                return back()->with('warning', "Imported {$result['count']} items with " . count($result['errors']) . " errors.")
                    ->withErrors($result['errors']);
            }
            
            return redirect()->route('production.items.index')
                ->with('success', "Successfully imported {$result['count']} items.");
                
        } catch (\Exception $e) {
            return back()->withErrors(['file' => 'Import failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Get item with images (API endpoint for carousel)
     */
    public function getWithImages(Item $item): JsonResponse
    {
        $this->authorize('view', $item);
        
        $item->load(['images', 'primaryImage']);
        
        return response()->json([
            'item' => $item
        ]);
    }
} 