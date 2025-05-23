<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\Form;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;

class FormController extends Controller
{
    /**
     * Display a listing of all forms.
     */
    public function index()
    {
        $forms = Form::with('creator')->where('is_active', true)->get();
        
        return Inertia::render('Forms/Index', [
            'forms' => $forms
        ]);
    }

    /**
     * Show the form for creating a new form.
     */
    public function create()
    {
        return Inertia::render('Forms/Create');
    }

    /**
     * Store a newly created form.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();
        
        $form = Form::create($validated);
        
        return redirect()->route('forms.edit', $form)
            ->with('success', 'Formulário criado com sucesso.');
    }

    /**
     * Display the specified form.
     */
    public function show(Form $form)
    {
        $form->load(['creator', 'tasks.instructions']);
        
        return Inertia::render('Forms/Show', [
            'form' => $form
        ]);
    }

    /**
     * Show the form for editing the specified form.
     */
    public function edit(Form $form)
    {
        $form->load(['creator', 'tasks.instructions']);
        
        return Inertia::render('Forms/Edit', [
            'form' => $form
        ]);
    }

    /**
     * Update the specified form.
     */
    public function update(Request $request, Form $form)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);
        
        $form->update($validated);
        
        return redirect()->back()
            ->with('success', 'Formulário atualizado com sucesso.');
    }

    /**
     * Remove the specified form.
     */
    public function destroy(Form $form)
    {
        $form->delete();
        
        return redirect()->route('forms.index')
            ->with('success', 'Formulário excluído com sucesso.');
    }

    /**
     * Create a snapshot of the form and its tasks.
     */
    public function snapshot(Form $form)
    {
        $snapshot = $form->toSnapshot();
        
        return Inertia::render('Forms/Snapshot', [
            'form' => $form,
            'snapshot' => $snapshot
        ]);
    }
} 