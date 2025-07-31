<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\ItemCategory;
use App\Models\Production\BillOfMaterial;
use App\Models\Production\BomItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Item::class);

        $items = Item::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('item_number', 'like', "%{$search}%");
            })
            ->when($request->input('type'), function ($query, $type) {
                switch ($type) {
                    case 'sellable':
                        $query->sellable();
                        break;
                    case 'manufacturable':
                        $query->manufacturable();
                        break;
                    case 'purchasable':
                        $query->purchasable();
                        break;
                }
            })
            ->with(['primaryBom', 'createdBy', 'category'])
            ->paginate($request->input('per_page', 10));

        // Load categories for the index page
        $categories = ItemCategory::active()
            ->orderBy('name')
            ->get();

        return Inertia::render('production/items/index', [
            'items' => $items,
            'filters' => $request->only(['search', 'type', 'per_page']),
            'categories' => $categories,
            'can' => [
                'create' => $request->user()->can('create', Item::class),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Item::class);

        // Load categories for the create page
        $categories = ItemCategory::active()
            ->orderBy('name')
            ->get();

        return Inertia::render('production/items/show', [
            'isCreating' => true,
            'categories' => $categories,
            'can' => [
                'update' => false,
                'delete' => false,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Item::class);

        $validated = $request->validate([
            'item_number' => 'required|string|max:100|unique:items',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            // 'item_type' => 'required|in:manufactured,purchased,phantom,service', // DEPRECATED
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'is_phantom' => 'boolean',
            'status' => 'required|in:active,inactive,prototype,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'list_price' => 'nullable|numeric|min:0',
            'manufacturing_cost' => 'nullable|numeric|min:0',
            'manufacturing_lead_time_days' => 'nullable|integer|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_lead_time_days' => 'nullable|integer|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
        ]);

        $validated['created_by'] = auth()->id();
        $item = Item::create($validated);

        // Check if we should stay on current page (when creating from CreateItemSheet)
        // BaseEntitySheet adds 'stay' => true to the request
        if ($request->boolean('stay')) {
            return back()->with('success', 'Item criado com sucesso.');
        }

        // Otherwise redirect to the item show page (when creating from show.tsx)
        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item criado com sucesso.');
    }

    public function show(Item $item): Response
    {
        $this->authorize('view', $item);

        $item->load([
            'primaryBom.currentVersion',
            'bomHistory.billOfMaterial',
            'createdBy',
            'category',
        ]);

        // Get where this item is used
        $whereUsed = BomItem::where('item_id', $item->id)
            ->with(['bomVersion.billOfMaterial', 'bomVersion' => function ($query) {
                $query->where('is_current', true);
            }])
            ->get()
            ->filter(fn($bomItem) => $bomItem->bomVersion !== null);

        // Load categories for the show page
        $categories = ItemCategory::active()
            ->orderBy('name')
            ->get();

        return Inertia::render('production/items/show', [
            'item' => $item,
            'whereUsed' => $whereUsed,
            'categories' => $categories,
            'isCreating' => false,
            'can' => [
                'update' => auth()->user()->can('update', $item),
                'delete' => auth()->user()->can('delete', $item),
                'manageBom' => auth()->user()->can('manageBom', $item),
            ],
        ]);
    }

    public function update(Request $request, Item $item)
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_category_id' => 'nullable|exists:item_categories,id',
            // 'item_type' => 'required|in:manufactured,purchased,phantom,service', // DEPRECATED
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'is_phantom' => 'boolean',
            'status' => 'required|in:active,inactive,prototype,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'list_price' => 'nullable|numeric|min:0',
            'manufacturing_cost' => 'nullable|numeric|min:0',
            'manufacturing_lead_time_days' => 'nullable|integer|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_lead_time_days' => 'nullable|integer|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
        ]);

        $item->update($validated);

        // Check if we should stay on current page (when updating from CreateItemSheet)
        // BaseEntitySheet adds 'stay' => true to the request
        if ($request->boolean('stay')) {
            return back()->with('success', 'Item atualizado com sucesso.');
        }

        // Otherwise redirect to the item show page (when updating from show.tsx)
        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item atualizado com sucesso.');
    }

    public function destroy(Item $item)
    {
        $this->authorize('delete', $item);

        if (!$item->canBeDeleted()) {
            return back()->with('error', 'Item cannot be deleted because it is used in active BOMs or has open production orders.');
        }

        $item->delete();

        return redirect()->route('production.items.index')
            ->with('success', 'Item deleted successfully.');
    }

    public function assignBom(Request $request, Item $item)
    {
        $this->authorize('manageBom', $item);

        $validated = $request->validate([
            'bill_of_material_id' => 'required|exists:bill_of_materials,id',
            'change_reason' => 'nullable|string',
            'change_order_number' => 'nullable|string|max:100',
        ]);

        $bom = BillOfMaterial::findOrFail($validated['bill_of_material_id']);
        
        $item->updateBom($bom, [
            'reason' => $validated['change_reason'],
            'change_order' => $validated['change_order_number'],
        ]);

        return back()->with('success', 'BOM assigned successfully.');
    }

    public function bomHistory(Item $item)
    {
        $this->authorize('view', $item);

        $history = $item->bomHistory()
            ->with(['billOfMaterial', 'approvedBy'])
            ->orderBy('effective_from', 'desc')
            ->get();

        return response()->json(['history' => $history]);
    }
} 