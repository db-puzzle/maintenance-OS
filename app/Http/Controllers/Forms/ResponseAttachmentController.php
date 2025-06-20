<?php

namespace App\Http\Controllers\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\ResponseAttachment;
use App\Models\Forms\TaskResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ResponseAttachmentController extends Controller
{
    /**
     * Display a listing of attachments for a task response.
     */
    public function index(TaskResponse $taskResponse)
    {
        $attachments = $taskResponse->attachments;
        $taskResponse->load('formExecution');

        return Inertia::render('Forms/Attachments/Index', [
            'taskResponse' => $taskResponse,
            'attachments' => $attachments,
        ]);
    }

    /**
     * Store a newly created attachment.
     */
    public function store(Request $request, TaskResponse $taskResponse)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'type' => 'required|in:'.implode(',', [ResponseAttachment::TYPE_PHOTO, ResponseAttachment::TYPE_FILE]),
            'metadata' => 'nullable|array',
        ]);

        $file = $request->file('file');
        $path = $file->store('attachments/task_responses');

        $attachment = $taskResponse->attachments()->create([
            'type' => $request->type,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'metadata' => $request->metadata,
        ]);

        return redirect()->back()->with('success', 'Anexo carregado com sucesso.');
    }

    /**
     * Display the specified attachment.
     */
    public function show(ResponseAttachment $attachment)
    {
        $attachment->load('taskResponse.formExecution');

        return Inertia::render('Forms/Attachments/Show', [
            'attachment' => $attachment,
        ]);
    }

    /**
     * Download the attachment file.
     */
    public function download(ResponseAttachment $attachment)
    {
        return Storage::download(
            $attachment->file_path,
            $attachment->file_name,
            ['Content-Type' => $attachment->mime_type]
        );
    }

    /**
     * Remove the specified attachment.
     */
    public function destroy(ResponseAttachment $attachment)
    {
        $attachment->delete();

        return redirect()->back()->with('success', 'Anexo excluído com sucesso.');
    }
}
