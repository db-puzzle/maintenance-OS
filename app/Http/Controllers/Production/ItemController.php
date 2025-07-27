<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
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
            ->with(['currentBom', 'createdBy'])
            ->paginate($request->input('per_page', 10));

        return Inertia::render('production/items/index', [
            'items' => $items,
            'filters' => $request->only(['search', 'type', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', Item::class),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Item::class);

        return Inertia::render('production/items/show', [
            'isCreating' => true,
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
            'category' => 'nullable|string|max:100',
            'item_type' => 'required|in:manufactured,purchased,phantom,service',
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'status' => 'required|in:active,inactive,prototype,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'list_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'lead_time_days' => 'nullable|integer|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
        ]);

        $validated['created_by'] = auth()->id();
        $item = Item::create($validated);

        // Check if we should stay on current page (e.g., when creating from BOM)
        // Check for 'stay' parameter or AJAX request (from Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', 'Item criado com sucesso.');
        }

        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item created successfully.');
    }

    public function show(Item $item): Response
    {
        $this->authorize('view', $item);

        $item->load([
            'currentBom.currentVersion',
            'bomHistory.billOfMaterial',
            'createdBy',
        ]);

        // Get where this item is used
        $whereUsed = BomItem::where('item_id', $item->id)
            ->with(['bomVersion.billOfMaterial', 'bomVersion' => function ($query) {
                $query->where('is_current', true);
            }])
            ->get()
            ->filter(fn($bomItem) => $bomItem->bomVersion !== null);

        return Inertia::render('production/items/show', [
            'item' => $item,
            'whereUsed' => $whereUsed,
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
            'category' => 'nullable|string|max:100',
            'item_type' => 'required|in:manufactured,purchased,phantom,service',
            'can_be_sold' => 'boolean',
            'can_be_purchased' => 'boolean',
            'can_be_manufactured' => 'boolean',
            'status' => 'required|in:active,inactive,prototype,discontinued',
            'unit_of_measure' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'list_price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'lead_time_days' => 'nullable|integer|min:0',
            'preferred_vendor' => 'nullable|string|max:255',
            'vendor_item_number' => 'nullable|string|max:100',
        ]);

        $item->update($validated);

        return redirect()->route('production.items.show', $item)
            ->with('success', 'Item updated successfully.');
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