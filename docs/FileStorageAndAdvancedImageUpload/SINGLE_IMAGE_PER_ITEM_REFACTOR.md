# Single Image Per Item Refactor Specification

## Overview

This document outlines the comprehensive refactoring required to modify the item image system from supporting multiple images per item to supporting only a **single image per item**. Additionally, the import process will be modified to no longer consider "-1" suffixes as indicators of secondary images.

## Current State Analysis

### Current Implementation
- Items can have multiple images (up to 5 per item)
- Images have a `display_order` and `is_primary` flag
- Import process recognizes patterns like `item-1.jpg`, `item-2.jpg` as multiple images for the same item
- Database has `item_images` table with many-to-one relationship to items
- Media library integration supports multiple images per item in the 'images' collection

### Key Components Affected
1. **Database Schema**
   - `item_images` table
   - `items` table (has `primary_image_id` field)
   - Media library associations

2. **Backend Models & Services**
   - `Item` model with `images()` relationship
   - `ItemImage` model
   - `ItemImageService`
   - `ItemImageBulkImportService` and `ItemImageBulkImportServiceV2`
   - Media library traits and services

3. **Frontend Components**
   - Item image display components
   - Image upload/import interfaces
   - Image carousel/grid views

## Proposed Changes

### 1. Database Schema Changes

#### Option A: Simplify Existing Structure (Recommended)
- Keep `item_images` table but enforce single image constraint
- Remove `display_order` field (no longer needed)
- Remove `is_primary` field (always true for single image)
- Add unique constraint on `item_id` to enforce one image per item

```sql
-- Migration to modify item_images table
ALTER TABLE item_images 
DROP COLUMN display_order,
DROP COLUMN is_primary,
ADD UNIQUE INDEX unique_item_image (item_id);
```

#### Option B: Embed in Items Table
- Remove `item_images` table entirely
- Add image fields directly to `items` table
- Simpler but less flexible for future changes

### 2. Backend Changes

#### 2.1 Model Updates

**Item Model (`app/Models/Production/Item.php`)**
```php
// Change relationship from hasMany to hasOne
public function image(): HasOne
{
    return $this->hasOne(ItemImage::class);
}

// Update or remove methods
- Remove: images() relationship
- Remove: primaryImage() relationship (no longer needed)
- Update: getPrimaryImageUrlAttribute() to use single image
- Update: getImageUrlsAttribute() to return single image data
```

**ItemImage Model (`app/Models/Production/ItemImage.php`)**
```php
// Remove fields from $fillable
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

// Remove from $casts
// Remove: 'is_primary' => 'boolean',
// Remove: 'display_order' => 'integer',
```

#### 2.2 Service Updates

**ItemImageService (`app/Services/Production/ItemImageService.php`)**
```php
public function attachImageToItem(Item $item, array $imageData): ItemImage
{
    // Check if item already has an image
    if ($item->image()->exists()) {
        // Delete existing image before adding new one
        $this->deleteItemImage($item->image);
    }
    
    // Create new image (simplified - no order or primary flag)
    return $item->image()->create($imageData);
}
```

**ItemImageBulkImportServiceV2 (`app/Services/Production/ItemImageBulkImportServiceV2.php`)**
```php
private function processItemBatch(array $items, array $fileMap, array &$summary): void
{
    foreach ($items as $entry) {
        // ... existing validation ...
        
        // Check if item already has an image
        if ($item->getMedia('images')->count() > 0) {
            $summary['errors'][] = "Item '{$item->item_number}' already has an image. Skipping.";
            $summary['imagesSkipped'] += count($images);
            continue;
        }
        
        // Process only the first image from the manifest
        $firstImage = $images[0] ?? null;
        if (!$firstImage) {
            continue;
        }
        
        // ... process single image ...
    }
}
```

#### 2.3 Controller Updates

**ItemImageController**
- Update `store()` method to replace existing image instead of adding
- Remove `updateOrder()` method (no longer needed)
- Remove `setPrimary()` method (no longer needed)
- Update `destroy()` to handle single image deletion

