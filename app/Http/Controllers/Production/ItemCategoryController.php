<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\ItemCategoryRequest;
use App\Models\Production\ItemCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ItemCategory::class);

        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');
        $sort = $request->input('sort', 'name');
        $direction = $request->input('direction', 'asc');

        $query = ItemCategory::query()
            ->withCount('items')
            ->with('createdBy');

        if ($search) {
            $search = strtolower($search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$search}%"]);
            });
        }

        // Handle sorting
        switch ($sort) {
            case 'items_count':
                $query->orderBy('items_count', $direction);
                break;
            case 'created_by':
                $query->leftJoin('users', 'item_categories.created_by', '=', 'users.id')
                    ->orderBy('users.name', $direction)
                    ->select('item_categories.*');
                break;
            case 'is_active':
                $query->orderBy('is_active', $direction);
                break;
            default:
                $query->orderBy($sort, $direction);
        }

        $categories = $query->paginate($perPage)->withQueryString();

        return Inertia::render('production/item-categories/index', [
            'categories' => $categories,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function show(Request $request, ItemCategory $category): Response
    {
        $this->authorize('view', $category);

        // Pagination parameters for items
        $itemsPerPage = $request->input('items_per_page', 10);
        $itemsSort = $request->input('items_sort', 'name');
        $itemsDirection = $request->input('items_direction', 'asc');

        // Get items with pagination
        $itemsQuery = $category->items()
            ->with(['unit', 'category']);

        // Handle sorting for items
        switch ($itemsSort) {
            case 'code':
                $itemsQuery->orderBy('code', $itemsDirection);
                break;
            case 'unit':
                $itemsQuery->leftJoin('units', 'items.unit_id', '=', 'units.id')
                    ->orderBy('units.name', $itemsDirection)
                    ->select('items.*');
                break;
            case 'is_active':
                $itemsQuery->orderBy('is_active', $itemsDirection);
                break;
            default:
                $itemsQuery->orderBy($itemsSort, $itemsDirection);
        }

        $items = $itemsQuery->paginate($itemsPerPage, ['*'], 'items_page')->withQueryString();

        return Inertia::render('production/item-categories/show', [
            'category' => $category->load('createdBy'),
            'items' => $items,
            'filters' => [
                'items' => [
                    'sort' => $itemsSort,
                    'direction' => $itemsDirection,
                ],
            ],
            'activeTab' => $request->input('tab', 'informacoes'),
        ]);
    }

    public function store(ItemCategoryRequest $request)
    {
        $this->authorize('create', ItemCategory::class);

        $validated = $request->validated();
        $validated['created_by'] = auth()->id();
        
        $category = ItemCategory::create($validated);

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Categoria {$category->name} criada com sucesso.")
                ->with('created_category_id', $category->id);
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('production.categories.index')
            ->with('success', "Categoria {$category->name} criada com sucesso.");
    }

    public function update(ItemCategoryRequest $request, ItemCategory $category)
    {
        $this->authorize('update', $category);

        $category->update($request->validated());

        // Se a requisição contém o parâmetro 'stay' (indica que é via Sheet/Modal)
        if ($request->has('stay') || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return back()->with('success', "Categoria {$category->name} atualizada com sucesso.");
        }

        // Comportamento padrão para requisições normais (formulário completo)
        return redirect()->route('production.categories.show', $category)
            ->with('success', "Categoria {$category->name} atualizada com sucesso.");
    }

    public function destroy(ItemCategory $category)
    {
        $this->authorize('delete', $category);

        if (!$category->canBeDeleted()) {
            return back()->with('error', 'Categoria não pode ser excluída pois possui itens vinculados.');
        }

        $category->delete();

        return redirect()->route('production.categories.index')
            ->with('success', 'Categoria excluída com sucesso.');
    }

    public function checkDependencies(ItemCategory $category)
    {
        $this->authorize('delete', $category);

        $items = $category->items()
            ->select('id', 'name', 'code')
            ->limit(10)
            ->get();

        return response()->json([
            'has_dependencies' => !$category->canBeDeleted(),
            'dependencies' => [
                'items' => [
                    'count' => $category->items()->count(),
                    'items' => $items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->name . ' (' . $item->code . ')',
                        ];
                    }),
                    'label' => 'Itens',
                ],
            ],
        ]);
    }
} 