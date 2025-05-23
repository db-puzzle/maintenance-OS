<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\Form;
use App\Models\Forms\FormTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FormTaskController extends Controller
{
    /**
     * Display a listing of form tasks.
     */
    public function index(Form $form)
    {
        $tasks = $form->tasks()->with('instructions')->get();
        
        return Inertia::render('Forms/Tasks/Index', [
            'form' => $form,
            'tasks' => $tasks
        ]);
    }

    /**
     * Show the form for creating a new task.
     */
    public function create(Form $form)
    {
        return Inertia::render('Forms/Tasks/Create', [
            'form' => $form,
            'taskTypes' => [
                ['value' => FormTask::TYPE_QUESTION, 'label' => 'Questão Aberta'],
                ['value' => FormTask::TYPE_MULTIPLE_CHOICE, 'label' => 'Múltipla Escolha'],
                ['value' => FormTask::TYPE_MULTIPLE_SELECT, 'label' => 'Seleção Múltipla'],
                ['value' => FormTask::TYPE_MEASUREMENT, 'label' => 'Medição'],
                ['value' => FormTask::TYPE_PHOTO, 'label' => 'Foto'],
                ['value' => FormTask::TYPE_CODE_READER, 'label' => 'Leitor de Código'],
                ['value' => FormTask::TYPE_FILE_UPLOAD, 'label' => 'Upload de Arquivo']
            ]
        ]);
    }

    /**
     * Store a newly created form task.
     */
    public function store(Request $request, Form $form)
    {
        $validated = $request->validate([
            'type' => 'required|string|in:' . implode(',', [
                FormTask::TYPE_QUESTION,
                FormTask::TYPE_MULTIPLE_CHOICE,
                FormTask::TYPE_MULTIPLE_SELECT,
                FormTask::TYPE_MEASUREMENT,
                FormTask::TYPE_PHOTO,
                FormTask::TYPE_CODE_READER,
                FormTask::TYPE_FILE_UPLOAD
            ]),
            'description' => 'required|string|max:500',
            'is_required' => 'boolean',
            'configuration' => 'nullable|array',
        ]);
        
        // Get the highest position and add 1
        $position = $form->tasks()->max('position') + 1;
        $validated['position'] = $position;
        
        $task = $form->tasks()->create($validated);
        
        return redirect()->route('forms.tasks.edit', [$form, $task])
            ->with('success', 'Tarefa adicionada com sucesso.');
    }

    /**
     * Display the specified form task.
     */
    public function show(Form $form, FormTask $task)
    {
        if ($task->form_id !== $form->id) {
            return redirect()->route('forms.tasks.index', $form)
                ->with('error', 'A tarefa não pertence a este formulário.');
        }
        
        $task->load('instructions');
        
        return Inertia::render('Forms/Tasks/Show', [
            'form' => $form,
            'task' => $task
        ]);
    }

    /**
     * Show the form for editing a task.
     */
    public function edit(Form $form, FormTask $task)
    {
        if ($task->form_id !== $form->id) {
            return redirect()->route('forms.tasks.index', $form)
                ->with('error', 'A tarefa não pertence a este formulário.');
        }
        
        $task->load('instructions');
        
        return Inertia::render('Forms/Tasks/Edit', [
            'form' => $form,
            'task' => $task,
            'taskTypes' => [
                ['value' => FormTask::TYPE_QUESTION, 'label' => 'Questão Aberta'],
                ['value' => FormTask::TYPE_MULTIPLE_CHOICE, 'label' => 'Múltipla Escolha'],
                ['value' => FormTask::TYPE_MULTIPLE_SELECT, 'label' => 'Seleção Múltipla'],
                ['value' => FormTask::TYPE_MEASUREMENT, 'label' => 'Medição'],
                ['value' => FormTask::TYPE_PHOTO, 'label' => 'Foto'],
                ['value' => FormTask::TYPE_CODE_READER, 'label' => 'Leitor de Código'],
                ['value' => FormTask::TYPE_FILE_UPLOAD, 'label' => 'Upload de Arquivo']
            ]
        ]);
    }

    /**
     * Update the specified form task.
     */
    public function update(Request $request, Form $form, FormTask $task)
    {
        if ($task->form_id !== $form->id) {
            return redirect()->route('forms.tasks.index', $form)
                ->with('error', 'A tarefa não pertence a este formulário.');
        }
        
        $validated = $request->validate([
            'type' => 'sometimes|required|string|in:' . implode(',', [
                FormTask::TYPE_QUESTION,
                FormTask::TYPE_MULTIPLE_CHOICE,
                FormTask::TYPE_MULTIPLE_SELECT,
                FormTask::TYPE_MEASUREMENT,
                FormTask::TYPE_PHOTO,
                FormTask::TYPE_CODE_READER,
                FormTask::TYPE_FILE_UPLOAD
            ]),
            'description' => 'sometimes|required|string|max:500',
            'is_required' => 'sometimes|boolean',
            'configuration' => 'sometimes|nullable|array',
        ]);
        
        $task->update($validated);
        
        return redirect()->back()
            ->with('success', 'Tarefa atualizada com sucesso.');
    }

    /**
     * Remove the specified form task.
     */
    public function destroy(Form $form, FormTask $task)
    {
        if ($task->form_id !== $form->id) {
            return redirect()->route('forms.tasks.index', $form)
                ->with('error', 'A tarefa não pertence a este formulário.');
        }
        
        $task->delete();
        
        // Reorder remaining tasks
        $tasks = $form->tasks()->orderBy('position')->get();
        
        DB::transaction(function () use ($tasks) {
            foreach ($tasks as $index => $t) {
                $t->update(['position' => $index + 1]);
            }
        });
        
        return redirect()->route('forms.tasks.index', $form)
            ->with('success', 'Tarefa excluída com sucesso.');
    }

    /**
     * Reorder tasks.
     */
    public function reorder(Request $request, Form $form)
    {
        $validated = $request->validate([
            'task_ids' => 'required|array',
            'task_ids.*' => 'required|exists:form_tasks,id',
        ]);
        
        $taskIds = $validated['task_ids'];
        
        // Check if all tasks belong to this form
        $taskCount = $form->tasks()->whereIn('id', $taskIds)->count();
        if ($taskCount !== count($taskIds)) {
            return redirect()->back()
                ->with('error', 'Algumas tarefas não pertencem a este formulário.');
        }
        
        DB::transaction(function () use ($taskIds) {
            foreach ($taskIds as $position => $id) {
                FormTask::where('id', $id)->update(['position' => $position + 1]);
            }
        });
        
        return redirect()->back()
            ->with('success', 'Ordem das tarefas atualizada com sucesso.');
    }
} 