**ItemImageImportController**
- Update validation to accept only one image per item
- Modify import logic to ignore multiple images for same item

### 3. Frontend Changes

#### 3.1 Import Process Updates

**Import Pictures Component (`resources/js/pages/production/items/import-pictures.tsx`)**
```typescript
// Update parseFile to NOT treat -1 as a variant indicator
const parseFile = useCallback((fileName: string): { base: string; index: number } => {
    // Remove file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
    
    // Always use the full name as base (ignore -1, -2 suffixes)
    return { base: nameWithoutExt.trim(), index: 1 };
}, []);

// Update grouping logic to only keep first file per item
const handleFiles = useCallback(async (list: FileList) => {
    // ... existing validation ...
    
    newFiles.forEach((f) => {
        const { base } = parseFile(f.name);
        if (!base) {
            unmatchedList.push(f);
            return;
        }
        // Only keep first file for each base name
        if (!bucket[base]) {
            bucket[base] = [{ file: f, client_name: f.name, order: 1, is_primary: true }];
        }
    });
    
    // ... rest of method ...
}, [allowedExt, parseFile]);
```

#### 3.2 Display Component Updates

**ItemImageGrid Component**
- Remove grid layout, show single image
- Remove carousel functionality
- Simplify to single image display

**ItemImagePreview Component**
- Update to handle single image
- Remove navigation controls
- Simplify preview logic

**Item Form Components**
- Update image upload to replace instead of add
- Remove "Add another image" functionality
- Show single image upload slot

#### 3.3 Item Show Page Updates

**Item Show Component (`resources/js/pages/production/items/show.tsx`)**

The item show page needs several modifications to support single image:

```typescript
// Line 1107-1114: Update the images display logic
{item?.image ? (
    <ItemImageDisplay  // Renamed from ItemImageGrid
        itemId={item.id.toString()}
        image={item.image}  // Single image instead of images array
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

// Line 1125-1135: Update the uploader section
{can?.update && (
    <div>
        <h3 className="text-lg font-medium mb-2">Enviar Imagem</h3>
        <p className="text-sm text-gray-600 mb-4">
            Adicione uma imagem para ajudar a identificar este item. 
            {item?.image && "Enviar uma nova imagem substituirá a existente."}
        </p>
        <ItemImageUploader
            itemId={item?.id.toString() || ''}
            maxImages={1}  // Changed from 5 to 1
            currentImageCount={item?.image ? 1 : 0}  // Binary count
            enableDirectorySelection={false}  // Disable for single image
            onUploadComplete={() => {
                // Reload the item to show new image
                router.reload({ only: ['item'] });
            }}
        />
    </div>
)}
```

**Type Updates**

Update the Item interface to reflect single image:
```typescript
// In types/production.ts
export interface Item {
    // ... other fields ...
    image?: ItemImage;  // Changed from images?: ItemImage[]
    primary_image_url?: string;  // Keep for backward compatibility
    primary_image_data?: {
        url: string;
        blurhash?: string;
    };
}
```

**Component Changes Required**

1. **Create ItemImageDisplay Component** (replacing ItemImageGrid):
```typescript
// resources/js/components/production/ItemImageDisplay.tsx
import React from 'react';
import { ItemImage } from '@/types/production';
import { Button } from '@/components/ui/button';
import { Trash2, ZoomIn } from 'lucide-react';
import { ItemImagePreview } from './ItemImagePreview';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

interface ItemImageDisplayProps {
    itemId: string;
    image: ItemImage;
    canEdit: boolean;
    itemName: string;
}

export function ItemImageDisplay({ itemId, image, canEdit, itemName }: ItemImageDisplayProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja remover esta imagem?')) return;
        
        setDeleting(true);
        router.delete(route('production.items.images.destroy', {
            item: itemId,
            image: image.id
        }), {
            onSuccess: () => {
                toast.success('Imagem removida com sucesso');
            },
            onError: () => {
                toast.error('Erro ao remover imagem');
            },
            onFinish: () => setDeleting(false)
        });
    };

    return (
        <>
            <div className="relative group rounded-lg overflow-hidden bg-muted">
                <img
                    src={image.url}
                    alt={image.alt_text || itemName}
                    className="w-full h-64 object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => setShowPreview(true)}
                />
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowPreview(true)}
                    >
                        <ZoomIn className="h-4 w-4 mr-2" />
                        Visualizar
                    </Button>
                    
                    {canEdit && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                        </Button>
                    )}
                </div>
                
                {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm">{image.caption}</p>
                    </div>
                )}
            </div>

            {showPreview && (
                <ItemImagePreview
                    image={image}
                    itemName={itemName}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
}
```

