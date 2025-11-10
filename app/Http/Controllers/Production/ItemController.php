<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\BaseSearchController;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingOrder;
use App\Services\JsonValidator;
use App\Services\Production\ItemImageBulkImportService;
use App\Services\Production\ItemImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends BaseSearchController
{
    protected ItemImportService $importService;
    protected ItemImageBulkImportService $imageBulkImportService;

    public function __construct(ItemImportService $importService, ItemImageBulkImportService $imageBulkImportService)
    {
        $this->importService = $importService;
        $this->imageBulkImportService = $imageBulkImportService;
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Item::class);

        // Define sortable columns
        $sortableColumns = [
            'item_number' => 'item_number',
            'name' => 'name',
            'category' => 'item_category_id',
            'status' => 'status',
            'capabilities' => 'capabilities', // This will need custom sorting logic
            'primary_bom' => 'primary_bom', // This will need custom sorting logic
            'route_template' => 'route_template', // This will need custom sorting logic
        ];

        // Get sort parameters
        $sortBy = $request->input('sort_by', 'item_number');
        $sortDirection = $request->input('sort_direction', 'asc');

        // Validate sort column
        $sortColumn = $sortableColumns[$sortBy] ?? 'item_number';

        $query = Item::query()
            ->when($request->input('search'), function ($query, $search) {
                return $this->applySearchFilter($query, $search, ['name', 'item_number', 'description']);
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
            ->with(['category' => function ($query) {
                $query->withCount(['routeTemplates' => function ($q) {
                    $q->where('is_active', true);
                }]);
            }, 'createdBy', 'primaryBom', 'media']);

        // Apply custom sorting logic
        if ($sortBy === 'capabilities') {
            // Sort by capabilities (combination of can_be_sold, can_be_manufactured, can_be_purchased)
            // This will sort by the number of capabilities in descending order by default
            // PostgreSQL-compatible: cast boolean to integer
            $query->orderByRaw("(CAST(can_be_sold AS INTEGER) + CAST(can_be_manufactured AS INTEGER) + CAST(can_be_purchased AS INTEGER)) $sortDirection");
        } elseif ($sortBy === 'primary_bom') {
            // Sort by whether item has a primary BOM (and can be manufactured)
            // Items with BOM and can_be_manufactured = true will be sorted first/last based on direction
            // We need to use a subquery to check if a BOM exists for this item
            $query->orderByRaw("
                CASE 
                    WHEN can_be_manufactured = true AND EXISTS (
                        SELECT 1 FROM bill_of_materials 
                        WHERE output_item_id = items.id 
                        AND is_active = true
                    ) THEN 1 
                    ELSE 0 
                END $sortDirection
            ");
        } elseif ($sortBy === 'route_template') {
            // Sort by whether item's category has route templates
            // We need to join with categories and check if they have active route templates
            $query->leftJoin('item_categories', 'items.item_category_id', '=', 'item_categories.id')
                ->orderByRaw("
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM manufacturing_routes 
                            WHERE manufacturing_routes.item_category_id = item_categories.id 
                            AND manufacturing_routes.is_template = true
                            AND manufacturing_routes.is_active = true
                        ) THEN 1 
                        ELSE 0 
                    END $sortDirection
                ")
                ->select('items.*'); // Ensure we only select items columns
        } else {
            // Default sorting
            $query->orderBy($sortColumn, $sortDirection);
        }

        $items = $query->paginate($request->input('per_page', 10))
            ->withQueryString();

        $categories = ItemCategory::active()->orderBy('name')->get()->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'items_count' => $category->items_count ?? 0,
                'has_route_template' => $category->hasRouteTemplate(),
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
            ];
        });

        return Inertia::render('production/items/index', [
            'items' => $items,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category', 'status', 'type', 'per_page', 'sort_by', 'sort_direction']),
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

        $categories = ItemCategory::active()->orderBy('name')->get()->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'items_count' => $category->items_count ?? 0,
                'has_route_template' => $category->hasRouteTemplate(),
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
            ];
        });

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

        $item->load(['category', 'createdBy', 'billOfMaterials', 'primaryBom', 'media']);

        // Get BOMs where this item is used as a component (where-used analysis)
        $whereUsedBomsQuery = BillOfMaterial::whereHas('items', function ($query) use ($item) {
            $query->where('item_id', $item->id);
        })
            ->with(['outputItem', 'items']);

        // Apply search filter
        if ($request->filled('bom_search')) {
            $search = $request->get('bom_search');
            $searchConfig = [
                'bom_number',
                'name',
                [
                    'relation' => 'outputItem',
                    'columns' => ['item_number', 'name'],
                ],
            ];
            $whereUsedBomsQuery = $this->applySearchFilter($whereUsedBomsQuery, $search, $searchConfig);
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
            $manufacturingOrdersQuery = $this->applySearchFilter(
                $manufacturingOrdersQuery,
                $moSearch,
                ['order_number', 'status', 'source_reference']
            );
        }

        // Apply pagination for manufacturing orders
        $moPerPage = $request->get('mo_per_page', 10);
        $manufacturingOrders = $manufacturingOrdersQuery
            ->orderBy('created_at', 'desc')
            ->paginate($moPerPage, ['*'], 'mo_page')
            ->withQueryString();

        // Load categories for the form
        $categories = ItemCategory::active()->orderBy('name')->get()->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'items_count' => $category->items_count ?? 0,
                'has_route_template' => $category->hasRouteTemplate(),
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
            ];
        });

        return Inertia::render('production/items/show', [
            'item' => $item->load(['media']),
            'categories' => $categories,
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

        $categories = ItemCategory::active()->orderBy('name')->get()->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'items_count' => $category->items_count ?? 0,
                'has_route_template' => $category->hasRouteTemplate(),
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
            ];
        });

        // Method temporarily disabled - page not implemented yet
        return Inertia::render('error/not-implemented', [
            'status' => 501,
            'message' => 'This feature is not yet implemented',
        ]);
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

        if (! $item->canBeDeleted()) {
            return back()->withErrors(['error' => 'This item cannot be deleted because it is being used.']);
        }

        $item->delete();

        return redirect()->route('production.items.index')
            ->with('success', 'Item deleted successfully.');
    }

    /**
     * Export items to JSON or CSV.
     */
    public function export(Request $request)
    {
        $this->authorize('export', Item::class);

        $format = $request->input('format', 'json');

        // Get filtered items based on request parameters
        $query = Item::query()
            ->when($request->input('search'), function ($query, $search) {
                return $this->applySearchFilter($query, $search, ['name', 'item_number', 'description']);
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
     * Export items as JSON.
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
            }),
        ];

        $jsonContent = json_encode($exportData, JSON_PRETTY_PRINT);

        return response($jsonContent)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="items-' . date('Y-m-d') . '.json"');
    }

    /**
     * Export items as CSV.
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
     * Show import wizard.
     */
    public function importWizard(): Response
    {
        $this->authorize('import', Item::class);

        return Inertia::render('production/items/import/index', [
            'supportedFormats' => ['csv', 'json'],
        ]);
    }

    /**
     * Import items from file.
     */
    public function import(Request $request)
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,json',
            'mapping' => 'nullable|array',
            'update_existing' => 'boolean',
            // Optional pictures manifest for combined flow (phase 1: ignored here)
            'pictures_manifest' => 'nullable',
            'picture_files' => 'nullable|array',
            'picture_files.*' => 'file|image|mimes:jpg,jpeg,png,webp,heic|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();

            $updateExisting = $request->input('update_existing', true);

            if ($extension === 'json') {
                // Handle JSON import
                $content = file_get_contents($file->getRealPath());

                // Remove BOM if present
                $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

                // Validate JSON with detailed error information
                $validation = JsonValidator::validate($content);

                if (! $validation['valid']) {
                    \Log::error('JSON decode error in Item import', [
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

                // Validate that this is an Item import file, not a BOM
                if (! $this->isValidItemJsonStructure($data)) {
                    return response()->json([
                        'error' => 'Arquivo inválido',
                        'details' => 'Este parece ser um arquivo de importação de BOM, não de Itens. Arquivos de importação de Itens devem conter uma lista plana de itens.',
                    ], 422);
                }

                $result = $this->importService->importFromNativeJson($data, $updateExisting);
            } else {
                // Handle CSV import
                $mapping = $request->input('mapping', []);
                // Handle both array (from Inertia) and JSON string formats
                if (is_string($mapping)) {
                    $mapping = json_decode($mapping, true) ?? [];
                }

                // Validate that this is an Item import mapping, not a BOM
                if (! $this->isValidItemCsvMapping($mapping)) {
                    return response()->json([
                        'error' => 'Mapeamento inválido',
                        'details' => 'Os campos mapeados parecem ser de uma importação de BOM, não de Itens. Arquivos de BOM contêm informações de estrutura/hierarquia que não são suportadas na importação de Itens.',
                    ], 422);
                }

                $result = $this->importService->importFromCsv($file, $mapping, $updateExisting);
            }

            // Prepare result data for the new UI
            $importResult = [
                'imported' => $result['count'],
                'updated' => $result['updated_count'] ?? 0,
                'skipped' => $result['skipped'] ?? 0,
                'failed' => count($result['errors']),
                'errors' => $result['errors'],
            ];

            // Handle errors
            if (count($result['errors']) > 0) {
                $message = "Imported {$result['count']} items with " . count($result['errors']) . ' errors.';
                if (isset($result['skipped']) && $result['skipped'] > 0) {
                    $message .= " {$result['skipped']} items were skipped (already exist).";
                }

                return back()->with('warning', $message)
                    ->with('flash', ['result' => $importResult])
                    ->withErrors($result['errors']);
            }

            // Combined flow: attach pictures if provided
            $picturesManifestJson = $request->input('pictures_manifest');
            if ($picturesManifestJson) {
                $manifest = json_decode($picturesManifestJson, true);
                if (is_array($manifest)) {
                    $summary = $this->imageBulkImportService->importFromManifest('item_number', $manifest, $request->file('picture_files', []));
                    if (count($summary['errors']) > 0) {
                        // If this is an Inertia request from the import wizard, return to the same page
                        if ($request->header('X-Inertia')) {
                            return back()
                                ->with('success', "Successfully imported {$result['count']} items and {$summary['imagesImported']} image(s).")
                                ->with('warning', 'Some images could not be imported.')
                                ->with('flash', ['result' => $importResult])
                                ->with('imageImportSummary', $summary);
                        }

                        return redirect()->route('production.items.index')
                            ->with('success', "Successfully imported {$result['count']} items and {$summary['imagesImported']} image(s).")
                            ->with('warning', 'Some images could not be imported.')
                            ->with('flash', ['result' => $importResult])
                            ->with('imageImportSummary', $summary);
                    }
                    $message = "Successfully imported {$result['count']} items and {$summary['imagesImported']} image(s).";
                    if (isset($result['skipped']) && $result['skipped'] > 0) {
                        $message .= " {$result['skipped']} items were skipped (already exist).";
                    }

                    // If this is an Inertia request from the import wizard, return to the same page
                    if ($request->header('X-Inertia')) {
                        return back()
                            ->with('success', $message)
                            ->with('flash', ['result' => $importResult]);
                    }

                    return redirect()->route('production.items.index')
                        ->with('success', $message)
                        ->with('flash', ['result' => $importResult]);
                }
            }

            $message = "Successfully imported {$result['count']} items.";
            if (isset($result['skipped']) && $result['skipped'] > 0) {
                $message .= " {$result['skipped']} items were skipped (already exist).";
            }

            // If this is an Inertia request from the import wizard, return to the same page
            // so the wizard can show the results step
            if ($request->header('X-Inertia')) {
                return back()
                    ->with('success', $message)
                    ->with('flash', ['result' => $importResult]);
            }

            // Otherwise, redirect to the items index (for backward compatibility)
            return redirect()->route('production.items.index')
                ->with('success', $message)
                ->with('flash', ['result' => $importResult]);
        } catch (\Exception $e) {
            return back()->withErrors(['file' => 'Import failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Get item with images (API endpoint for carousel).
     */
    public function getWithImages(Item $item): JsonResponse
    {
        $this->authorize('view', $item);

        $item->load(['media']);

        return response()->json([
            'item' => $item,
        ]);
    }

    /**
     * Check for existing items by item numbers.
     */
    public function checkExistingItems(Request $request): JsonResponse
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'item_numbers' => 'required|array',
            'item_numbers.*' => 'string',
        ]);

        $itemNumbers = $request->input('item_numbers');

        // Get existing items with their current data
        $existingItems = Item::whereIn('item_number', $itemNumbers)
            ->with(['category', 'createdBy'])
            ->get()
            ->map(function ($item) {
                return [
                    'item_number' => $item->item_number,
                    'name' => $item->name,
                    'description' => $item->description,
                    'category_name' => $item->category?->name,
                    'unit_of_measure' => $item->unit_of_measure,
                    'is_active' => $item->is_active,
                    'can_be_sold' => $item->can_be_sold,
                    'can_be_purchased' => $item->can_be_purchased,
                    'can_be_manufactured' => $item->can_be_manufactured,
                    'updated_at' => $item->updated_at,
                    'created_by' => $item->createdBy?->name,
                ];
            });

        return response()->json([
            'existing_items' => $existingItems,
            'total_existing' => $existingItems->count(),
        ]);
    }

    /**
     * Validate if the JSON structure is a valid Item import (not a BOM).
     */
    private function isValidItemJsonStructure(array $data): bool
    {
        // Check if it's a valid Item export structure
        if (isset($data['items']) && is_array($data['items'])) {
            // Check if any item has BOM-specific fields that indicate hierarchy
            foreach ($data['items'] as $item) {
                if (isset($item['children']) || isset($item['level']) || isset($item['parent_item_number'])) {
                    return false; // This is a BOM file
                }
            }

            // If we have items array, it should be a flat structure
            return true;
        }

        // Check if it's an array at root level (could be Inventor BOM format)
        if (isset($data[0]) && is_array($data[0])) {
            // Check for BOM hierarchical indicators
            foreach ($data as $item) {
                if (isset($item['children']) || isset($item['level'])) {
                    return false; // This is a BOM file
                }
            }

            // For array format, we should have Item-specific fields
            if (count($data) > 0) {
                $firstItem = $data[0];
                // Look for typical Item fields
                if (isset($firstItem['item_number']) &&
                    (isset($firstItem['can_be_sold']) ||
                     isset($firstItem['can_be_purchased']) ||
                     isset($firstItem['track_inventory']))) {
                    return true; // This looks like an Item import
                }
            }
        }

        // Check for BOM-specific root structure
        if (isset($data['bom_number']) || isset($data['output_item_id'])) {
            return false; // This is definitely a BOM file
        }

        // Default to true if we can't determine (let the import service handle it)
        return true;
    }

    /**
     * Validate if the CSV mapping is for Item import (not a BOM).
     */
    private function isValidItemCsvMapping(array $mapping): bool
    {
        $mappedFields = array_values($mapping);

        // Fields that indicate this is a BOM import, not an Item import
        $bomOnlyFields = [
            'parent_item_number',
            'parent_item_id',
            'level',
            'sequence_number',
            'position',
            'reference_designator',
            'bom_quantity', // Different from regular quantity
            'assembly_quantity',
        ];

        // Check if any BOM-only fields are mapped
        foreach ($bomOnlyFields as $field) {
            if (in_array($field, $mappedFields)) {
                return false; // This is likely a BOM import
            }
        }

        // Item imports must have at least item_number and name
        if (! in_array('item_number', $mappedFields) || ! in_array('name', $mappedFields)) {
            return false;
        }

        return true;
    }
}
