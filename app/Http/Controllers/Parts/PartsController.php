<?php

namespace App\Http\Controllers\Parts;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\WorkOrders\WorkOrderPart;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class PartsController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Part::class);

        $query = Part::query()->with('manufacturer');

        // Search functionality
        if ($request->filled('search')) {
            $search = strtolower($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(part_number) like ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(name) like ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(location) like ?', ["%{$search}%"])
                    ->orWhereHas('manufacturer', function ($q) use ($search) {
                        $q->whereRaw('LOWER(name) like ?', ["%{$search}%"]);
                    });
            });
        }

        // Sorting
        $sortField = $request->input('sort_field', 'part_number');
        $sortDirection = $request->input('sort_direction', 'asc');
        $query->orderBy($sortField, $sortDirection);

        // Pagination
        $perPage = $request->input('per_page', 10);
        $parts = $query->paginate($perPage)->withQueryString();

        return Inertia::render('parts/index', [
            'parts' => $parts,
            'filters' => [
                'search' => $request->input('search'),
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create()
    {
        $this->authorize('create', Part::class);

        return Inertia::render('parts/show', [
            'part' => null,
            'isCreating' => true,
            'statistics' => [
                'total_used' => 0,
                'total_reserved' => 0,
                'work_order_count' => 0,
            ],
            'manufacturers' => \App\Models\AssetHierarchy\Manufacturer::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Part::class);

        $validated = $request->validate([
            'part_number' => 'required|string|max:255|unique:parts,part_number',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit_cost' => 'required|numeric|min:0',
            'available_quantity' => 'required|integer|min:0',
            'minimum_quantity' => 'required|integer|min:0',
            'maximum_quantity' => 'nullable|integer|min:0',
            'location' => 'nullable|string|max:255',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'active' => 'boolean',
        ]);

        // Validate maximum quantity
        if (isset($validated['maximum_quantity']) && $validated['maximum_quantity'] < $validated['minimum_quantity']) {
            return back()->withErrors([
                'maximum_quantity' => 'A quantidade máxima deve ser maior que a quantidade mínima.',
            ]);
        }

        $part = Part::create($validated);

        return redirect()->route('parts.show', $part)->with('success', 'Peça criada com sucesso.')
            ->with('partId', $part->id);
    }

    public function show(Part $part)
    {
        $this->authorize('view', $part);

        // Load relationships for the detail view
        $part->load(['workOrderParts.workOrder', 'manufacturer']);

        // Calculate statistics
        $totalUsed = $part->workOrderParts()->sum('used_quantity');
        $totalReserved = $part->workOrderParts()->where('status', 'reserved')->sum('reserved_quantity');

        return Inertia::render('parts/show', [
            'part' => $part,
            'statistics' => [
                'total_used' => $totalUsed,
                'total_reserved' => $totalReserved,
                'work_order_count' => $part->workOrderParts()->distinct('work_order_id')->count(),
            ],
            'manufacturers' => \App\Models\AssetHierarchy\Manufacturer::orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Part $part)
    {
        $this->authorize('update', $part);

        $validated = $request->validate([
            'part_number' => 'required|string|max:255|unique:parts,part_number,' . $part->id,
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit_cost' => 'required|numeric|min:0',
            'available_quantity' => 'required|integer|min:0',
            'minimum_quantity' => 'required|integer|min:0',
            'maximum_quantity' => 'nullable|integer|min:0',
            'location' => 'nullable|string|max:255',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'active' => 'boolean',
        ]);

        // Validate maximum quantity
        if (isset($validated['maximum_quantity']) && $validated['maximum_quantity'] < $validated['minimum_quantity']) {
            return back()->withErrors([
                'maximum_quantity' => 'A quantidade máxima deve ser maior que a quantidade mínima.',
            ]);
        }

        $part->update($validated);

        return redirect()->route('parts.show', $part)->with('success', 'Peça atualizada com sucesso.');
    }

    public function destroy(Part $part)
    {
        $this->authorize('delete', $part);

        // Check for dependencies
        if ($part->workOrderParts()->exists()) {
            return back()->withErrors([
                'error' => 'Esta peça não pode ser excluída pois está sendo utilizada em ordens de serviço.',
            ]);
        }

        $part->delete();

        return redirect()->route('parts.index')->with('success', 'Peça excluída com sucesso.');
    }

    public function checkDependencies(Part $part)
    {
        $this->authorize('delete', $part);

        $workOrderParts = $part->workOrderParts()
            ->with(['workOrder' => function($q) {
                $q->select('id', 'title', 'status');
            }])
            ->take(5)
            ->get();
        
        $totalWorkOrderParts = $part->workOrderParts()->count();
        
        $canDelete = $totalWorkOrderParts === 0;
        
        return response()->json([
            'can_delete' => $canDelete,
            'dependencies' => [
                'work_orders' => [
                    'total' => $totalWorkOrderParts,
                    'items' => $workOrderParts->map(function($wop) {
                        return [
                            'id' => $wop->workOrder->id,
                            'title' => $wop->workOrder->title,
                            'status' => $wop->workOrder->status,
                            'quantity' => $wop->estimated_quantity
                        ];
                    })
                ]
            ]
        ]);
    }

    public function substituteAndDelete(Request $request, Part $part)
    {
        $this->authorize('delete', $part);

        $validated = $request->validate([
            'substitute_part_id' => 'required|exists:parts,id|different:id,' . $part->id,
            'update_mode' => 'required|in:all,selected',
            'selected_work_order_ids' => 'required_if:update_mode,selected|array',
            'selected_work_order_ids.*' => 'exists:work_orders,id'
        ]);
        
        return DB::transaction(function() use ($part, $validated) {
            $substitutePart = Part::findOrFail($validated['substitute_part_id']);
            
            if ($validated['update_mode'] === 'all') {
                // Update all work order parts
                WorkOrderPart::where('part_id', $part->id)
                    ->update([
                        'part_id' => $substitutePart->id,
                        'part_number' => $substitutePart->part_number,
                        'part_name' => $substitutePart->name,
                        'unit_cost' => $substitutePart->unit_cost,
                        'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\nPeça substituída de {$part->part_number} para {$substitutePart->part_number} em ', NOW())")
                    ]);
            } else {
                // Update only selected work orders
                WorkOrderPart::where('part_id', $part->id)
                    ->whereIn('work_order_id', $validated['selected_work_order_ids'])
                    ->update([
                        'part_id' => $substitutePart->id,
                        'part_number' => $substitutePart->part_number,
                        'part_name' => $substitutePart->name,
                        'unit_cost' => $substitutePart->unit_cost,
                        'notes' => DB::raw("CONCAT(COALESCE(notes, ''), '\nPeça substituída de {$part->part_number} para {$substitutePart->part_number} em ', NOW())")
                    ]);
            }
            
            // Check if part can now be deleted
            if ($part->workOrderParts()->count() === 0) {
                $part->delete();
                return response()->json([
                    'success' => true,
                    'message' => 'Peça substituída e excluída com sucesso'
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'message' => 'Peça substituída nos itens selecionados',
                    'remaining_dependencies' => $part->workOrderParts()->count()
                ]);
            }
        });
    }
}