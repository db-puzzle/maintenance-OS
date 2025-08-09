<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Services\Production\ItemImageBulkImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ItemImageImportController extends Controller
{
    public function __construct(private ItemImageBulkImportService $bulkService)
    {
    }

    /**
     * Show the bulk picture import wizard.
     */
    public function wizard(Request $request): Response
    {
        $this->authorize('import', Item::class);

        return Inertia::render('production/items/import-pictures', [
            'acceptedExtensions' => ['jpg', 'jpeg', 'png', 'webp', 'heic'],
            'maxFilesPerItem' => 5,
            'result' => session('result'),
        ]);
    }

    /**
     * Perform the actual import based on a client-side prepared manifest.
     * Expects multipart form-data with fields:
     * - matching_key: string ("item_number" or "item_name")
     * - manifest: JSON string per plan
     * - files[]: Uploaded files
     */
    public function import(Request $request)
    {
        $this->authorize('import', Item::class);

        $request->validate([
            'matching_key' => 'required|string|in:item_number,item_name',
            'manifest' => 'required|string',
            'files' => 'required|array',
            'files.*' => 'file|image|mimes:jpg,jpeg,png,webp,heic|max:10240',
        ]);

        $matchingKey = $request->string('matching_key')->toString();
        $manifest = json_decode($request->string('manifest')->toString(), true);
        if (!is_array($manifest)) {
            return back()->withErrors(['manifest' => 'Invalid manifest JSON.']);
        }

        $uploadedFiles = $request->file('files', []);
        $summary = $this->bulkService->importFromManifest($matchingKey, $manifest, $uploadedFiles);

        return redirect()
            ->route('production.items.images.import.wizard')
            ->with('result', $summary)
            ->with('success', "Imported {$summary['imagesImported']} image(s) into {$summary['itemsAffected']} item(s)." . (count($summary['errors']) > 0 ? ' Some errors occurred.' : ''));
    }
}


