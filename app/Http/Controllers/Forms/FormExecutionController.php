<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\Form;
use App\Models\Forms\FormExecution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FormExecutionController extends Controller
{
    /**
     * Display a listing of form executions.
     */
    public function index(Request $request)
    {
        $query = FormExecution::with(['user', 'formVersion.form']);

        if ($request->has('form_id')) {
            $query->whereHas('formVersion', function ($q) use ($request) {
                $q->where('form_id', $request->form_id);
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $executions = $query->latest('created_at')->paginate(20);

        return Inertia::render('Forms/Executions/Index', [
            'executions' => $executions,
            'filters' => $request->only(['form_id', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new execution.
     */
    public function create(Request $request)
    {
        $forms = Form::where('is_active', true)
            ->whereHas('currentVersion')
            ->with('currentVersion')
            ->get();

        return Inertia::render('Forms/Executions/Create', [
            'forms' => $forms,
            'preselectedFormId' => $request->form_id,
        ]);
    }

    /**
     * Start a new form execution.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'form_id' => 'required|exists:forms,id',
        ]);

        $form = Form::with('currentVersion.tasks.instructions')->findOrFail($validated['form_id']);

        if (! $form->currentVersion) {
            return redirect()->back()
                ->with('error', 'Este formulário não possui uma versão publicada.');
        }

        DB::beginTransaction();
        try {
            $execution = FormExecution::create([
                'form_version_id' => $form->currentVersion->id,
                'user_id' => auth()->id(),
                'status' => FormExecution::STATUS_PENDING,
            ]);

            DB::commit();

            return redirect()->route('forms.executions.show', $execution)
                ->with('success', 'Execução do formulário iniciada.');
        } catch (\Exception $e) {
            DB::rollback();

            return redirect()->back()
                ->with('error', 'Erro ao iniciar execução: '.$e->getMessage());
        }
    }

    /**
     * Display the specified form execution.
     */
    public function show(FormExecution $formExecution)
    {
        $formExecution->load(['user', 'formVersion.form', 'formVersion.tasks.instructions', 'taskResponses.attachments']);

        return Inertia::render('Forms/Executions/Show', [
            'execution' => $formExecution,
            'percentage' => $formExecution->getProgressPercentage(),
        ]);
    }

    /**
     * Start the form execution.
     */
    public function start(FormExecution $formExecution)
    {
        if (! $formExecution->isPending()) {
            return redirect()->back()
                ->with('error', 'Este formulário já foi iniciado.');
        }

        $formExecution->start();

        return redirect()->route('forms.executions.fill', $formExecution)
            ->with('success', 'Iniciando o preenchimento do formulário.');
    }

    /**
     * Show the fill form view.
     */
    public function fill(FormExecution $formExecution)
    {
        if (! $formExecution->isInProgress()) {
            return redirect()->route('forms.executions.show', $formExecution)
                ->with('error', 'Este formulário não está em andamento.');
        }

        $formExecution->load(['formVersion.tasks.instructions', 'taskResponses.attachments']);

        return Inertia::render('Forms/Executions/Fill', [
            'execution' => $formExecution,
            'percentage' => $formExecution->getProgressPercentage(),
        ]);
    }

    /**
     * Complete the form execution.
     */
    public function complete(FormExecution $formExecution)
    {
        if (! $formExecution->isInProgress()) {
            return redirect()->back()
                ->with('error', 'Este formulário não está em andamento.');
        }

        // Check if all required tasks are completed
        if (! $formExecution->hasAllRequiredTasksCompleted()) {
            $missingTasks = $formExecution->getMissingRequiredTasks();

            return redirect()->back()
                ->with('error', 'Existem tarefas obrigatórias não preenchidas: '.
                    $missingTasks->pluck('description')->join(', '));
        }

        $formExecution->complete();

        return redirect()->route('forms.executions.show', $formExecution)
            ->with('success', 'Formulário concluído com sucesso.');
    }

    /**
     * Cancel the form execution.
     */
    public function cancel(FormExecution $formExecution)
    {
        if ($formExecution->isCompleted()) {
            return redirect()->back()
                ->with('error', 'Não é possível cancelar um formulário já concluído.');
        }

        $formExecution->cancel();

        return redirect()->route('forms.executions.index')
            ->with('success', 'Execução do formulário cancelada.');
    }

    /**
     * Get the progress of the form execution.
     */
    public function progress(FormExecution $formExecution)
    {
        return Inertia::render('Forms/Executions/Progress', [
            'execution' => $formExecution,
            'percentage' => $formExecution->getProgressPercentage(),
            'status' => $formExecution->status,
        ]);
    }
}
