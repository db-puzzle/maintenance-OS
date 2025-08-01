<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Models\Production\Item;
use App\Models\Production\ItemImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ItemImageServeController extends Controller
{
    /**
     * Serve the original image file.
     */
    public function serve(Request $request, Item $item, ItemImage $image): StreamedResponse
    {
        // Verify the image belongs to this item
        if ($image->item_id !== $item->id) {
            abort(404);
        }
        
        // Check permissions
        $this->authorize('view', $item);
        
        // Check if file exists
        if (!Storage::exists($image->storage_path)) {
            abort(404);
        }
        
        // Get file content and mime type
        $file = Storage::get($image->storage_path);
        $mimeType = Storage::mimeType($image->storage_path) ?: $image->mime_type;
        
        // Return streamed response
        return response()->stream(function () use ($file) {
            echo $file;
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $image->filename . '"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
    
    /**
     * Serve a specific image variant.
     */
    public function serveVariant(Request $request, Item $item, ItemImage $image, string $variant): StreamedResponse
    {
        // Verify the image belongs to this item
        if ($image->item_id !== $item->id) {
            abort(404);
        }
        
        // Check permissions
        $this->authorize('view', $item);
        
        // Validate variant type
        if (!in_array($variant, ['thumbnail', 'small', 'medium', 'large'])) {
            abort(404);
        }
        
        // Get the variant
        $variantModel = $image->variants()->where('variant_type', $variant)->first();
        
        if (!$variantModel) {
            // If variant doesn't exist, serve the original
            return $this->serve($request, $item, $image);
        }
        
        // Check if file exists
        if (!Storage::exists($variantModel->storage_path)) {
            abort(404);
        }
        
        // Get file content
        $file = Storage::get($variantModel->storage_path);
        $mimeType = 'image/webp'; // All variants are WebP
        
        // Return streamed response
        return response()->stream(function () use ($file) {
            echo $file;
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . pathinfo($image->filename, PATHINFO_FILENAME) . '_' . $variant . '.webp"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}