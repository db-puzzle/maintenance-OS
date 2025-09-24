# Laravel Object Storage Migration Specification

## Executive Summary

This document outlines the comprehensive migration strategy for transitioning the Maintenance OS application to use Laravel Object Storage (Cloudflare R2) with Spatie Media Library as the unified file handling solution. The migration will consolidate all file operations while maintaining local storage for development environments.

## Important Prerequisites

Before implementing this migration, ensure the following requirement from [Laravel Cloud documentation](https://cloud.laravel.com/docs/resources/object-storage) is met:

```bash
composer require league/flysystem-aws-s3-v3 "^3.0" --with-all-dependencies
```

## Related Specifications

This specification focuses on the storage infrastructure. For enhanced upload and display features, refer to:

- **[Advanced Media Features Specification](./2_ADVANCED_MEDIA_FEATURES_SPECIFICATION.md)**: Covers client-side optimization, progressive image loading, BlurHash, chunked uploads UI, and duplicate detection
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)**: Current implementation status of media features

### Integration Points

1. **Chunked Uploads**: The Advanced Media Features spec defines the frontend chunked upload system. This spec ensures chunks are assembled locally before uploading to R2.

2. **Image Optimization**: Client-side optimization happens before storage (as defined in Advanced Media spec). Server-side processing handles conversions after storage.

3. **Media Metadata**: BlurHash and perceptual hashes (from Advanced Media spec) are stored as custom properties in Spatie Media Library.

4. **Display URLs**: The authenticated media URLs from this spec are used by the progressive image loading system defined in the Advanced Media spec.

## Table of Contents

