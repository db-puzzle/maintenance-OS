# Item Images System Implementation Plan

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Integration Points](#integration-points)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)

## 1. Overview

This document provides a detailed implementation plan for the Item Images System as specified in the Item Images Specification document. The implementation follows Laravel best practices with Inertia.js for all responses and uses shadcn/ui components for the frontend.

### Key Principles
- 100% Inertia.js responses (no AJAX/JSON endpoints)
- Use of existing project components (EntityDataTable, ItemSelect, etc.)
- Laravel route model binding throughout
- Proper permission and policy implementation
- UTC timestamps for all time-related data

## 2. Database Schema

### 2.1 Migration Files

#### Create Item Images Table
```php
// database/migrations/2024_XX_XX_create_item_images_table.php
Schema::create('item_images', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('item_id')->constrained('items')->onDelete('cascade');
    $table->string('filename');
    $table->string('storage_path');
    $table->string('mime_type');
    $table->integer('file_size');
    $table->integer('width')->nullable();
    $table->integer('height')->nullable();
    $table->boolean('is_primary')->default(false);
    $table->integer('display_order')->default(0);
    $table->string('alt_text')->nullable();
    $table->text('caption')->nullable();
    $table->json('metadata')->nullable();
    $table->foreignUuid('uploaded_by')->constrained('users');
    $table->timestamps();
    
    $table->index(['item_id', 'is_primary']);
    $table->index(['item_id', 'display_order']);
});
```

#### Create Item Image Variants Table
```php
// database/migrations/2024_XX_XX_create_item_image_variants_table.php
Schema::create('item_image_variants', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('item_image_id')->constrained('item_images')->onDelete('cascade');
    $table->enum('variant_type', ['thumbnail', 'small', 'medium', 'large']);
    $table->string('storage_path');
    $table->integer('width');
    $table->integer('height');
    $table->integer('file_size');
    $table->timestamps();
    
    $table->unique(['item_image_id', 'variant_type']);
    $table->index('variant_type');
});
```

#### Update Items Table
```php
// Edit existing migration: database/migrations/2024_XX_XX_create_items_table.php
// Add after existing columns:
$table->foreignUuid('primary_image_id')->nullable()->constrained('item_images')->nullOnDelete();
```

### 2.2 Indexes and Constraints
- Ensure only one primary image per item via database constraint
- Add composite indexes for performance on common queries

## 3. Backend Implementation

### 3.1 Models

#### ItemImage Model
```php
// app/Models/Production/ItemImage.php
namespace App\Models\Production;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Storage;

class ItemImage extends Model
{
    use HasUuids;
    
    protected $fillable = [
        'item_id',
        'filename',
        'storage_path',
        'mime_type',
        'file_size',
        'width',
        'height',
        'is_primary',
        'display_order',
        'alt_text',
        'caption',
        'metadata',
        'uploaded_by',
    ];
    
    protected $casts = [
        'is_primary' => 'boolean',
        'metadata' => 'array',
        'file_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'display_order' => 'integer',
    ];
    
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
    
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
    
    public function variants(): HasMany
    {
        return $this->hasMany(ItemImageVariant::class);
    }
    
    public function getUrlAttribute(): string
    {
        return Storage::url($this->storage_path);
    }
    
    public function getVariantUrl(string $variant = 'medium'): string
    {
        $variant = $this->variants()->where('variant_type', $variant)->first();
        return $variant ? Storage::url($variant->storage_path) : $this->url;
    }
    
    protected static function booted()
    {
        static::creating(function ($image) {
            if ($image->is_primary) {
                static::where('item_id', $image->item_id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
            
            // Set display order
            if (!$image->display_order) {
                $maxOrder = static::where('item_id', $image->item_id)->max('display_order') ?? 0;
                $image->display_order = $maxOrder + 1;
            }
        });
        
        static::updating(function ($image) {
            if ($image->isDirty('is_primary') && $image->is_primary) {
                static::where('item_id', $image->item_id)
                    ->where('id', '!=', $image->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }
        });
        
        static::deleted(function ($image) {
            // Clean up physical files
            Storage::delete($image->storage_path);
            foreach ($image->variants as $variant) {
                Storage::delete($variant->storage_path);
            }
        });
    }
}
```

#### ItemImageVariant Model
```php
// app/Models/Production/ItemImageVariant.php
namespace App\Models\Production;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Storage;

class ItemImageVariant extends Model
{
    use HasUuids;
    
    protected $fillable = [
        'item_image_id',
        'variant_type',
        'storage_path',
        'width',
        'height',
        'file_size',
    ];
    
    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'file_size' => 'integer',
    ];
    
    public function itemImage(): BelongsTo
    {
        return $this->belongsTo(ItemImage::class);
    }
    
    public function getUrlAttribute(): string
    {
        return Storage::url($this->storage_path);
    }
}
```

#### Update Item Model
```php
// Add to app/Models/Production/Item.php
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Add relationships
public function images(): HasMany
{
    return $this->hasMany(ItemImage::class)->orderBy('display_order');
}

public function primaryImage(): BelongsTo
{
    return $this->belongsTo(ItemImage::class, 'primary_image_id');
}

// Add accessor for primary image URL
public function getPrimaryImageUrlAttribute(): ?string
{
    if ($this->primaryImage) {
        return $this->primaryImage->getVariantUrl('medium');
    }
    
    $firstImage = $this->images()->where('is_primary', true)->first() 
        ?? $this->images()->first();
    
    return $firstImage ? $firstImage->getVariantUrl('medium') : null;
}

// Add accessor for all image URLs
public function getImageUrlsAttribute(): array
{
    return $this->images->map(function ($image) {
        return [
            'id' => $image->id,
            'url' => $image->url,
            'thumbnail' => $image->getVariantUrl('thumbnail'),
            'medium' => $image->getVariantUrl('medium'),
            'is_primary' => $image->is_primary,
            'caption' => $image->caption,
        ];
    })->toArray();
}
```

### 3.2 Services

#### ImageProcessingService
```php
// app/Services/Production/ImageProcessingService.php
namespace App\Services\Production;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ImageProcessingService
{
    private ImageManager $imageManager;
    private array $variantSizes = [
        'thumbnail' => ['width' => 150, 'height' => 150],
        'small' => ['width' => 400, 'height' => 400],
        'medium' => ['width' => 800, 'height' => 800],
        'large' => ['width' => 1200, 'height' => 1200],
    ];
    
    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver());
    }
    
    public function processItemImage(UploadedFile $file, string $itemId): array
    {
        $image = $this->imageManager->read($file);
        
        // Auto-orient based on EXIF data
        $image->orient();
        
        // Get original dimensions
        $originalWidth = $image->width();
        $originalHeight = $image->height();
        
        // Check if image needs to be optimized (> 500KB)
        $needsOptimization = $file->getSize() > 500 * 1024;
        
        // Generate unique filename
        $filename = $this->generateFilename($file);
        $basePath = "items/{$itemId}/images";
        
        // Process and store original (or optimized version)
        if ($needsOptimization) {
            $optimized = $this->optimizeImage($image, 500 * 1024);
            $path = "{$basePath}/original/{$filename}";
            Storage::put($path, $optimized['encoded']);
            $fileSize = strlen($optimized['encoded']);
            $width = $optimized['width'];
            $height = $optimized['height'];
        } else {
            $path = $file->storeAs("{$basePath}/original", $filename);
            $fileSize = $file->getSize();
            $width = $originalWidth;
            $height = $originalHeight;
        }
        
        return [
            'filename' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $fileSize,
            'width' => $width,
            'height' => $height,
            'was_optimized' => $needsOptimization,
        ];
    }
    
    public function generateVariants(string $itemImageId, string $originalPath): array
    {
        $variants = [];
        $image = $this->imageManager->read(Storage::get($originalPath));
        
        foreach ($this->variantSizes as $type => $dimensions) {
            $variant = clone $image;
            
            // Resize to fit within dimensions while maintaining aspect ratio
            $variant->scaleDown($dimensions['width'], $dimensions['height']);
            
            // Convert to WebP for web variants
            $variant->toWebp(85);
            
            $filename = pathinfo($originalPath, PATHINFO_FILENAME) . '.webp';
            $variantPath = str_replace(
                '/original/',
                "/variants/{$type}/",
                dirname($originalPath)
            ) . '/' . $filename;
            
            Storage::put($variantPath, $variant->encode());
            
            $variants[] = [
                'item_image_id' => $itemImageId,
                'variant_type' => $type,
                'storage_path' => $variantPath,
                'width' => $variant->width(),
                'height' => $variant->height(),
                'file_size' => strlen($variant->encode()),
            ];
        }
        
        return $variants;
    }
    
    private function optimizeImage($image, int $targetSize): array
    {
        $quality = 85;
        $scale = 1.0;
        $encoded = null;
        
        // Try progressive reduction until under target size
        while ($quality >= 60 && $scale >= 0.5) {
            $testImage = clone $image;
            
            if ($scale < 1.0) {
                $newWidth = (int)($image->width() * $scale);
                $newHeight = (int)($image->height() * $scale);
                $testImage->scale($newWidth, $newHeight);
            }
            
            $encoded = $testImage->toJpeg($quality)->encode();
            
            if (strlen($encoded) <= $targetSize) {
                return [
                    'encoded' => $encoded,
                    'width' => $testImage->width(),
                    'height' => $testImage->height(),
                    'quality' => $quality,
                    'scale' => $scale,
                ];
            }
            
            // Reduce quality first, then scale
            if ($quality > 60) {
                $quality -= 5;
            } else {
                $scale -= 0.1;
                $quality = 85; // Reset quality for new scale
            }
        }
        
        // If still too large, use minimum settings
        $finalImage = clone $image;
        $finalImage->scale((int)($image->width() * 0.5), (int)($image->height() * 0.5));
        
        return [
            'encoded' => $finalImage->toJpeg(60)->encode(),
            'width' => $finalImage->width(),
            'height' => $finalImage->height(),
            'quality' => 60,
            'scale' => 0.5,
        ];
    }
    
    private function generateFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        return uniqid() . '_' . time() . '.' . $extension;
    }
    
    public function deleteImage(string $path): void
    {
        Storage::delete($path);
    }
}
```

### 3.3 Controllers

#### ItemImageController
```php
// app/Http/Controllers/Production/ItemImageController.php
namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
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
                dispatch(new \App\Jobs\GenerateImageVariants($image));
                
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
    
    public function update(Request $request, Item $item, ItemImage $image)
    {
        $this->authorize('update', $item);
        
        $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:1000',
            'is_primary' => 'nullable|boolean',
        ]);
        
        $image->update($request->only(['alt_text', 'caption', 'is_primary']));
        
        return redirect()->route('production.items.show', ['item' => $item, 'tab' => 'images'])
            ->with('success', 'Image updated successfully.');
    }
    
    public function destroy(Item $item, ItemImage $image)
    {
        $this->authorize('update', $item);
        
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
```

### 3.4 Jobs

#### GenerateImageVariants Job
```php
// app/Jobs/GenerateImageVariants.php
namespace App\Jobs;

use App\Models\Production\ItemImage;
use App\Services\Production\ImageProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateImageVariants implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(
        private ItemImage $itemImage
    ) {}
    
    public function handle(ImageProcessingService $imageService): void
    {
        $variants = $imageService->generateVariants(
            $this->itemImage->id,
            $this->itemImage->storage_path
        );
        
        foreach ($variants as $variantData) {
            $this->itemImage->variants()->create($variantData);
        }
    }
}
```

### 3.5 Policies

Update ItemPolicy to include image permissions:
```php
// Add to app/Policies/ItemPolicy.php
public function manageImages(User $user, Item $item): bool
{
    return $user->hasPermission('production.items.update');
}
```

### 3.6 Routes

```php
// Add to routes/web.php within the production routes group
Route::prefix('items/{item}/images')->name('items.images.')->group(function () {
    Route::post('/', [ItemImageController::class, 'store'])->name('store');
    Route::patch('/{image}', [ItemImageController::class, 'update'])->name('update');
    Route::delete('/{image}', [ItemImageController::class, 'destroy'])->name('destroy');
    Route::post('/reorder', [ItemImageController::class, 'reorder'])->name('reorder');
    Route::post('/bulk-delete', [ItemImageController::class, 'bulkDelete'])->name('bulk-delete');
});
```

## 4. Frontend Implementation

### 4.1 Components

#### ItemImageUploader Component
```tsx
// resources/js/components/production/ItemImageUploader.tsx
import React, { useState, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ItemImageUploaderProps {
    itemId: string;
    maxImages: number;
    currentImageCount: number;
}

export function ItemImageUploader({ itemId, maxImages, currentImageCount }: ItemImageUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
    
    const { data, setData, post, progress, errors, processing } = useForm({
        images: [] as File[],
        set_primary: currentImageCount === 0,
    });
    
    const remainingSlots = maxImages - currentImageCount;
    
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);
    
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    }, []);
    
    const handleFiles = (files: FileList) => {
        const validFiles = Array.from(files).filter(file => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
            return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB
        }).slice(0, remainingSlots);
        
        const newPreviews = validFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        
        setPreviews(prev => [...prev, ...newPreviews]);
        setData('images', [...data.images, ...validFiles]);
    };
    
    const removeFile = (index: number) => {
        URL.revokeObjectURL(previews[index].url);
        setPreviews(prev => prev.filter((_, i) => i !== index));
        setData('images', data.images.filter((_, i) => i !== index));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = new FormData();
        data.images.forEach(file => formData.append('images[]', file));
        formData.append('set_primary', data.set_primary ? '1' : '0');
        
        post(route('production.items.images.store', itemId), {
            forceFormData: true,
            onSuccess: () => {
                setPreviews([]);
                setData('images', []);
            }
        });
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-gray-300",
                    remainingSlots === 0 && "opacity-50 cursor-not-allowed"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                    {remainingSlots > 0 ? (
                        <>Drag and drop images here, or click to select</>
                    ) : (
                        <>Maximum number of images reached</>
                    )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WebP, HEIC up to 10MB (will be optimized to 500KB if larger)
                </p>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                    id="file-input"
                    disabled={remainingSlots === 0}
                />
                <label
                    htmlFor="file-input"
                    className={cn(
                        "mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 cursor-pointer",
                        remainingSlots === 0 && "opacity-50 cursor-not-allowed"
                    )}
                >
                    Select Images
                </label>
                <p className="text-xs text-gray-500 mt-2">
                    {currentImageCount} of {maxImages} images used
                </p>
            </div>
            
            {errors.images && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.images}</AlertDescription>
                </Alert>
            )}
            
            {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                            <img
                                src={preview.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                                {(preview.file.size / 1024).toFixed(0)}KB
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {processing && progress && (
                <div className="space-y-2">
                    <Progress value={progress.percentage} />
                    <p className="text-sm text-gray-600 text-center">
                        Uploading... {progress.percentage}%
                    </p>
                </div>
            )}
            
            {previews.length > 0 && (
                <div className="flex justify-end space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            previews.forEach(p => URL.revokeObjectURL(p.url));
                            setPreviews([]);
                            setData('images', []);
                        }}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={processing}>
                        Upload {previews.length} Image{previews.length !== 1 ? 's' : ''}
                    </Button>
                </div>
            )}
        </form>
    );
}
```

#### ItemImageGrid Component
```tsx
// resources/js/components/production/ItemImageGrid.tsx
import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Star, Trash2, Edit, GripVertical, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ItemImageCarousel } from './ItemImageCarousel';
import { cn } from '@/lib/utils';

interface ItemImage {
    id: string;
    url: string;
    thumbnail_url: string;
    filename: string;
    is_primary: boolean;
    alt_text?: string;
    caption?: string;
    file_size: number;
    width: number;
    height: number;
    uploaded_by: string;
    created_at: string;
}

interface ItemImageGridProps {
    itemId: string;
    images: ItemImage[];
    canEdit: boolean;
}

export function ItemImageGrid({ itemId, images, canEdit }: ItemImageGridProps) {
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [editingImage, setEditingImage] = useState<ItemImage | null>(null);
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselStartIndex, setCarouselStartIndex] = useState(0);
    
    const { delete: destroy, patch, post } = useForm();
    
    const handleSelectImage = (imageId: string) => {
        setSelectedImages(prev =>
            prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]
        );
    };
    
    const handleSetPrimary = (image: ItemImage) => {
        patch(route('production.items.images.update', [itemId, image.id]), {
            is_primary: true,
        });
    };
    
    const handleDeleteImage = (image: ItemImage) => {
        if (confirm('Are you sure you want to delete this image?')) {
            destroy(route('production.items.images.destroy', [itemId, image.id]));
        }
    };
    
    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedImages.length} images?`)) {
            post(route('production.items.images.bulk-delete', itemId), {
                image_ids: selectedImages,
            }, {
                onSuccess: () => setSelectedImages([]),
            });
        }
    };
    
    const handleSaveEdit = () => {
        if (!editingImage) return;
        
        patch(route('production.items.images.update', [itemId, editingImage.id]), {
            alt_text: editingImage.alt_text,
            caption: editingImage.caption,
        }, {
            onSuccess: () => setEditingImage(null),
        });
    };
    
    const openCarousel = (index: number) => {
        setCarouselStartIndex(index);
        setCarouselOpen(true);
    };
    
    return (
        <>
            {canEdit && selectedImages.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                        {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected
                    </Button>
                </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                    <div
                        key={image.id}
                        className={cn(
                            "relative group border rounded-lg overflow-hidden",
                            image.is_primary && "ring-2 ring-primary"
                        )}
                    >
                        {canEdit && (
                            <div className="absolute top-2 left-2 z-10">
                                <Checkbox
                                    checked={selectedImages.includes(image.id)}
                                    onCheckedChange={() => handleSelectImage(image.id)}
                                    className="bg-white/80"
                                />
                            </div>
                        )}
                        
                        {image.is_primary && (
                            <div className="absolute top-2 right-2 z-10 bg-primary text-white px-2 py-1 rounded text-xs flex items-center">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                            </div>
                        )}
                        
                        <img
                            src={image.thumbnail_url}
                            alt={image.alt_text || `Item image ${index + 1}`}
                            className="w-full h-48 object-cover cursor-pointer"
                            onClick={() => openCarousel(index)}
                        />
                        
                        <div className="p-3">
                            <p className="text-sm font-medium truncate">{image.filename}</p>
                            <p className="text-xs text-gray-500">
                                {image.width}x{image.height} • {(image.file_size / 1024).toFixed(0)}KB
                            </p>
                            {image.caption && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {image.caption}
                                </p>
                            )}
                        </div>
                        
                        {canEdit && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {!image.is_primary && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetPrimary(image);
                                        }}
                                    >
                                        <Star className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingImage(image);
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteImage(image);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Image Details</DialogTitle>
                        <DialogDescription>
                            Update the alt text and caption for this image.
                        </DialogDescription>
                    </DialogHeader>
                    {editingImage && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="alt_text">Alt Text</Label>
                                <Input
                                    id="alt_text"
                                    value={editingImage.alt_text || ''}
                                    onChange={(e) => setEditingImage({
                                        ...editingImage,
                                        alt_text: e.target.value,
                                    })}
                                    placeholder="Describe this image for accessibility"
                                />
                            </div>
                            <div>
                                <Label htmlFor="caption">Caption</Label>
                                <Textarea
                                    id="caption"
                                    value={editingImage.caption || ''}
                                    onChange={(e) => setEditingImage({
                                        ...editingImage,
                                        caption: e.target.value,
                                    })}
                                    placeholder="Optional caption for this image"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingImage(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <ItemImageCarousel
                images={images}
                open={carouselOpen}
                onOpenChange={setCarouselOpen}
                startIndex={carouselStartIndex}
            />
        </>
    );
}
```

#### ItemImageCarousel Component
```tsx
// resources/js/components/production/ItemImageCarousel.tsx
import React from 'react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Maximize2, X } from 'lucide-react';

interface ItemImage {
    id: string;
    url: string;
    medium_url: string;
    large_url: string;
    filename: string;
    alt_text?: string;
    caption?: string;
    width: number;
    height: number;
}

interface ItemImageCarouselProps {
    images: ItemImage[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    startIndex?: number;
}

export function ItemImageCarousel({ 
    images, 
    open, 
    onOpenChange, 
    startIndex = 0 
}: ItemImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = React.useState(startIndex);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    
    React.useEffect(() => {
        setCurrentIndex(startIndex);
    }, [startIndex, open]);
    
    const handleDownload = (image: ItemImage) => {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = image.filename;
        link.click();
    };
    
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[90vh] p-0">
                <div className="relative h-full flex flex-col">
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => handleDownload(images[currentIndex])}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={toggleFullscreen}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center bg-black/90 p-8">
                        <Carousel
                            opts={{
                                startIndex,
                                loop: true,
                            }}
                            className="w-full max-w-5xl"
                            onSlideChange={(index) => setCurrentIndex(index)}
                        >
                            <CarouselContent>
                                {images.map((image, index) => (
                                    <CarouselItem key={image.id}>
                                        <div className="flex flex-col items-center">
                                            <img
                                                src={image.large_url || image.url}
                                                alt={image.alt_text || `Image ${index + 1}`}
                                                className="max-h-[70vh] max-w-full object-contain"
                                            />
                                            {image.caption && (
                                                <p className="mt-4 text-white text-center max-w-2xl">
                                                    {image.caption}
                                                </p>
                                            )}
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="left-4" />
                            <CarouselNext className="right-4" />
                        </Carousel>
                    </div>
                    
                    <div className="bg-gray-900 text-white p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{images[currentIndex]?.filename}</p>
                                <p className="text-sm text-gray-400">
                                    {images[currentIndex]?.width}x{images[currentIndex]?.height}
                                </p>
                            </div>
                            <p className="text-sm">
                                {currentIndex + 1} of {images.length}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 p-2 overflow-x-auto">
                        <div className="flex gap-2">
                            {images.map((image, index) => (
                                <button
                                    key={image.id}
                                    onClick={() => setCurrentIndex(index)}
                                    className={cn(
                                        "flex-shrink-0 border-2 rounded overflow-hidden transition-all",
                                        currentIndex === index
                                            ? "border-primary"
                                            : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <img
                                        src={image.thumbnail_url}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-20 h-16 object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
```

#### ItemImagePreview Component
```tsx
// resources/js/components/production/ItemImagePreview.tsx
import React from 'react';
import { Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ItemImagePreviewProps {
    primaryImageUrl?: string;
    imageCount: number;
    className?: string;
    onClick?: () => void;
}

export function ItemImagePreview({ 
    primaryImageUrl, 
    imageCount, 
    className,
    onClick 
}: ItemImagePreviewProps) {
    return (
        <div 
            className={cn(
                "relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group",
                className
            )}
            onClick={onClick}
        >
            {primaryImageUrl ? (
                <>
                    <img
                        src={primaryImageUrl}
                        alt="Item preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {imageCount > 1 && (
                        <Badge 
                            variant="secondary" 
                            className="absolute top-2 right-2"
                        >
                            {imageCount} images
                        </Badge>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Camera className="h-8 w-8 mb-2" />
                    <span className="text-sm">No image</span>
                </div>
            )}
        </div>
    );
}
```

### 4.2 Page Updates

#### Update Item Show Page
```tsx
// Update resources/js/Pages/production/items/show.tsx
// Add to the tabs configuration:
{
    value: 'images',
    label: 'Images',
    icon: Camera,
    badge: item.images_count || 0,
}

// Add to the tab content:
{activeTab === 'images' && (
    <div className="space-y-6">
        {permissions.update && (
            <Card>
                <CardHeader>
                    <CardTitle>Upload Images</CardTitle>
                    <CardDescription>
                        Add images to help identify this item. You can upload up to 5 images.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ItemImageUploader
                        itemId={item.id}
                        maxImages={5}
                        currentImageCount={item.images?.length || 0}
                    />
                </CardContent>
            </Card>
        )}
        
        <Card>
            <CardHeader>
                <CardTitle>Item Images</CardTitle>
                {item.images?.length > 0 && (
                    <CardDescription>
                        Click on any image to view in full size. Drag to reorder.
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {item.images?.length > 0 ? (
                    <ItemImageGrid
                        itemId={item.id}
                        images={item.images}
                        canEdit={permissions.update}
                    />
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No images uploaded yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
)}
```

#### Update Item Index Page
```tsx
// Update resources/js/Pages/production/items/index.tsx
// Add ItemImagePreview to the table row:
<TableCell>
    <div className="flex items-center space-x-3">
        <ItemImagePreview
            primaryImageUrl={item.primary_image_url}
            imageCount={item.images_count || 0}
            className="w-12 h-12"
            onClick={() => router.visit(route('production.items.show', { item: item.id, tab: 'images' }))}
        />
        <div>
            <Link
                href={route('production.items.show', item.id)}
                className="font-medium hover:underline"
            >
                {item.name}
            </Link>
            <p className="text-sm text-muted-foreground">{item.item_number}</p>
        </div>
    </div>
</TableCell>
```

## 5. Integration Points

### 5.1 Import Integration

Update the ItemImportService to handle image imports:
```php
// Add to app/Services/Production/ItemImportService.php
private function processImageImport(array $row, Item $item): void
{
    // Handle URL-based imports
    for ($i = 1; $i <= 5; $i++) {
        $urlKey = "image_url_{$i}";
        if (!empty($row[$urlKey])) {
            dispatch(new DownloadAndProcessItemImage($item, $row[$urlKey], $i === 1));
        }
    }
    
    // Handle local file matching
    if (!empty($row['image_pattern'])) {
        $this->matchLocalImages($item, $row['image_pattern']);
    }
}
```

### 5.2 Permissions

Add to PermissionSeeder:
```php
// Add to database/seeders/PermissionSeeder.php
[
    'name' => 'production.items.images.manage',
    'display_name' => 'Manage Item Images',
    'description' => 'Upload, edit, and delete item images',
    'module' => 'production',
    'roles' => ['Administrator', 'Manager', 'Supervisor'],
],
```

## 6. Testing Strategy

### 6.1 Feature Tests

```php
// tests/Feature/Production/ItemImageTest.php
namespace Tests\Feature\Production;

use Tests\TestCase;
use App\Models\User;
use App\Models\Production\Item;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ItemImageTest extends TestCase
{
    public function test_user_can_upload_images_to_item()
    {
        Storage::fake('public');
        
        $user = User::factory()->withRole('Manager')->create();
        $item = Item::factory()->create();
        
        $response = $this->actingAs($user)
            ->post(route('production.items.images.store', $item), [
                'images' => [
                    UploadedFile::fake()->image('product1.jpg', 800, 600),
                    UploadedFile::fake()->image('product2.jpg', 800, 600),
                ],
                'set_primary' => true,
            ]);
        
        $response->assertRedirect();
        $this->assertDatabaseCount('item_images', 2);
        $this->assertTrue($item->images()->where('is_primary', true)->exists());
    }
    
    public function test_large_images_are_automatically_optimized()
    {
        Storage::fake('public');
        
        $user = User::factory()->withRole('Manager')->create();
        $item = Item::factory()->create();
        
        // Create a large image (2MB)
        $largeImage = UploadedFile::fake()->image('large.jpg', 2000, 2000)->size(2048);
        
        $response = $this->actingAs($user)
            ->post(route('production.items.images.store', $item), [
                'images' => [$largeImage],
            ]);
        
        $response->assertRedirect();
        $response->assertSessionHas('notifications');
        
        $image = $item->images()->first();
        $this->assertLessThanOrEqual(500 * 1024, $image->file_size);
    }
    
    public function test_user_can_set_primary_image()
    {
        $user = User::factory()->withRole('Manager')->create();
        $item = Item::factory()->has(ItemImage::factory()->count(3))->create();
        $image = $item->images()->where('is_primary', false)->first();
        
        $response = $this->actingAs($user)
            ->patch(route('production.items.images.update', [$item, $image]), [
                'is_primary' => true,
            ]);
        
        $response->assertRedirect();
        $this->assertTrue($image->fresh()->is_primary);
        $this->assertEquals(1, $item->images()->where('is_primary', true)->count());
    }
}
```

### 6.2 Frontend Tests

```tsx
// resources/js/tests/components/ItemImageUploader.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ItemImageUploader } from '@/components/production/ItemImageUploader';

describe('ItemImageUploader', () => {
    it('accepts drag and drop files', async () => {
        render(<ItemImageUploader itemId="123" maxImages={5} currentImageCount={0} />);
        
        const dropZone = screen.getByText(/drag and drop images here/i).parentElement;
        const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
        
        fireEvent.drop(dropZone, {
            dataTransfer: { files: [file] }
        });
        
        await waitFor(() => {
            expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
        });
    });
    
    it('validates file size and type', async () => {
        render(<ItemImageUploader itemId="123" maxImages={5} currentImageCount={0} />);
        
        const input = screen.getByLabelText('Select Images');
        const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
        
        fireEvent.change(input, { target: { files: [largeFile] } });
        
        await waitFor(() => {
            expect(screen.queryByAltText('Preview 1')).not.toBeInTheDocument();
        });
    });
});
```

## 7. Deployment Checklist

### 7.1 Environment Setup
- [ ] Configure storage driver (S3 or local)
- [ ] Set up image processing queue workers
- [ ] Configure memory limits for image processing
- [ ] Set up CDN if using S3

### 7.2 Database Migrations
- [ ] Run item_images table migration
- [ ] Run item_image_variants table migration
- [ ] Update items table with primary_image_id
- [ ] Add image permissions to permission seeder
- [ ] Run seeders

### 7.3 Configuration
- [ ] Configure Intervention Image driver
- [ ] Set max upload file size in php.ini
- [ ] Configure queue workers for image processing
- [ ] Set up storage symbolic link

### 7.4 Frontend Build
- [ ] Install carousel component dependencies
- [ ] Build and compile assets
- [ ] Test image upload on mobile devices

### 7.5 Monitoring
- [ ] Set up error tracking for image processing
- [ ] Monitor storage usage
- [ ] Track image optimization metrics
- [ ] Set up alerts for failed uploads

## 8. Performance Considerations

### 8.1 Optimization Strategies
- Use queue workers for variant generation
- Implement lazy loading for image grids
- Cache image URLs with CDN
- Use progressive image loading
- Implement virtual scrolling for large galleries

### 8.2 Storage Management
- Regular cleanup of orphaned images
- Monitor storage quotas
- Implement lifecycle policies for old images
- Compress images on upload

## 9. Security Measures

### 9.1 Upload Security
- Validate MIME types
- Check file headers (magic bytes)
- Scan for malware
- Limit upload rate per user
- Sanitize EXIF data

### 9.2 Access Control
- Verify permissions on image access
- Use signed URLs for private images
- Implement CORS policies
- Log all image operations

## 10. Future Enhancements

### 10.1 Phase 2 Features
- Bulk image operations
- Image tagging with AI
- 360-degree product views
- Image comparison tools
- Integration with external DAM

### 10.2 Advanced Features
- Automatic background removal
- Smart cropping
- Image search by similarity
- Watermarking capabilities
- Video support