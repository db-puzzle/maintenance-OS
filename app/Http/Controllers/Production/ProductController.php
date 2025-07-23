<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Product;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\ProductBomHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Product::class);

        $products = Product::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('product_number', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->input('status'), function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->input('product_type'), function ($query, $type) {
                $query->where('product_type', $type);
            })
            ->when($request->input('category'), function ($query, $category) {
                $query->where('category', $category);
            })
            ->with(['currentBom', 'createdBy'])
            ->orderBy('product_number')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('production/products/index', [
            'products' => $products,
            'filters' => $request->only(['search', 'status', 'product_type', 'category', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', Product::class),
            ],
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create(): Response
    {
        $this->authorize('create', Product::class);

        return Inertia::render('production/products/create', [
            'categories' => $this->getCategories(),
        ]);
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Product::class);

        $validated = $request->validate([
            'product_number' => 'required|string|max:100|unique:products',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'product_type' => 'required|in:manufactured,purchased,phantom',
            'status' => 'required|in:prototype,active,phasing_out,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'dimensions' => 'nullable|array',
            'dimensions.length' => 'nullable|numeric|min:0',
            'dimensions.width' => 'nullable|numeric|min:0',
            'dimensions.height' => 'nullable|numeric|min:0',
            'dimensions.unit' => 'nullable|string|in:mm,cm,m,in,ft',
            'list_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'lead_time_days' => 'nullable|integer|min:0',
            'tags' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
        ]);

        $product = Product::create(array_merge($validated, [
            'created_by' => $request->user()->id,
        ]));

        return redirect()->route('production.products.show', $product)
            ->with('success', 'Product created successfully.');
    }

    /**
     * Display the specified product.
     */
    public function show(Product $product): Response
    {
        $this->authorize('view', $product);

        $product->load([
            'currentBom.currentVersion',
            'bomHistory.billOfMaterial',
            'bomHistory.approvedBy',
            'productionOrders' => function ($query) {
                $query->latest()->limit(10);
            },
            'createdBy',
        ]);

        return Inertia::render('production/products/show', [
            'product' => $product,
            'can' => [
                'update' => auth()->user()->can('update', $product),
                'delete' => auth()->user()->can('delete', $product),
                'manage_bom' => auth()->user()->can('manageBom', $product),
            ],
        ]);
    }

    /**
     * Show the form for editing the product.
     */
    public function edit(Product $product): Response
    {
        $this->authorize('update', $product);

        return Inertia::render('production/products/edit', [
            'product' => $product,
            'categories' => $this->getCategories(),
        ]);
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, Product $product)
    {
        $this->authorize('update', $product);

        $validated = $request->validate([
            'product_number' => 'required|string|max:100|unique:products,product_number,' . $product->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'product_type' => 'required|in:manufactured,purchased,phantom',
            'status' => 'required|in:prototype,active,phasing_out,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'dimensions' => 'nullable|array',
            'dimensions.length' => 'nullable|numeric|min:0',
            'dimensions.width' => 'nullable|numeric|min:0',
            'dimensions.height' => 'nullable|numeric|min:0',
            'dimensions.unit' => 'nullable|string|in:mm,cm,m,in,ft',
            'list_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'lead_time_days' => 'nullable|integer|min:0',
            'tags' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
        ]);

        $product->update($validated);

        return redirect()->route('production.products.show', $product)
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        // Check if product has active production orders
        if ($product->productionOrders()->active()->exists()) {
            return back()->with('error', 'Cannot delete product with active production orders.');
        }

        $product->delete();

        return redirect()->route('production.products.index')
            ->with('success', 'Product deleted successfully.');
    }

    /**
     * Assign BOM to product.
     */
    public function assignBom(Request $request, Product $product)
    {
        $this->authorize('manageBom', $product);

        $validated = $request->validate([
            'bill_of_material_id' => 'required|exists:bill_of_materials,id',
            'effective_from' => 'required|date',
            'change_reason' => 'nullable|string',
            'change_order_number' => 'nullable|string|max:100',
        ]);

        // End current BOM assignment if exists
        $currentBomHistory = $product->bomHistory()->current()->first();
        if ($currentBomHistory) {
            $currentBomHistory->endEffectivity($validated['effective_from']);
        }

        // Create new BOM history entry
        $bomHistory = ProductBomHistory::create([
            'product_id' => $product->id,
            'bill_of_material_id' => $validated['bill_of_material_id'],
            'effective_from' => $validated['effective_from'],
            'change_reason' => $validated['change_reason'],
            'change_order_number' => $validated['change_order_number'],
            'approved_by' => $request->user()->id,
        ]);

        // Update product's current BOM reference
        $product->update(['current_bom_id' => $validated['bill_of_material_id']]);

        return back()->with('success', 'BOM assigned successfully.');
    }

    /**
     * Get BOM history for product.
     */
    public function bomHistory(Product $product): Response
    {
        $this->authorize('view', $product);

        $history = $product->bomHistory()
            ->with(['billOfMaterial', 'approvedBy'])
            ->orderBy('effective_from', 'desc')
            ->paginate(10);

        return Inertia::render('production/products/bom-history', [
            'product' => $product,
            'history' => $history,
        ]);
    }

    /**
     * Get product categories.
     */
    protected function getCategories(): array
    {
        return Product::distinct()
            ->whereNotNull('category')
            ->pluck('category')
            ->sort()
            ->values()
            ->toArray();
    }
}