<?php

namespace App\Http\Controllers;

use App\Models\Certification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class CertificationController extends Controller
{
    /**
     * Display a listing of certifications.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Certification::class);

        $certifications = Certification::query()
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('issuing_organization', 'like', "%{$search}%");
                });
            })
            ->when($request->has('active'), function ($query) use ($request) {
                if ($request->active !== '') {
                    $query->where('active', $request->boolean('active'));
                }
            })
            ->orderBy('name')
            ->paginate(10)
            ->through(function ($certification) {
                return [
                    'id' => $certification->id,
                    'name' => $certification->name,
                    'description' => $certification->description,
                    'issuing_organization' => $certification->issuing_organization,
                    'validity_period_days' => $certification->validity_period_days,
                    'active' => $certification->active,
                    'users_count' => $certification->users()->count(),
                    'created_at' => $certification->created_at->format('d/m/Y H:i'),
                    'updated_at' => $certification->updated_at->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('certifications/index', [
            'certifications' => $certifications,
            'filters' => $request->only(['search', 'active']),
            'can' => [
                'create' => $request->user()->can('create', Certification::class),
            ],
        ]);
    }

    /**
     * Store a newly created certification.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Certification::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:certifications,name',
            'description' => 'nullable|string|max:500',
            'issuing_organization' => 'required|string|max:255',
            'validity_period_days' => 'nullable|integer|min:0',
            'active' => 'boolean',
        ]);

        $validated['active'] = $validated['active'] ?? true;

        Certification::create($validated);

        return redirect()->back()->with('success', 'Certificação criada com sucesso.');
    }

    /**
     * Display the specified certification.
     */
    public function show(Request $request, Certification $certification): Response
    {
        $this->authorize('view', $certification);

        $certification->load(['users' => function ($query) {
            $query->orderBy('name');
        }]);

        return Inertia::render('certifications/show', [
            'certification' => [
                'id' => $certification->id,
                'name' => $certification->name,
                'description' => $certification->description,
                'issuing_organization' => $certification->issuing_organization,
                'validity_period_days' => $certification->validity_period_days,
                'active' => $certification->active,
                'created_at' => $certification->created_at->format('d/m/Y H:i'),
                'updated_at' => $certification->updated_at->format('d/m/Y H:i'),
                'users' => $certification->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'issued_at' => $user->pivot->issued_at ? \Carbon\Carbon::parse($user->pivot->issued_at)->format('d/m/Y') : null,
                        'expires_at' => $user->pivot->expires_at ? \Carbon\Carbon::parse($user->pivot->expires_at)->format('d/m/Y') : null,
                        'certificate_number' => $user->pivot->certificate_number,
                        'is_expired' => $user->pivot->expires_at ? \Carbon\Carbon::parse($user->pivot->expires_at)->isPast() : false,
                    ];
                }),
            ],
            'can' => [
                'update' => $request->user()->can('update', $certification),
                'delete' => $request->user()->can('delete', $certification),
            ],
        ]);
    }

    /**
     * Update the specified certification.
     */
    public function update(Request $request, Certification $certification): RedirectResponse
    {
        $this->authorize('update', $certification);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:certifications,name,' . $certification->id,
            'description' => 'nullable|string|max:500',
            'issuing_organization' => 'required|string|max:255',
            'validity_period_days' => 'nullable|integer|min:0',
            'active' => 'boolean',
        ]);

        $certification->update($validated);

        return redirect()->back()->with('success', 'Certificação atualizada com sucesso.');
    }

    /**
     * Check if the certification can be deleted.
     */
    public function checkDependencies(Certification $certification): \Illuminate\Http\JsonResponse
    {
        $this->authorize('delete', $certification);

        $dependencies = $certification->getDependencies();
        $canDelete = collect($dependencies)->every(fn($dep) => ($dep['count'] ?? 0) === 0);

        return response()->json([
            'canDelete' => $canDelete,
            'dependencies' => $dependencies,
        ]);
    }

    /**
     * Remove the specified certification.
     */
    public function destroy(Certification $certification): RedirectResponse
    {
        $this->authorize('delete', $certification);

        try {
            $certification->delete();
            return redirect()->route('certifications.index')->with('success', 'Certificação excluída com sucesso.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}