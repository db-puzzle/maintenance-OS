# Single Image Per Item - Implementation Steps

## Backend Implementation Steps

### Step 1: Database Migration

Create a new migration to modify the item_images table:

```bash
php artisan make:migration modify_item_images_for_single_image
```

**Migration content:**
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // First, clean up multiple images per item (keep only primary or first)
        DB::statement('
            DELETE i1 FROM item_images i1
            INNER JOIN (
                SELECT item_id, MIN(id) as keep_id
                FROM item_images
                GROUP BY item_id
                HAVING COUNT(*) > 1
            ) i2 ON i1.item_id = i2.item_id
            WHERE i1.id != i2.keep_id
        ');
        
        // Clean up items table primary_image_id references
        DB::statement('
            UPDATE items i
            SET i.primary_image_id = (
                SELECT id FROM item_images ii 
                WHERE ii.item_id = i.id 
                LIMIT 1
            )
            WHERE EXISTS (
                SELECT 1 FROM item_images ii2 
                WHERE ii2.item_id = i.id
            )
        ');
        
        // Modify the table structure
        Schema::table('item_images', function (Blueprint $table) {
            // Drop columns no longer needed
            $table->dropColumn(['display_order', 'is_primary']);
            
            // Add unique constraint to enforce one image per item
            $table->unique('item_id', 'unique_item_image');
        });
    }

    public function down(): void
    {
        Schema::table('item_images', function (Blueprint $table) {
            // Remove unique constraint
            $table->dropUnique('unique_item_image');
            
            // Re-add columns
            $table->integer('display_order')->default(0)->after('height');
            $table->boolean('is_primary')->default(false)->after('display_order');
            
            // Re-add indexes
            $table->index(['item_id', 'is_primary']);
            $table->index(['item_id', 'display_order']);
        });
    }
};
```

### Step 2: Update Models

**app/Models/Production/Item.php**
```php
// Replace the images() relationship with image()
public function image(): HasOne
{
    return $this->hasOne(ItemImage::class);
}

// Remove or deprecate these methods:
// - images() 
// - primaryImage()

// Update getPrimaryImageUrlAttribute()
public function getPrimaryImageUrlAttribute(): ?string
{
    // First check if we have new media library images
    if ($this->hasMedia('images')) {
        $media = $this->getFirstMedia('images');
        return $media ? $media->getUrl('preview') : null;
    }
    
    // Fall back to old system during migration
    if ($this->relationLoaded('image') && $this->image) {
        return $this->image->getVariantUrl('medium');
    }
    
    $image = $this->image()->first();
    return $image ? $image->getVariantUrl('medium') : null;
}

// Update getImageUrlsAttribute() to return single image
public function getImageUrlsAttribute(): array
{
    // First check if we have new media library images
    if ($this->hasMedia('images')) {
        $media = $this->getFirstMedia('images');
        if ($media) {
            return [[
                'id' => $media->uuid,
                'url' => $media->getUrl(),
                'thumbnail' => $media->getUrl('thumb'),
                'medium' => $media->getUrl('preview'),
                'blurhash' => $media->getCustomProperty('blurhash'),
                'caption' => $media->getCustomProperty('caption'),
            ]];
        }
    }
    
    // Fall back to old system
    $image = $this->relationLoaded('image') ? $this->image : $this->image()->first();
    if ($image) {
        return [[
            'id' => $image->id,
            'url' => $image->url,
            'thumbnail' => $image->getVariantUrl('thumbnail'),
            'medium' => $image->getVariantUrl('medium'),
            'blurhash' => null,
            'caption' => $image->caption,
        ]];
    }
    
    return [];
}