2. **Update ItemImageUploader Component**:
- Modify to handle single image upload
- Add automatic replacement logic
- Remove multi-image selection UI
- Update progress indicators for single file

### 4. Migration Strategy

#### 4.1 Data Migration
1. For items with multiple images, keep only the primary image
2. If no primary image is marked, keep the first image (lowest display_order)
3. Archive or delete remaining images after user confirmation

```php
// Migration to clean up multiple images
public function up()
{
    DB::statement('
        DELETE i1 FROM item_images i1
        INNER JOIN item_images i2 
        WHERE i1.item_id = i2.item_id 
        AND (
            (i2.is_primary = 1 AND i1.is_primary = 0) OR
            (i1.is_primary = i2.is_primary AND i1.display_order > i2.display_order) OR
            (i1.is_primary = i2.is_primary AND i1.display_order = i2.display_order AND i1.id > i2.id)
        )
    ');
}
```

#### 4.2 Media Library Migration
```php
// Update media collections to enforce single item
public function registerMediaCollections(): void
{
    $this->addMediaCollection('images')
        ->singleFile() // Enforce single file
        ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
        ->useFallbackUrl('/images/no-image.jpg');
}
```

### 5. Testing Requirements

#### 5.1 Unit Tests
- Test single image constraint enforcement
- Test image replacement functionality
- Test import with various filename patterns

#### 5.2 Feature Tests
- Test image upload replaces existing image
- Test bulk import handles single image per item
- Test API endpoints return single image data

#### 5.3 Migration Tests
- Test data migration preserves correct images
- Test rollback functionality
- Test edge cases (items with no images, corrupted data)

### 6. Implementation Steps

1. **Phase 1: Backend Preparation**
   - Create new migration files
   - Update models and relationships
   - Modify services to handle single image

2. **Phase 2: Import Logic Update**
   - Modify import parsing to ignore -1 suffixes
   - Update bulk import to process only first image
   - Add validation for single image constraint

3. **Phase 3: Frontend Updates**
   - Update import wizard UI
   - Modify image display components
   - Update forms for single image upload

4. **Phase 4: Data Migration**
   - Run migration to clean up multiple images
   - Update media library associations
   - Verify data integrity

5. **Phase 5: Testing & Validation**
   - Run comprehensive test suite
   - Manual testing of all image workflows
   - Performance testing with large datasets

### 7. Rollback Plan

1. Keep backup of `item_images` table before migration
2. Maintain version tags in git for easy rollback
3. Create reverse migration to restore multi-image support
4. Document any manual steps required for rollback

### 8. Performance Considerations

- Single image per item will reduce database queries
- Simplified relationships will improve load times
- Less storage required for image variants
- Faster import process with single image validation

### 9. Future Considerations

- Easy to extend back to multiple images if needed
- Consider lazy loading for image data
- Implement image CDN integration
- Add image optimization pipeline

## Conclusion

This refactor will simplify the item image system while maintaining all necessary functionality. The key benefits include:
- Simpler data model
- Faster performance
- Easier maintenance
- Clearer user experience

The implementation should be done in phases with careful testing at each step to ensure data integrity and system stability.