1. [Overview](#overview)
2. [Laravel Cloud Bucket Configuration](#laravel-cloud-bucket-configuration)
3. [Architecture Design](#architecture-design)
4. [Environment Configuration](#environment-configuration)
5. [Migration Areas](#migration-areas)
6. [Implementation Strategy](#implementation-strategy)
7. [Technical Specifications](#technical-specifications)
8. [Development Workflow](#development-workflow)
9. [Testing Strategy](#testing-strategy)
10. [Rollout Plan](#rollout-plan)

## Overview

### Current State
- Mixed file storage approaches (direct Storage calls, custom implementations, partial Spatie usage)
- Production deployment on Laravel Cloud with R2 Object Storage
- Need for unified file handling across all modules
- Requirement for local development without cloud dependencies

### Target State
- All file operations through Spatie Media Library
- Seamless switching between local (development) and R2 (production) storage
- Consistent API across all file types
- Improved performance with CDN delivery
- Simplified codebase with reduced custom file handling

### Key Benefits
1. **Unified Storage API** - Single interface for all file operations
2. **Environment Flexibility** - Automatic local/cloud switching
3. **Built-in Features** - Conversions, optimizations, duplicate detection
4. **Cloud-Ready** - Native R2/S3 integration
5. **Performance** - CDN delivery, lazy loading, caching
6. **Security** - Centralized access control and signed URLs
7. **Maintainability** - Reduced custom code, better testing

## Laravel Cloud Bucket Configuration

### Bucket Setup in Laravel Cloud

Based on the [Laravel Cloud documentation](https://cloud.laravel.com/docs/resources/object-storage), we need to configure buckets properly:

1. **Creating Buckets**
   - Navigate to your environment's infrastructure canvas dashboard
   - Click "Add bucket" and select "Laravel Object Storage" as bucket type
   - Configure a single bucket:

   | Bucket Name | Disk Name | Visibility | Default | Purpose |
   |-------------|-----------|------------|---------|----------|
   | `default` | `default` | Private | Yes | All application files (auth required) |

2. **Important Considerations**
   - **Bucket Visibility**: Laravel Cloud buckets don't support mixed visibility within a single bucket
   - **CORS Policy**: Automatically configured for all environment domains
   - **Deployment**: Must redeploy environment after bucket attachment
   - **Disk Names**: Use in code via `Storage::disk('diskname')`

3. **Environment Variables (Auto-Injected)**
   ```env
   # Laravel Cloud automatically injects these
   FILESYSTEM_DISK=default
   AWS_ACCESS_KEY_ID=<auto-injected>
   AWS_SECRET_ACCESS_KEY=<auto-injected>
   AWS_DEFAULT_REGION=auto
   AWS_BUCKET=default
   AWS_URL=<public-url>
   AWS_ENDPOINT=<r2-endpoint>
   AWS_USE_PATH_STYLE_ENDPOINT=true
   ```

### Recommended Bucket Strategy

For our application, we'll use a **single private bucket** approach since all content requires authentication:

**Private Bucket** (`default`)
   - Item images and variants
   - Asset photos
   - QR codes
   - Templates
   - Work order attachments
   - Shipment photos
   - Form attachments
   - Exports and reports
   - Import files
   - All files require authentication and are served through Laravel controllers
   - Uses signed URLs for temporary access when needed

## Architecture Design

### Storage Disk Configuration

```php
// config/filesystems.php
'disks' => [
    // Default disk (Laravel Cloud will set FILESYSTEM_DISK)
    'default' => env('FILESYSTEM_DISK', 'local'),
    
    // Private R2 Storage (all files require authentication)
    'default' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'auto'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
        'throw' => false,
        'visibility' => 'private',
    ],
    
    // Local Media Storage (Development) - all private
    'media-local' => [
        'driver' => 'local',
        'root' => storage_path('app/media'),
        'visibility' => 'private',
        'serve' => false, // All files served through controllers
    ],
    
    // Temporary storage (always local)
    'temp' => [
        'driver' => 'local',
        'root' => storage_path('app/temp'),
        'visibility' => 'private',
    ],
],
```

### Media Library Configuration

```php
// config/media-library.php
return [
    'disk_name' => env('MEDIA_DISK', env('APP_ENV') === 'production' ? 'default' : 'media-local'),
    'queue_connection_name' => env('MEDIA_QUEUE_CONNECTION', 'database'),
    'queue_name' => env('MEDIA_QUEUE', ''),
    'queue_conversions_by_default' => env('MEDIA_QUEUE_CONVERSIONS', true),
    'media_model' => App\Models\Media::class,
    'path_generator' => App\Services\Media\MediaPathGenerator::class,
    'file_namer' => App\Services\Media\MediaFileNamer::class,
    'max_file_size' => 50 * 1024 * 1024, // 50MB
    'image_optimizers' => [
        // Optimizer configurations...
    ],
    'temporary_upload_expiration' => 24 * 60, // 24 hours
    'vapor_uploads' => false,
    'force_lazy_loading' => true,
];
```

### Environment Variables

```env
# Production (Laravel Cloud auto-injected)
APP_ENV=production
FILESYSTEM_DISK=default
AWS_ACCESS_KEY_ID=<auto-injected>
AWS_SECRET_ACCESS_KEY=<auto-injected>
AWS_DEFAULT_REGION=auto
AWS_BUCKET=default
AWS_URL=<auto-injected-url>
AWS_ENDPOINT=<auto-injected-r2-endpoint>
AWS_USE_PATH_STYLE_ENDPOINT=true

# Media Library Configuration
MEDIA_DISK=default

# Local Development
APP_ENV=local
FILESYSTEM_DISK=local
MEDIA_DISK=media-local
```

## Migration Areas

### 1. Item Images System

**Current Implementation:**
- Custom `ItemImage` and `ItemImageVariant` models
- Direct storage via `ImageProcessingService`
- Manual variant generation

**Migration Approach:**
```php
// app/Models/Production/Item.php
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Item extends Model implements HasMedia
{
    use InteractsWithMedia;
    
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp'])
            ->useDisk(MediaDiskResolver::getDiskForCollection('images'))
            ->singleFile(); // Only one image per item
    }
    
    public function registerMediaConversions(Media $media = null): void
    {
        // Conversions support the progressive image loading system
        // from Advanced Media Features specification
        
        $this->addMediaConversion('thumbnail')
            ->width(150)
            ->height(150)
            ->quality(80)
            ->optimize()
            ->nonQueued(); // Generate immediately for BlurHash
            
        $this->addMediaConversion('medium')
            ->width(800)
            ->height(800)
            ->quality(85)
            ->optimize();
            
        $this->addMediaConversion('large')
            ->width(1200)
            ->height(1200)
            ->quality(90)
            ->optimize();
            
        // Note: BlurHash generation happens via MediaObserver
        // as defined in Advanced Media Features spec
    }
}
```

### 2. Asset Photos

**Migration Approach:**
```php
// app/Models/AssetHierarchy/Asset.php
class Asset extends Model implements HasMedia
{
    use InteractsWithMedia;
    
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png'])
            ->useDisk(MediaDiskResolver::getDiskForCollection('photos'))
            ->singleFile();
    }
}
```

### 3. Shipment Photos

**Migration Approach:**
```php
// app/Models/Production/Shipment.php
class Shipment extends Model implements HasMedia
{
    use InteractsWithMedia;
    
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png'])
            ->useDisk(MediaDiskResolver::getDiskForCollection('photos'))
            ->useFallbackUrl('/images/no-shipment-photo.jpg');
    }
    
    // Store GPS data as custom properties
    public function addShipmentPhoto(UploadedFile $file, array $gpsData = []): Media
    {
        return $this->addMedia($file)
            ->withCustomProperties([
                'gps_latitude' => $gpsData['latitude'] ?? null,
                'gps_longitude' => $gpsData['longitude'] ?? null,
                'gps_altitude' => $gpsData['altitude'] ?? null,
                'captured_at' => $gpsData['captured_at'] ?? now(),
            ])
            ->toMediaCollection('photos');
    }
}
```

### 4. Work Order Attachments

**Migration Approach:**
```php
// app/Models/WorkOrders/WorkOrder.php
public function registerMediaCollections(): void
{
    $this->addMediaCollection('attachments')
        ->acceptsMimeTypes([
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])
        ->useDisk(MediaDiskResolver::getDiskForCollection('attachments'));
        
    $this->addMediaCollection('execution-photos')
        ->acceptsMimeTypes(['image/jpeg', 'image/png'])
        ->useDisk(MediaDiskResolver::getDiskForCollection('execution-photos'));
}
```

### 5. Form Response Attachments

**Migration Approach:**
```php
// app/Models/Forms/FormResponse.php
class FormResponse extends Model implements HasMedia
{
    use InteractsWithMedia;
    
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('attachments')
            ->acceptsMimeTypes([
                'application/pdf',
                'image/jpeg',
                'image/png',
                'video/mp4',
            ])
            ->useDisk(MediaDiskResolver::getDiskForCollection('attachments'))
            ->useFallbackPath('/files/no-attachment.png');
    }
}
```

### 6. Import/Export Files

**Migration Approach:**
```php
// app/Models/DataImport.php
class DataImport extends Model implements HasMedia
{
    use InteractsWithMedia;
    
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('import-files')
            ->acceptsMimeTypes([
                'text/csv',
                'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])
        ->useDisk(MediaDiskResolver::getDiskForCollection('import-files'))
        ->singleFile();
        
    $this->addMediaCollection('import-results')
        ->acceptsMimeTypes(['text/csv', 'application/json'])
        ->useDisk(MediaDiskResolver::getDiskForCollection('import-results'));
    }
}
```

### 7. QR Codes and Templates

**Migration Approach:**
```php
// app/Models/QrTagTemplate.php
class QrTagTemplate extends Model implements HasMedia
{
    use InteractsWithMedia;
    
    public function registerMediaCollections(): void
    {
    $this->addMediaCollection('templates')
        ->acceptsMimeTypes(['application/pdf'])
        ->useDisk(MediaDiskResolver::getDiskForCollection('templates'))
        ->singleFile();
        
    $this->addMediaCollection('generated-tags')
        ->acceptsMimeTypes(['application/pdf', 'image/png'])
        ->useDisk(MediaDiskResolver::getDiskForCollection('generated-tags'));
    }
}
```

## File Serving Strategy

Since all files are private and require authentication, we need to serve them through Laravel controllers:

### 1. Media Controller for Authenticated Access

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }
    
    /**
     * Serve a media file with authentication check
     */
    public function show(Media $media)
    {
        // Check if user has access to the media's parent model
        $this->authorize('view', $media->model);
        
        // For production (R2), generate temporary URL
        if (app()->environment('production')) {
            return redirect(
                Storage::disk($media->disk)->temporaryUrl(
                    $media->getPath(),
                    now()->addMinutes(5)
                )
            );
        }
        
        // For local development, stream the file
        return Storage::disk($media->disk)->response($media->getPath());
    }
    
    /**
     * Serve a conversion with authentication check
     */
    public function showConversion(Media $media, string $conversion)
    {
        // Check if user has access to the media's parent model
        $this->authorize('view', $media->model);
        
        $conversionPath = $media->getPath($conversion);
        
        // For production (R2), generate temporary URL
        if (app()->environment('production')) {
            return redirect(
                Storage::disk($media->conversions_disk ?? $media->disk)->temporaryUrl(
                    $conversionPath,
                    now()->addMinutes(5)
                )
            );
        }
        
        // For local development, stream the file
        return Storage::disk($media->conversions_disk ?? $media->disk)->response($conversionPath);
    }
}
```

### 2. Routes Configuration

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/media/{media}', [MediaController::class, 'show'])->name('media.show');
    Route::get('/media/{media}/conversions/{conversion}', [MediaController::class, 'showConversion'])->name('media.show-conversion');
});
```

### 3. Frontend Media URL Helper

```typescript
// resources/js/utils/media.ts
export function getMediaUrl(media: Media): string {
    return `/api/media/${media.id}`;
}

export function getConversionUrl(media: Media, conversion: string): string {
    return `/api/media/${media.id}/conversions/${conversion}`;
}

// Usage with Progressive Image Loading (from Advanced Media Features spec)
import { ProgressiveImage } from '@/components/media/ProgressiveImage';

<ProgressiveImage
    src={getMediaUrl(item.media[0])}
    srcSet={`
        ${getConversionUrl(item.media[0], 'thumbnail')} 150w,
        ${getConversionUrl(item.media[0], 'medium')} 800w,
        ${getConversionUrl(item.media[0], 'large')} 1200w
    `}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    alt={item.name}
    blurhash={item.media[0].custom_properties.blurhash}
    dominantColor={item.media[0].custom_properties.dominant_color}
/>
```

## Technical Specifications

### 1. Enhanced MediaDiskResolver

```php
<?php

namespace App\Services\Media;

class MediaDiskResolver
{
    // All collections are private - require authentication
    
    public static function getDefaultDisk(): string
    {
        return self::isProduction() ? 'default' : 'media-local';
    }
    
    public static function getDiskForCollection(string $collection): string
    {
        // All collections use the same private disk
        return self::getDefaultDisk();
    }
    
    public static function getTempDisk(): string
    {
        return 'temp'; // Always local
    }
    
    public static function isProduction(): bool
    {
        return app()->environment('production');
    }
    
    public static function shouldUseCdn(): bool
    {
        return self::isProduction() && config('media-library.use_cdn', true);
    }
}
```

### 2. Chunked Upload Service Refactor

**Note:** This service integrates with the Advanced Media Features chunked upload system defined in `2_ADVANCED_MEDIA_FEATURES_SPECIFICATION.md`. The key principle is that chunks are always assembled locally before being uploaded to R2.

```php
<?php

namespace App\Services;

use App\Models\ChunkedUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\HasMedia;

class ChunkedUploadService
{
    /**
     * Handle chunk upload - always stored locally during assembly
     * Implements the chunked upload pattern from Advanced Media Features spec
     */
    public function storeChunk(string $uploadId, int $chunkIndex, UploadedFile $chunk): void
    {
        $chunkPath = "chunks/{$uploadId}/{$chunkIndex}";
        Storage::disk('temp')->put($chunkPath, $chunk->get());
    }
    
    /**
     * Assemble chunks and add to media library
     */
    public function assembleAndStore(ChunkedUpload $upload, HasMedia $model, string $collection): Media
    {
        // Assemble chunks locally
        $tempPath = $this->assembleChunks($upload);
        
        try {
            // Create UploadedFile from assembled file
            $file = new UploadedFile(
                $tempPath,
                $upload->filename,
                $upload->mime_type,
                null,
                true
            );
            
            // Add to media library (will upload to R2 if in production)
            $media = $model->addMedia($file)
                ->withCustomProperties([
                    'uploaded_by' => $upload->user_id,
                    'chunked_upload' => true,
                    'original_size' => $upload->total_size,
                ])
                ->toMediaCollection($collection);
            
            // Clean up
            $this->cleanup($upload->id);
            unlink($tempPath);
            
            return $media;
            
        } catch (\Exception $e) {
            // Clean up on failure
            $this->cleanup($upload->id);
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
            throw $e;
        }
    }
    
    private function assembleChunks(ChunkedUpload $upload): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'upload_');
        $handle = fopen($tempPath, 'wb');
        
        for ($i = 0; $i < $upload->total_chunks; $i++) {
            $chunkPath = "chunks/{$upload->id}/{$i}";
            $chunkContent = Storage::disk('temp')->get($chunkPath);
            fwrite($handle, $chunkContent);
        }
        
        fclose($handle);
        return $tempPath;
    }
    
    private function cleanup(string $uploadId): void
    {
        Storage::disk('temp')->deleteDirectory("chunks/{$uploadId}");
    }
}
```

### 3. Image Processing Service Refactor

**Integration with Advanced Media Features:** This service works in conjunction with the client-side image optimization defined in `2_ADVANCED_MEDIA_FEATURES_SPECIFICATION.md`. Images are typically pre-optimized on the client before upload, but server-side processing may still be needed for:
- Generating additional conversions
- Processing files uploaded through other channels
- Applying server-side optimizations

```php
<?php

namespace App\Services\Media;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;

class MediaImageProcessingService
{
    /**
     * Process images that need local file access
     */
    public function processMediaImage(Media $media, callable $processor): Media
    {
        // For local storage, process directly
        if ($this->isLocalDisk($media->disk)) {
            $path = $media->getPath();
            $result = $processor($path);
            $this->updateMediaWithResult($media, $result);
            return $media;
        }
        
        // For cloud storage, download to temp first
        $tempPath = $this->downloadToTemp($media);
        
        try {
            $result = $processor($tempPath);
            $this->updateMediaWithResult($media, $result);
            return $media;
        } finally {
            // Always clean up temp file
            if (file_exists($tempPath)) {
                unlink($tempPath);
            }
        }
    }
    
    private function downloadToTemp(Media $media): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'media_');
        $stream = Storage::disk($media->disk)->readStream($media->getPath());
        file_put_contents($tempPath, $stream);
        return $tempPath;
    }
    
    private function isLocalDisk(string $disk): bool
    {
        return in_array($disk, ['local', 'media-local', 'media-local-private', 'public']);
    }
    
    private function updateMediaWithResult(Media $media, array $result): void
    {
        $media->setCustomProperty('processing_result', $result);
        $media->save();
    }
}
```

### 4. Storage Abstraction Layer

```php
<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class FileStorageService
{
    /**
     * Store any file using appropriate method
     */
    public function store(
        UploadedFile $file,
        HasMedia $model,
        string $collection,
        array $properties = []
    ): Media {
        // For large files, use chunked upload
        if ($file->getSize() > 10 * 1024 * 1024) { // 10MB
            return $this->storeChunked($file, $model, $collection, $properties);
        }
        
        // Standard upload via Spatie
        return $model->addMedia($file)
            ->withCustomProperties($properties)
            ->toMediaCollection($collection);
    }
    
    /**
     * Get file for local processing
     */
    public function getForLocalProcessing(Media $media): string
    {
        // If already local, return path
        if ($this->isLocalMedia($media)) {
            return $media->getPath();
        }
        
        // Download to temp
        return $this->downloadToTemp($media);
    }
    
    /**
     * Store temporary file (always local)
     */
    public function storeTemp(UploadedFile $file, string $directory = 'temp'): string
    {
        return Storage::disk('temp')->putFile($directory, $file);
    }
    
    /**
     * Move temp file to media library
     */
    public function moveFromTemp(
        string $tempPath,
        HasMedia $model,
        string $collection,
        string $filename = null
    ): Media {
        $fullPath = Storage::disk('temp')->path($tempPath);
        
        return $model->addMedia($fullPath)
            ->usingName($filename ?: basename($tempPath))
            ->toMediaCollection($collection);
    }
    
    private function isLocalMedia(Media $media): bool
    {
        return in_array($media->disk, ['local', 'media-local', 'media-local-private', 'public']);
    }
    
    private function downloadToTemp(Media $media): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'media_');
        $content = Storage::disk($media->disk)->get($media->getPath());
        file_put_contents($tempPath, $content);
        return $tempPath;
    }
}
```

## Implementation Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. **Configure Storage Disks**
   - Set up R2 disks in `filesystems.php`
   - Configure media library settings
   - Create MediaDiskResolver service

2. **Update Models**
   - Add `InteractsWithMedia` trait to all models
   - Define media collections
   - Set up conversions where needed

3. **Create Service Layer**
   - FileStorageService for abstraction
   - ChunkedUploadService refactor
   - MediaImageProcessingService

### Phase 2: Controller Updates (Week 2)

1. **Update Upload Controllers**
   - Replace direct storage calls
   - Use MediaService for uploads
   - Update validation rules

2. **Update Serving Controllers**
   - Use Spatie's response methods
   - Implement access control
   - Handle signed URLs for private files

3. **API Response Updates**
   - Use MediaResource for consistency
   - Include conversion URLs
   - Add metadata fields

### Phase 3: Frontend Updates (Week 3)

1. **Update Upload Components**
   - Use new API endpoints
   - Handle media response format
   - Update progress tracking

2. **Update Display Components**
   - Use conversion URLs
   - Implement lazy loading
   - Add fallback images

3. **Update File References**
   - Change from paths to media URLs
   - Update image variant calls
   - Handle temporary URLs

### Phase 4: Special Cases (Week 4)

1. **Chunked Uploads**
   - Maintain local assembly
   - Upload final files to R2
   - Update progress tracking

2. **Import/Export System**
   - Store imports as media
   - Generate exports to media
   - Handle large file downloads

3. **PDF Generation**
   - Download files for processing
   - Store generated PDFs
   - Clean up temp files

## Laravel Cloud Specific Considerations

### Working with Laravel Cloud Features

1. **Automatic CORS Configuration**
   - Laravel Cloud automatically configures CORS for your environment domains
   - No manual CORS setup required for bucket access
   - Ensures browser compatibility for direct uploads

2. **Bucket Credentials Access**
   - View credentials: Resources > Object storage > "..." > View credentials
   - Use for local development or external tools (e.g., Cyberduck)
   - Never commit credentials to version control

3. **Temporary URLs for Private Files**
   ```php
   // Generate temporary URL for private files
   $url = Storage::disk('private')->temporaryUrl(
       $media->getPath(),
       now()->addMinutes(5),
       [
           'ResponseContentDisposition' => 'attachment; filename="' . $media->file_name . '"'
       ]
   );
   ```

4. **Direct Browser Uploads**
   ```php
   // Generate presigned URL for direct browser upload
   $command = $s3Client->getCommand('PutObject', [
       'Bucket' => config('filesystems.disks.default.bucket'),
       'Key' => 'uploads/' . Str::uuid() . '/' . $filename,
   ]);
   
   $presignedUrl = $s3Client->createPresignedRequest($command, '+5 minutes')->getUri();
   ```

5. **Performance Optimization**
   - Use Laravel Cloud CDN URL for public assets
   - Implement browser caching headers
   - Consider image optimization before upload

## Development Workflow

### Local Development Setup

```bash
# .env.local
APP_ENV=local
FILESYSTEM_DISK=local
MEDIA_DISK=media-local
MEDIA_PRIVATE_DISK=media-local-private
MEDIA_USE_CDN=false

# Create local directories
php artisan storage:link
mkdir -p storage/app/media
mkdir -p storage/app/media-private
mkdir -p storage/app/temp
```

### Development Commands

```bash
# Clear media cache
php artisan media-library:clear

# Regenerate conversions
php artisan media-library:regenerate

# Clean orphaned media
php artisan media-library:clean

# Check media health
php artisan media:health-check
```

### Production Deployment

```bash
# Production .env (auto-configured by Laravel Cloud)
APP_ENV=production
FILESYSTEM_DISK=r2
MEDIA_DISK=r2
MEDIA_PRIVATE_DISK=r2-private
MEDIA_USE_CDN=true

# Run on deployment
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Testing Strategy

### 1. Unit Tests

```php
// tests/Unit/MediaDiskResolverTest.php
class MediaDiskResolverTest extends TestCase
{
    public function test_returns_local_disk_in_development()
    {
        app()->detectEnvironment(fn() => 'local');
        
        $this->assertEquals('media-local', MediaDiskResolver::getPublicDisk());
        $this->assertEquals('media-local-private', MediaDiskResolver::getPrivateDisk());
    }
    
    public function test_returns_r2_disk_in_production()
    {
        app()->detectEnvironment(fn() => 'production');
        
        $this->assertEquals('r2', MediaDiskResolver::getPublicDisk());
        $this->assertEquals('r2-private', MediaDiskResolver::getPrivateDisk());
    }
}
```

### 2. Feature Tests

```php
// tests/Feature/FileUploadTest.php
class FileUploadTest extends TestCase
{
    public function test_can_upload_item_image()
    {
        Storage::fake('media-local');
        
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg', 800, 600);
        
        $response = $this->postJson("/api/items/{$item->id}/images", [
            'image' => $file,
        ]);
        
        $response->assertStatus(201);
        $this->assertCount(1, $item->getMedia('images'));
        
        $media = $item->getFirstMedia('images');
        $this->assertEquals('product.jpg', $media->file_name);
        $this->assertTrue($media->hasGeneratedConversion('thumbnail'));
    }
}
```

### 3. Integration Tests

```php
// tests/Integration/ChunkedUploadTest.php
class ChunkedUploadTest extends TestCase
{
    public function test_can_upload_large_file_in_chunks()
    {
        Storage::fake('temp');
        Storage::fake('media-local');
        
        $uploadId = Str::uuid();
        $chunks = $this->createFileChunks('large-file.pdf', 5 * 1024 * 1024); // 5MB chunks
        
        foreach ($chunks as $index => $chunk) {
            $response = $this->postJson('/api/chunks', [
                'upload_id' => $uploadId,
                'chunk' => $chunk,
                'chunk_index' => $index,
                'total_chunks' => count($chunks),
            ]);
            
            $response->assertStatus(200);
        }
        
        // Verify assembly
        $upload = ChunkedUpload::find($uploadId);
        $this->assertEquals('completed', $upload->status);
        $this->assertNotNull($upload->media_id);
    }
}
```

## Rollout Plan

### Pre-Launch Checklist

- [ ] All storage disks configured
- [ ] Media library settings optimized
- [ ] Service layer implemented
- [ ] Controllers updated
- [ ] Frontend components updated
- [ ] Tests passing
- [ ] Documentation updated

### Deployment Steps

1. **Deploy Infrastructure**
   - Update environment variables
   - Configure R2 buckets
   - Set up CDN if applicable

2. **Deploy Code**
   - Deploy updated models
   - Deploy service layer
   - Deploy controllers
   - Deploy frontend

3. **Post-Deployment**
   - Monitor error logs
   - Check media uploads
   - Verify conversions
   - Test downloads

### Rollback Plan

In case of issues:
1. Revert environment variables
2. Revert code deployment
3. Restore previous storage configuration
4. Investigate and fix issues
5. Plan new deployment

## Important Laravel Cloud Limitations & Best Practices

Based on the [Laravel Cloud documentation](https://cloud.laravel.com/docs/resources/object-storage):

### Bucket Limitations

1. **Single Visibility per Bucket**
   - Cannot mix public and private files in the same bucket
   - All our files require authentication, so we use a single private bucket
   - This simplifies configuration and ensures consistent security

2. **Bucket Naming**
   - Disk names should be simple and descriptive
   - Avoid special characters in bucket names
   - Use the disk name in code: `Storage::disk('diskname')`

3. **Deployment Requirements**
   - Must redeploy environment after attaching buckets
   - Environment variables are injected during deployment
   - Changes to bucket configuration require redeployment

### Best Practices

1. **Consistent Security Model**
   - All files require authentication
   - Use temporary signed URLs for file access
   - Implement proper authorization checks in controllers

2. **Leverage Automatic Features**
   - CORS is automatically configured - don't override
   - Use Laravel Cloud CDN URLs for public assets
   - Take advantage of automatic environment variable injection

3. **Security Considerations**
   - Always use signed URLs for private content
   - Set appropriate expiration times for temporary URLs
   - Never expose bucket credentials in frontend code

4. **Performance Tips**
   - Upload images in optimized formats
   - Use conversions for different sizes
   - Implement lazy loading for images
   - Cache URLs when possible

5. **Cost Optimization**
   - Monitor storage usage regularly
   - Implement file cleanup policies
   - Use appropriate file compression
   - Delete unused conversions

## Monitoring and Maintenance

### Key Metrics

- Upload success rate
- Conversion processing time
- Storage usage by type
- CDN hit rate
- Error rates by operation

### Maintenance Tasks

```bash
# Daily
php artisan media:cleanup-temp

# Weekly  
php artisan media:cleanup-orphaned
php artisan media:check-health

# Monthly
php artisan media:optimize-storage
php artisan media:generate-report
```

### Alerts

Set up monitoring for:
- Failed uploads > 5% in 5 minutes
- Conversion queue depth > 1000
- Storage errors
- CDN availability
- Disk space usage > 80%

## Conclusion

This migration will standardize all file operations in the Maintenance OS application, providing a robust, scalable solution that works seamlessly in both local development and production environments. The use of Spatie Media Library with Laravel Object Storage ensures future scalability while maintaining developer productivity.