// Update media collections registration
public function registerMediaCollections(): void
{
    $this->addMediaCollection('images')
        ->singleFile() // Enforce single file
        ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
        ->useFallbackUrl('/images/no-image.jpg');
        
    $this->addMediaCollection('documents')
        ->acceptsMimeTypes([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
}
```

**app/Models/Production/ItemImage.php**
```php
// Update fillable array
protected $fillable = [
    'item_id',
    'filename',
    'storage_path',
    'mime_type',
    'file_size',
    'width',
    'height',
    'alt_text',
    'caption',
    'metadata',
    'uploaded_by',
    'was_optimized',
    'media_id',
];

// Update casts array
protected $casts = [
    'was_optimized' => 'boolean',
    'metadata' => 'array',
    'file_size' => 'integer',
    'width' => 'integer',
    'height' => 'integer',
];

// Remove variants relationship if only single size needed
```

### Step 3: Update Services

**app/Services/Production/ItemImageService.php**
```php
public function attachImageToItem(Item $item, array $imageData): ItemImage
{
    // Delete existing image if present
    if ($existingImage = $item->image()->first()) {
        $this->deleteItemImage($existingImage);
    }
    
    // Create new image
    return $item->image()->create($imageData);
}

// Remove methods related to:
// - reorderImages()
// - setPrimaryImage()
```

**app/Services/Production/ItemImageBulkImportServiceV2.php**
```php
private function processItemBatch(array $items, array $fileMap, array &$summary): void
{
    foreach ($items as $entry) {
        $identifier = $entry['identifier'] ?? null;
        $itemId = $entry['item_id'] ?? null;
        $images = $entry['images'] ?? [];

        // ... existing validation ...

        // Check if item already has an image
        if ($item->getMedia('images')->count() > 0) {
            $summary['errors'][] = "Item '{$item->item_number}' already has an image. Image will be replaced.";
            
            // Delete existing image
            $item->clearMediaCollection('images');
        }

        // Process only the first image
        $imageEntry = $images[0] ?? null;
        if (!$imageEntry) {
            $summary['imagesSkipped'] += count($images);
            continue;
        }

        $clientName = $imageEntry['client_name'] ?? null;
        if (!$clientName || !isset($fileMap[$clientName])) {
            $summary['errors'][] = "File '{$clientName}' not found in upload for item '{$item->item_number}'.";
            $summary['imagesSkipped']++;
            continue;
        }

        // ... rest of single image processing ...
        
        // Skip any additional images
        if (count($images) > 1) {
            $summary['imagesSkipped'] += (count($images) - 1);
            $summary['errors'][] = "Item '{$item->item_number}' had " . count($images) . " images in manifest. Only first image was imported.";
        }
    }
}
```

### Step 4: Update Controllers

**app/Http/Controllers/Production/ItemImageController.php**
```php
public function store(Request $request, Item $item)
{
    $this->authorize('update', $item);

    $request->validate([
        'image' => 'required|image|mimes:jpg,jpeg,png,webp,heic|max:10240',
        'alt_text' => 'nullable|string|max:255',
        'caption' => 'nullable|string|max:1000',
    ]);

    // Delete existing image if present
    if ($item->hasMedia('images')) {
        $item->clearMediaCollection('images');
    }

    // Add new image
    $media = $this->mediaService->addMediaToModel(
        $item,
        $request->file('image'),
        'images',
        [
            'uploaded_by' => auth()->id(),
            'alt_text' => $request->alt_text,
            'caption' => $request->caption,
        ]
    );

    return response()->json([
        'message' => 'Image uploaded successfully',
        'media' => new MediaResource($media),
    ]);
}

// Remove these methods:
// - updateOrder()
// - setPrimary()
```

## Frontend Implementation Steps

### Step 1: Update Import Logic

**resources/js/pages/production/items/import-pictures.tsx**
```typescript
// Update parseFile to ignore -1, -2 suffixes
const parseFile = useCallback((fileName: string): { base: string; index: number } => {
    // Remove file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
    
    // Use the full filename as the item identifier (ignore -1, -2 patterns)
    // This means "item-1.jpg" will be treated as item "item-1", not "item" with index 1
    return { base: nameWithoutExt.trim(), index: 1 };
}, []);

// Update file grouping logic
const handleFiles = useCallback(async (list: FileList) => {
    const newFiles: File[] = [];
    for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedExt.has(ext)) continue;
        newFiles.push(f);
    }

    // ... validation ...

    const bucket: Record<string, GroupedFile[]> = {};
    const unmatchedList: File[] = [];

    newFiles.forEach((f) => {
        const { base } = parseFile(f.name);
        if (!base) {
            unmatchedList.push(f);
            return;
        }
        
        // Only keep the first file for each unique base name
        if (!bucket[base]) {
            bucket[base] = [{
                file: f,
                client_name: f.name,
                order: 1,
                is_primary: true
            }];
        } else {
            // Log that we're skipping additional files for this item
            console.warn(`Skipping file ${f.name} - item ${base} already has an image`);
        }
    });

    setGroups(bucket);
    setUnmatched(unmatchedList);
    setIsScanning(false);
}, [allowedExt, parseFile]);

// Remove the "Select Top" dropdown from the UI
// Update the preview to show single image per item
```

### Step 2: Update Display Components

**resources/js/components/production/ItemImageGrid.tsx**
```typescript
// Rename to ItemImageDisplay.tsx and simplify
interface ItemImageDisplayProps {
    item: Item;
    onImageClick?: () => void;
    onUpload?: (file: File) => void;
    onDelete?: () => void;
}

