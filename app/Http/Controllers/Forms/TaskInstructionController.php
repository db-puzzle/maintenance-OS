<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\FormTask;
use App\Models\Forms\TaskInstruction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TaskInstructionController extends Controller
{
    /**
     * Display a listing of instructions for a task.
     */
    public function index(FormTask $formTask)
    {
        $instructions = $formTask->instructions;
        $formTask->load('form');
        
        if (request()->wantsJson()) {
            return response()->json($instructions);
        }
        
        return Inertia::render('Forms/Instructions/Index', [
            'formTask' => $formTask,
            'instructions' => $instructions
        ]);
    }

    /**
     * Show the form to create an instruction.
     */
    public function create(FormTask $formTask)
    {
        $formTask->load('form');
        
        return Inertia::render('Forms/Instructions/Create', [
            'formTask' => $formTask,
            'instructionTypes' => [
                ['value' => TaskInstruction::TYPE_TEXT, 'label' => 'Texto'],
                ['value' => TaskInstruction::TYPE_IMAGE, 'label' => 'Imagem'],
                ['value' => TaskInstruction::TYPE_VIDEO, 'label' => 'Vídeo']
            ]
        ]);
    }

    /**
     * Store a newly created instruction.
     */
    public function store(Request $request, FormTask $formTask)
    {
        $validated = $request->validate([
            'type' => 'required|in:' . implode(',', [
                TaskInstruction::TYPE_TEXT,
                TaskInstruction::TYPE_IMAGE,
                TaskInstruction::TYPE_VIDEO
            ]),
            'content' => 'required_if:type,' . TaskInstruction::TYPE_TEXT . '|nullable|string',
            'caption' => 'nullable|string|max:255',
            'media' => 'required_if:type,' . implode(',', [
                TaskInstruction::TYPE_IMAGE,
                TaskInstruction::TYPE_VIDEO
            ]) . '|nullable|file|max:20480', // 20MB max
        ]);
        
        // Get the highest position and add 1
        $position = $formTask->instructions()->max('position') + 1;
        
        $data = [
            'type' => $validated['type'],
            'content' => $validated['content'] ?? null,
            'caption' => $validated['caption'] ?? null,
            'position' => $position,
        ];
        
        // Handle media upload if present
        if ($request->hasFile('media') && in_array($validated['type'], [TaskInstruction::TYPE_IMAGE, TaskInstruction::TYPE_VIDEO])) {
            $file = $request->file('media');
            $path = $file->store('instructions');
            $data['media_url'] = $path;
        }
        
        $instruction = $formTask->instructions()->create($data);
        
        if ($request->wantsJson()) {
            return response()->json($instruction, 201);
        }
        
        return redirect()->route('forms.tasks.edit', [$formTask->form, $formTask])
            ->with('success', 'Instrução adicionada com sucesso.');
    }

    /**
     * Display the specified instruction.
     */
    public function show(TaskInstruction $instruction)
    {
        $instruction->load('formTask.form');
        
        if (request()->wantsJson()) {
            return response()->json($instruction);
        }
        
        return Inertia::render('Forms/Instructions/Show', [
            'instruction' => $instruction
        ]);
    }

    /**
     * Show the form to edit an instruction.
     */
    public function edit(TaskInstruction $instruction)
    {
        $instruction->load('formTask.form');
        
        return Inertia::render('Forms/Instructions/Edit', [
            'instruction' => $instruction,
            'instructionTypes' => [
                ['value' => TaskInstruction::TYPE_TEXT, 'label' => 'Texto'],
                ['value' => TaskInstruction::TYPE_IMAGE, 'label' => 'Imagem'],
                ['value' => TaskInstruction::TYPE_VIDEO, 'label' => 'Vídeo']
            ]
        ]);
    }

    /**
     * Update the specified instruction.
     */
    public function update(Request $request, TaskInstruction $instruction)
    {
        $validated = $request->validate([
            'type' => 'sometimes|required|in:' . implode(',', [
                TaskInstruction::TYPE_TEXT,
                TaskInstruction::TYPE_IMAGE,
                TaskInstruction::TYPE_VIDEO
            ]),
            'content' => 'sometimes|required_if:type,' . TaskInstruction::TYPE_TEXT . '|nullable|string',
            'caption' => 'nullable|string|max:255',
            'media' => 'sometimes|required_if:type,' . implode(',', [
                TaskInstruction::TYPE_IMAGE,
                TaskInstruction::TYPE_VIDEO
            ]) . '|nullable|file|max:20480', // 20MB max
        ]);
        
        $data = [];
        
        if (isset($validated['type'])) {
            $data['type'] = $validated['type'];
        }
        
        if (isset($validated['content'])) {
            $data['content'] = $validated['content'];
        }
        
        if (isset($validated['caption'])) {
            $data['caption'] = $validated['caption'];
        }
        
        // Handle media upload if present
        if ($request->hasFile('media')) {
            // Delete old media file if exists
            if ($instruction->media_url) {
                Storage::delete($instruction->media_url);
            }
            
            $file = $request->file('media');
            $path = $file->store('instructions');
            $data['media_url'] = $path;
        }
        
        $instruction->update($data);
        
        if ($request->wantsJson()) {
            return response()->json($instruction);
        }
        
        return redirect()->route('forms.tasks.edit', [$instruction->formTask->form, $instruction->formTask])
            ->with('success', 'Instrução atualizada com sucesso.');
    }

    /**
     * Remove the specified instruction.
     */
    public function destroy(TaskInstruction $instruction)
    {
        // Delete media file if exists
        if ($instruction->media_url && !filter_var($instruction->media_url, FILTER_VALIDATE_URL)) {
            Storage::delete($instruction->media_url);
        }
        
        $formTask = $instruction->formTask;
        $form = $formTask->form;
        
        $instruction->delete();
        
        // Reorder remaining instructions
        $instructions = $formTask->instructions()->orderBy('position')->get();
        
        DB::transaction(function () use ($instructions) {
            foreach ($instructions as $index => $instr) {
                $instr->update(['position' => $index + 1]);
            }
        });
        
        if (request()->wantsJson()) {
            return response()->noContent();
        }
        
        return redirect()->route('forms.tasks.edit', [$form, $formTask])
            ->with('success', 'Instrução excluída com sucesso.');
    }

    /**
     * Reorder instructions.
     */
    public function reorder(Request $request, FormTask $formTask)
    {
        $validated = $request->validate([
            'instruction_ids' => 'required|array',
            'instruction_ids.*' => 'required|exists:task_instructions,id',
        ]);
        
        $instructionIds = $validated['instruction_ids'];
        
        // Check if all instructions belong to this task
        $instructionCount = $formTask->instructions()->whereIn('id', $instructionIds)->count();
        if ($instructionCount !== count($instructionIds)) {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'Algumas instruções não pertencem a esta tarefa.'], 400);
            }
            
            return redirect()->back()->with('error', 'Algumas instruções não pertencem a esta tarefa.');
        }
        
        DB::transaction(function () use ($instructionIds) {
            foreach ($instructionIds as $position => $id) {
                TaskInstruction::where('id', $id)->update(['position' => $position + 1]);
            }
        });
        
        if ($request->wantsJson()) {
            return response()->json(['message' => 'Ordem das instruções atualizada com sucesso.']);
        }
        
        return redirect()->back()->with('success', 'Ordem das instruções atualizada com sucesso.');
    }
} 