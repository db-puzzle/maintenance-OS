<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\ItemCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemCategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ItemCategory::class);

        $categories = ItemCategory::query()
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->when($request->boolean('active_only'), function ($query) {
                $query->active();
            })
            ->withCount('items')
            ->with('createdBy')
            ->orderBy('name')
            ->paginate($request->input('per_page', 10));

        return Inertia::render('production/categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'active_only', 'per_page']),
            'can' => [
                'create' => $request->user()->can('create', ItemCategory::class),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', ItemCategory::class);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:item_categories',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();
        $category = ItemCategory::create($validated);

        // Check if we should stay on current page (when creating from CreateItemCategorySheet)
        if ($request->boolean('stay')) {
            return back()
                ->with('success', 'Categoria criada com sucesso.');
        }

        return redirect()->route('production.categories.index')
            ->with('success', 'Categoria criada com sucesso.');
    }

    public function update(Request $request, ItemCategory $category)
    {
        $this->authorize('update', $category);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:item_categories,name,' . $category->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        // Check if we should stay on current page (when updating from CreateItemCategorySheet)
        if ($request->boolean('stay')) {
            return back()->with('success', 'Categoria atualizada com sucesso.');
        }

        return redirect()->route('production.categories.index')
            ->with('success', 'Categoria atualizada com sucesso.');
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

    // API endpoint for getting active categories (for selects)
    public function active()
    {
        $categories = ItemCategory::active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($categories);
    }
} 