export function ItemImageDisplay({ item, onImageClick, onUpload, onDelete }: ItemImageDisplayProps) {
    const imageUrl = item.primary_image_url;
    
    return (
        <div className="relative">
            {imageUrl ? (
                <div className="relative group">
                    <img
                        src={imageUrl}
                        alt={item.item_name}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer"
                        onClick={onImageClick}
                    />
                    {onDelete && (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
            )}
            
            {onUpload && (
                <UploadButton onUpload={onUpload} hasImage={!!imageUrl} />
            )}
        </div>
    );
}
```

**resources/js/types/production.ts**
```typescript
// Update Item interface to reflect single image
export interface Item {
    // ... other fields ...
    image?: ItemImage; // Single image instead of images array
    primary_image_url?: string;
    primary_image_data?: {
        url: string;
        blurhash?: string;
    };
    // Remove: images?: ItemImage[];
    // Remove: image_urls?: ImageUrl[];
}
```

**resources/js/pages/production/items/show.tsx**
```typescript
// Update the images tab content (around line 1102)
{
    id: 'images',
    label: 'Imagem', // Changed from 'Imagens'
    content: (
        <div className="py-6 space-y-8">
            <div>
                {item?.image ? (
                    <ItemImageDisplay
                        itemId={item.id.toString()}
                        image={item.image}
                        canEdit={can?.update || false}
                        itemName={item.name}
                    />
                ) : (
                    <EmptyCard
                        icon={Camera}
                        title="Nenhuma imagem"
                        description="Ainda não há imagem enviada para este item"
                    />
                )}
            </div>

            {can?.update && (
                <div>
                    <h3 className="text-lg font-medium mb-2">
                        {item?.image ? 'Substituir Imagem' : 'Enviar Imagem'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {item?.image 
                            ? "Enviar uma nova imagem substituirá a existente."
                            : "Adicione uma imagem para ajudar a identificar este item."
                        }
                    </p>
                    <ItemImageUploader
                        itemId={item?.id.toString() || ''}
                        maxImages={1}
                        currentImageCount={item?.image ? 1 : 0}
                        enableDirectorySelection={false}
                        onUploadComplete={() => {
                            router.reload({ only: ['item'] });
                        }}
                    />
                </div>
            )}
        </div>
    ),
},
```

### Step 3: Update Forms

**Item edit/create forms**
```typescript
// Update image upload section to handle single image
const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('_method', 'POST');
    
    try {
        const response = await axios.post(
            route('production.items.image.store', item.id),
            formData
        );
        
        // Update item data with new image
        setItem({
            ...item,
            primary_image_url: response.data.media.url,
        });
        
        toast.success('Image uploaded successfully');
    } catch (error) {
        toast.error('Failed to upload image');
    }
};
```

## Testing Strategy

### Backend Tests

```php
// tests/Feature/SingleItemImageTest.php
public function test_item_can_have_only_one_image()
{
    $item = Item::factory()->create();
    $user = User::factory()->create();
    
    // Upload first image
    $response = $this->actingAs($user)
        ->post(route('production.items.image.store', $item), [
            'image' => UploadedFile::fake()->image('test1.jpg'),
        ]);
    
    $response->assertSuccessful();
    $this->assertCount(1, $item->getMedia('images'));
    
    // Upload second image (should replace first)
    $response = $this->actingAs($user)
        ->post(route('production.items.image.store', $item), [
            'image' => UploadedFile::fake()->image('test2.jpg'),
        ]);
    
    $response->assertSuccessful();
    $this->assertCount(1, $item->getMedia('images'));
}

public function test_import_ignores_numbered_suffixes()
{
    $item = Item::factory()->create(['item_number' => 'TEST-001']);
    
    $files = [
        UploadedFile::fake()->image('TEST-001-1.jpg'),
        UploadedFile::fake()->image('TEST-001-2.jpg'),
    ];
    
    $manifest = [
        'items' => [
            [
                'identifier' => 'TEST-001-1',
                'images' => [['client_name' => 'TEST-001-1.jpg', 'order' => 1]],
            ],
            [
                'identifier' => 'TEST-001-2',
                'images' => [['client_name' => 'TEST-001-2.jpg', 'order' => 1]],
            ],
        ],
    ];
    
    // Both files should be treated as separate items, not variants
    // No item should match since TEST-001-1 !== TEST-001
}
```

### Frontend Tests

```typescript
// tests/components/ItemImageDisplay.test.tsx
describe('ItemImageDisplay', () => {
    it('shows single image when present', () => {
        const item = { 
            id: 1, 
            primary_image_url: '/test.jpg',
            item_name: 'Test Item'
        };
        
        render(<ItemImageDisplay item={item} />);
        expect(screen.getByAltText('Test Item')).toBeInTheDocument();
    });
    
    it('replaces image on new upload', async () => {
        // Test that uploading a new image replaces the existing one
    });
});
```

## Deployment Checklist

1. **Pre-deployment**
   - [ ] Backup item_images table
   - [ ] Test migration on staging environment
   - [ ] Verify rollback procedure

2. **Deployment**
   - [ ] Run database migration
   - [ ] Deploy backend changes
   - [ ] Deploy frontend changes
   - [ ] Clear caches

3. **Post-deployment**
   - [ ] Verify single image constraint is working
   - [ ] Test image upload/replace functionality
   - [ ] Monitor error logs for any issues
   - [ ] Verify import process handles files correctly

## Rollback Procedure

If issues arise, follow these steps:

1. Revert code deployment
2. Run down() migration to restore database schema
3. Restore item_images data from backup if needed
4. Clear all caches
5. Verify system functionality

## Performance Improvements

With single image per item:
- Reduced database queries (no need to fetch multiple images)
- Simplified eager loading (no collection to process)
- Faster page loads (less data to transfer)
- Reduced storage requirements (fewer image variants)
