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
     * Store new images for an item.
     */
    public function store(Request $request, Item $item)
    {
        $this->authorize('update', $item);
        
        $request->validate([
            'images' => 'required|array|max:5',
            'images.*' => 'required|image|mimes:jpg,jpeg,png,webp,heic|max:10240', // 10MB max for processing
            'set_primary' => 'nullable|boolean',
        ]);
        
        $uploadedImages = [];
        $notifications = [];
        
        DB::transaction(function () use ($request, $item, &$uploadedImages, &$notifications) {
            foreach ($request->file('images') as $index => $file) {
                // Process the image
                $imageData = $this->imageService->processItemImage($file, $item->id);
                
                if ($imageData['was_optimized']) {
                    $notifications[] = "Image '{$imageData['filename']}' was automatically optimized to meet the 500KB size limit.";
                }
                
                // Create image record
                $image = $item->images()->create([
                    ...$imageData,
                    'uploaded_by' => auth()->id(),
                    'is_primary' => $request->boolean('set_primary') && $index === 0,
                ]);
                
                // Generate variants in background job
                dispatch(new GenerateImageVariants($image));
                
                $uploadedImages[] = $image;
            }
            
            // Set first image as primary if no primary exists
            if (!$item->images()->where('is_primary', true)->exists() && count($uploadedImages) > 0) {
                $uploadedImages[0]->update(['is_primary' => true]);
            }
        });
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', count($uploadedImages) . ' image(s) uploaded successfully.')
            ->with('notifications', $notifications);
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
            'is_primary' => 'nullable|boolean',
        ]);
        
        $image->update($request->only(['alt_text', 'caption', 'is_primary']));
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', 'Image updated successfully.');
    }
    
    /**
     * Delete an image.
     */
    public function destroy(Item $item, ItemImage $image)
    {
        $this->authorize('update', $item);
        
        // Verify the image belongs to this item
        if ($image->item_id !== $item->id) {
            abort(404);
        }
        
        $isPrimary = $image->is_primary;
        
        DB::transaction(function () use ($image, $item, $isPrimary) {
            // Delete the image (model will handle file cleanup)
            $image->delete();
            
            // If this was the primary image, set the next one as primary
            if ($isPrimary) {
                $nextImage = $item->images()->orderBy('display_order')->first();
                if ($nextImage) {
                    $nextImage->update(['is_primary' => true]);
                }
            }
        });
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', 'Image deleted successfully.');
    }
    
    /**
     * Reorder images.
     */
    public function reorder(Request $request, Item $item)
    {
        $this->authorize('update', $item);
        
        $request->validate([
            'image_ids' => 'required|array',
            'image_ids.*' => 'exists:item_images,id',
        ]);
        
        DB::transaction(function () use ($request, $item) {
            foreach ($request->image_ids as $index => $imageId) {
                ItemImage::where('id', $imageId)
                    ->where('item_id', $item->id)
                    ->update(['display_order' => $index + 1]);
            }
        });
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', 'Images reordered successfully.');
    }
    
    /**
     * Bulk delete images.
     */
    public function bulkDelete(Request $request, Item $item)
    {
        $this->authorize('update', $item);
        
        $request->validate([
            'image_ids' => 'required|array',
            'image_ids.*' => 'exists:item_images,id',
        ]);
        
        DB::transaction(function () use ($request, $item) {
            $images = ItemImage::whereIn('id', $request->image_ids)
                ->where('item_id', $item->id)
                ->get();
            
            $hadPrimary = $images->where('is_primary', true)->count() > 0;
            
            foreach ($images as $image) {
                $image->delete();
            }
            
            // Set new primary if needed
            if ($hadPrimary) {
                $nextImage = $item->images()->orderBy('display_order')->first();
                if ($nextImage) {
                    $nextImage->update(['is_primary' => true]);
                }
            }
        });
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', count($request->image_ids) . ' image(s) deleted successfully.');
    }
}