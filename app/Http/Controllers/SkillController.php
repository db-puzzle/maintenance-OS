<?php

namespace App\Http\Controllers;

use App\Models\Skill;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class SkillController extends Controller
{
    /**
     * Display a listing of skills.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Skill::class);

        $skills = Skill::query()
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            })
            ->when($request->has('active'), function ($query) use ($request) {
                if ($request->active !== '') {
                    $query->where('active', $request->boolean('active'));
                }
            })
            ->orderBy('category')
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($skill) {
                return [
                    'id' => $skill->id,
                    'name' => $skill->name,
                    'description' => $skill->description,
                    'category' => $skill->category,
                    'active' => $skill->active,
                    'users_count' => $skill->users()->count(),
                    'created_at' => $skill->created_at->format('d/m/Y H:i'),
                    'updated_at' => $skill->updated_at->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('skills/index', [
            'skills' => $skills,
            'filters' => $request->only(['search', 'active']),
            'can' => [
                'create' => $request->user()->can('create', Skill::class),
            ],
        ]);
    }

    /**
     * Store a newly created skill.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Skill::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:skills,name',
            'description' => 'nullable|string|max:500',
            'category' => 'required|string|max:100',
            'active' => 'boolean',
        ]);

        $validated['active'] = $validated['active'] ?? true;

        Skill::create($validated);

        return redirect()->back()->with('success', 'Habilidade criada com sucesso.');
    }

    /**
     * Display the specified skill.
     */
    public function show(Request $request, Skill $skill): Response
    {
        $this->authorize('view', $skill);

        $skill->load(['users' => function ($query) {
            $query->orderBy('name');
        }]);

        return Inertia::render('skills/show', [
            'skill' => [
                'id' => $skill->id,
                'name' => $skill->name,
                'description' => $skill->description,
                'category' => $skill->category,
                'active' => $skill->active,
                'created_at' => $skill->created_at->format('d/m/Y H:i'),
                'updated_at' => $skill->updated_at->format('d/m/Y H:i'),
                'users' => $skill->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'proficiency_level' => $user->pivot->proficiency_level,
                    ];
                }),
            ],
            'can' => [
                'update' => $request->user()->can('update', $skill),
                'delete' => $request->user()->can('delete', $skill),
            ],
        ]);
    }

    /**
     * Update the specified skill.
     */
    public function update(Request $request, Skill $skill): RedirectResponse
    {
        $this->authorize('update', $skill);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:skills,name,' . $skill->id,
            'description' => 'nullable|string|max:500',
            'category' => 'required|string|max:100',
            'active' => 'boolean',
        ]);

        $skill->update($validated);

        return redirect()->back()->with('success', 'Habilidade atualizada com sucesso.');
    }

    /**
     * Check if the skill can be deleted.
     */
    public function checkDependencies(Skill $skill): \Illuminate\Http\JsonResponse
    {
        $this->authorize('delete', $skill);

        $dependencies = $skill->getDependencies();
        $canDelete = collect($dependencies)->every(fn($dep) => ($dep['count'] ?? 0) === 0);

        return response()->json([
            'canDelete' => $canDelete,
            'dependencies' => $dependencies,
        ]);
    }

    /**
     * Remove the specified skill.
     */
    public function destroy(Skill $skill): RedirectResponse
    {
        $this->authorize('delete', $skill);

        try {
            $skill->delete();
            return redirect()->route('skills.index')->with('success', 'Habilidade excluída com sucesso.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}