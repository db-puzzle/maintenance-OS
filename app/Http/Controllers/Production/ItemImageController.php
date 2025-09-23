<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Jobs\Production\GenerateImageVariants;
use App\Models\Production\Item;
use App\Models\Production\ItemImage;
use App\Models\Production\ItemImageVariant;
use App\Services\Production\ImageProcessingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ItemImageController extends Controller
{
    private ImageProcessingService $imageService;
    
    public function __construct(ImageProcessingService $imageService)
    {
        $this->imageService = $imageService;
    }
    
    /**
     * Store new image for an item using media library.
     */
    public function store(Request $request, Item $item)
    {
        $this->authorize('update', $item);
        
        $request->validate([
            'images' => 'required|array|max:1',
            'images.*' => 'required|image|mimes:jpg,jpeg,png,webp,heic|max:10240', // 10MB max
        ]);
        
        DB::transaction(function () use ($request, $item) {
            // Clear existing images from media library
            $item->clearMediaCollection('images');
            
            // Add new image to media library
            $file = $request->file('images')[0];
            $item->addMedia($file)
                ->toMediaCollection('images');
        });
        
        return redirect()->route('production.items.show', ['item' => $item->load('media'), 'tab' => 'images'])
            ->with('success', 'Image uploaded successfully.');
    }
    
    /**
     * Update image metadata.
     */
    public function update(Request $request, Item $item, ItemImage $image)
    {
        $this->authorize('update', $item);
        
        // Verify the image belongs to this item
        if ($image->item_id !== $item->id) {
            abort(404);
        }
        
        $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:1000',
        ]);
        
        $image->update($request->only(['alt_text', 'caption']));
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', 'Image updated successfully.');
    }
    
    /**
     * Delete an image.
     */
    public function destroy(Item $item, $media)
    {
        $this->authorize('update', $item);
        
        // Find the media
        $mediaItem = $item->getMedia('images')->where('uuid', $media)->first();
        
        if (!$mediaItem) {
            abort(404);
        }
        
        // Delete the media
        $mediaItem->delete();
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', 'Image deleted successfully.');
    }
    
}