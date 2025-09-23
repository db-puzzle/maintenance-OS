# File Storage and Media Handling Specification

## Overview

This document outlines the implementation strategy for migrating the Maintenance OS file storage system to use Spatie Media Library with Laravel Cloud Object Storage (Cloudflare R2). The architecture is designed to be multi-tenancy ready while serving the current single-tenant application efficiently.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Goals](#architecture-goals)
3. [Technology Stack](#technology-stack)
4. [Implementation Architecture](#implementation-architecture)
5. [Media Collections Strategy](#media-collections-strategy)
6. [Storage Configuration](#storage-configuration)
7. [Migration Plan](#migration-plan)
8. [Security Architecture](#security-architecture)
9. [Performance Optimization](#performance-optimization)
10. [API Design](#api-design)
11. [Frontend Integration](#frontend-integration)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Current State Analysis

### Existing Implementation
- **Custom image handling** via `ImageProcessingService`
- **Manual variant generation** using Intervention Image
- **Database tables**: `item_images` and `item_image_variants`
- **Queue-based processing**: `GenerateImageVariants` job
- **Storage**: Local filesystem with manual path management
- **Serving**: Through Laravel controllers with authentication

### Current Pain Points
1. No retry logic for failed variant generation
2. Memory-intensive image processing
3. Manual file path management
4. No CDN integration
5. Complex serving through application layer
6. Limited file type support (images only)

## Architecture Goals

### Primary Objectives
1. **Simplify file management** with battle-tested Media Library
2. **Improve performance** with CDN delivery via Laravel Cloud Storage
3. **Reduce complexity** by eliminating custom variant generation
4. **Enable scalability** with cloud storage
5. **Prepare for multi-tenancy** without over-engineering

### Design Principles
- **Progressive Enhancement**: Start simple, add features as needed
- **Backward Compatibility**: Maintain existing functionality during migration
- **Future-Proof**: Design with multi-tenancy in mind
- **Performance First**: Optimize for speed and efficiency
- **Security by Default**: Implement proper access controls

## Technology Stack

### Core Dependencies
```json
{
  "spatie/laravel-medialibrary": "^11.0",
  "league/flysystem-aws-s3-v3": "^3.0",
  "spatie/image": "^3.0",
  "spatie/laravel-image-optimizer": "^1.7"
}
```

### Infrastructure
- **Storage**: Laravel Cloud Object Storage (Cloudflare R2)
- **CDN**: Built-in Cloudflare CDN
- **Queue**: Existing database queue (future: Redis)
- **Cache**: Database cache (future: Redis)

## Implementation Architecture

### Storage Structure
```
r2-bucket/
├── media/                          # All media files
│   ├── {media-id}/                # UUID-based folders
│   │   ├── conversions/           # Generated variants
│   │   │   ├── thumb/            # Thumbnail versions
│   │   │   ├── preview/          # Preview versions
│   │   │   └── optimized/        # Optimized versions
│   │   └── {original-file}       # Original upload
│   └── temp/                     # Temporary uploads
└── exports/                      # Generated exports (PDFs, CSVs)
    └── {year}/{month}/          # Date-organized exports
```

### Model Architecture

#### Base Media Trait
```php
namespace App\Traits;

use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

trait HasMediaTrait
{
    use InteractsWithMedia;
    
    /**
     * Future-proof: This method will use tenant context when implemented
     */
    public function getMediaStoragePath(): string
    {
        // Single-tenant for now, but structure supports future tenant isolation
        return 'media';
    }
    
    /**
     * Common media conversions for all models
     */
    public function registerMediaConversions(Media $media = null): void
    {
        // Thumbnail for grids and lists
        $this->addMediaConversion('thumb')
            ->width(150)
            ->height(150)
            ->sharpen(10)
            ->optimize()
            ->nonQueued(); // Generate immediately for better UX
            
        // Preview for cards and modals
        $this->addMediaConversion('preview')
            ->width(400)
            ->height(400)
            ->quality(90)
            ->optimize();
            
        // Large optimized version
        $this->addMediaConversion('large')
            ->width(1200)
            ->height(1200)
            ->quality(85)
            ->optimize()
            ->performOnCollections('images', 'documents');
    }
}
```

## Media Collections Strategy

### Collection Types

#### 1. Item Images Collection
```php
// In Item model
public function registerMediaCollections(): void
{
    $this->addMediaCollection('images')
        ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
        ->useDisk('r2')
        ->useFallbackUrl('/images/no-image.jpg')
        ->singleFile(false); // Multiple images allowed
}
```

#### 2. Document Attachments Collection
```php
// In WorkOrder, MaintenanceExecution models
public function registerMediaCollections(): void
{
    $this->addMediaCollection('attachments')
        ->acceptsMimeTypes([
            'application/pdf',
            'image/jpeg', 
            'image/png',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])
        ->useDisk('r2')
        ->singleFile(false);
}
```

#### 3. Generated Reports Collection
```php
// In ExecutionExport model
public function registerMediaCollections(): void
{
    $this->addMediaCollection('exports')
        ->acceptsMimeTypes(['application/pdf', 'text/csv'])
        ->useDisk('r2')
        ->singleFile(true);
}
```

#### 4. QR Code Templates Collection
```php
// In QrTagTemplate model
public function registerMediaCollections(): void
{
    $this->addMediaCollection('templates')
        ->acceptsMimeTypes(['application/pdf'])
        ->useDisk('r2')
        ->singleFile(true);
}
```

## Storage Configuration

### Environment-Specific Storage Strategy

#### Local Development
```php
// config/filesystems.php (local environment)
'disks' => [
    'media' => [
        'driver' => 'local',
        'root' => storage_path('app/media'),
        'url' => env('APP_URL').'/storage/media',
        'visibility' => 'public',
        'throw' => false,
    ],
    
    'media-private' => [
        'driver' => 'local',
        'root' => storage_path('app/media-private'),
        'serve' => false, // Don't serve directly
        'throw' => false,
    ],
],
```

**Local Development Benefits:**
- Fast uploads and processing
- No external dependencies
- Easy debugging and inspection
- Cost-free development

#### Remote Development (Staging)
```php
// config/filesystems.php (staging environment)
'disks' => [
    'media' => [
        'driver' => 's3',
        'key' => env('R2_ACCESS_KEY_ID'),
        'secret' => env('R2_SECRET_ACCESS_KEY'),
        'region' => 'auto',
        'bucket' => env('R2_BUCKET', 'maintenance-os-staging'),
        'url' => env('R2_URL'),
        'endpoint' => env('R2_ENDPOINT'),
        'use_path_style_endpoint' => true,
        'throw' => true, // Throw exceptions in staging for debugging
        'visibility' => 'public',
    ],
    
    'media-private' => [
        'driver' => 's3',
        'key' => env('R2_ACCESS_KEY_ID'),
        'secret' => env('R2_SECRET_ACCESS_KEY'),
        'region' => 'auto',
        'bucket' => env('R2_PRIVATE_BUCKET', 'maintenance-os-staging-private'),
        'url' => env('R2_PRIVATE_URL'),
        'endpoint' => env('R2_ENDPOINT'),
        'use_path_style_endpoint' => true,
        'throw' => true,
        'visibility' => 'private',
    ],
],
```

**Staging Benefits:**
- Test cloud storage integration
- Validate CDN performance
- Separate from production data
- Real-world testing environment

#### Production
```php
// config/filesystems.php (production environment)
'disks' => [
    'media' => [
        'driver' => 's3',
        'key' => env('R2_ACCESS_KEY_ID'),
        'secret' => env('R2_SECRET_ACCESS_KEY'),
        'region' => 'auto',
        'bucket' => env('R2_BUCKET', 'maintenance-os-production'),
        'url' => env('R2_URL'),
        'endpoint' => env('R2_ENDPOINT'),
        'use_path_style_endpoint' => true,
        'throw' => false, // Don't throw in production
        'visibility' => 'public',
        'cache' => [
            'store' => 'redis',
            'expire' => 600,
            'prefix' => 'r2-cache',
        ],
    ],
    
    'media-private' => [
        'driver' => 's3',
        'key' => env('R2_ACCESS_KEY_ID'),
        'secret' => env('R2_SECRET_ACCESS_KEY'),
        'region' => 'auto',
        'bucket' => env('R2_PRIVATE_BUCKET', 'maintenance-os-production-private'),
        'url' => env('R2_PRIVATE_URL'),
        'endpoint' => env('R2_ENDPOINT'),
        'use_path_style_endpoint' => true,
        'throw' => false,
        'visibility' => 'private',
        'cache' => [
            'store' => 'redis',
            'expire' => 600,
            'prefix' => 'r2-private-cache',
        ],
    ],
],
```

**Production Benefits:**
- Maximum performance with caching
- Global CDN distribution
- Separate public/private buckets
- Error resilience

### Environment Variable Configuration

#### .env.local
```env
# Local Development Storage
FILESYSTEM_DISK=local
MEDIA_DISK=media
MEDIA_PRIVATE_DISK=media-private

# No R2 credentials needed for local
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PRIVATE_BUCKET=
R2_URL=
R2_ENDPOINT=

# Local URLs
APP_URL=http://maintenance-os.test
MEDIA_URL_LOCAL=http://maintenance-os.test/storage/media
```

#### .env.staging
```env
# Staging Storage (Laravel Cloud)
FILESYSTEM_DISK=r2
MEDIA_DISK=media
MEDIA_PRIVATE_DISK=media-private

# R2 Credentials (from Laravel Cloud)
R2_ACCESS_KEY_ID=your_staging_access_key
R2_SECRET_ACCESS_KEY=your_staging_secret_key
R2_BUCKET=maintenance-os-staging
R2_PRIVATE_BUCKET=maintenance-os-staging-private
R2_URL=https://staging.maintenance-os.r2.dev
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com

# Staging URL
APP_URL=https://staging.maintenance-os.com
```

#### .env.production
```env
# Production Storage (Laravel Cloud)
FILESYSTEM_DISK=r2
MEDIA_DISK=media
MEDIA_PRIVATE_DISK=media-private

# R2 Credentials (from Laravel Cloud)
R2_ACCESS_KEY_ID=${LARAVEL_CLOUD_R2_ACCESS_KEY}
R2_SECRET_ACCESS_KEY=${LARAVEL_CLOUD_R2_SECRET_KEY}
R2_BUCKET=maintenance-os-production
R2_PRIVATE_BUCKET=maintenance-os-production-private
R2_URL=https://cdn.maintenance-os.com
R2_ENDPOINT=${LARAVEL_CLOUD_R2_ENDPOINT}

# Production URL
APP_URL=https://maintenance-os.com

# Cache Configuration
CACHE_DRIVER=redis
REDIS_HOST=${LARAVEL_CLOUD_REDIS_HOST}
REDIS_PASSWORD=${LARAVEL_CLOUD_REDIS_PASSWORD}
REDIS_PORT=6379
```

### Dynamic Disk Resolution

```php
// app/Services/MediaDiskResolver.php
namespace App\Services;

class MediaDiskResolver
{
    public static function getPublicDisk(): string
    {
        return config('media-library.disk_name', 'media');
    }
    
    public static function getPrivateDisk(): string
    {
        return config('media-library.private_disk_name', 'media-private');
    }
    
    public static function getDiskForCollection(string $collection): string
    {
        $privatecollections = [
            'attachments',
            'exports',
            'financial-documents',
            'employee-files',
        ];
        
        return in_array($collection, $privatecollections)
            ? self::getPrivateDisk()
            : self::getPublicDisk();
    }
    
    public static function isLocalEnvironment(): bool
    {
        return app()->environment('local');
    }
    
    public static function shouldUseCdn(): bool
    {
        return !self::isLocalEnvironment() && config('media-library.use_cdn', true);
    }
}
```

### Media Library Environment Configuration

```php
// config/media-library.php
return [
    'disk_name' => env('MEDIA_DISK', 'media'),
    'private_disk_name' => env('MEDIA_PRIVATE_DISK', 'media-private'),
    
    // Use CDN URLs in non-local environments
    'use_cdn' => env('MEDIA_USE_CDN', !app()->environment('local')),
    
    // Local development uses synchronous conversions for immediate feedback
    'queue_conversions_by_default' => env('QUEUE_MEDIA_CONVERSIONS', !app()->environment('local')),
    
    // Environment-specific temporary upload disk
    'temporary_upload_disk' => app()->environment('local') ? 'local' : 'media-temp',
    
    // Optimization settings per environment
    'image_optimizers' => app()->environment('production') ? [
        // Aggressive optimization in production
        Spatie\ImageOptimizer\Optimizers\Jpegoptim::class => [
            '-m85',
            '--strip-all',
            '--all-progressive',
        ],
        // ... other optimizers
    ] : [
        // Faster, less aggressive optimization in development
        Spatie\ImageOptimizer\Optimizers\Jpegoptim::class => [
            '-m90',
            '--strip-all',
        ],
    ],
];
```

### Environment Synchronization Strategy

```php
// app/Console/Commands/MediaSyncEnvironments.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MediaSyncEnvironments extends Command
{
    protected $signature = 'media:sync 
                            {--from=production : Source environment}
                            {--to=staging : Target environment}
                            {--collection= : Specific collection to sync}
                            {--recent=7 : Sync only files from last N days}';
    
    protected $description = 'Sync media files between environments';
    
    public function handle()
    {
        $from = $this->option('from');
        $to = $this->option('to');
        
        if ($from === 'production' && app()->environment() !== 'local') {
            $this->error('Production sync can only be run from local environment');
            return 1;
        }
        
        $this->info("Syncing media from {$from} to {$to}...");
        
        // Implementation for safe environment syncing
        // This ensures developers have realistic data without affecting production
    }
}
```

### Storage Testing Strategy

```php
// tests/Feature/MediaStorageTest.php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Models\Production\Item;

class MediaStorageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        // Use fake storage for testing
        Storage::fake('media');
        Storage::fake('media-private');
        
        // Configure media library for testing
        config(['media-library.disk_name' => 'media']);
        config(['media-library.private_disk_name' => 'media-private']);
    }
    
    public function test_item_image_upload_uses_correct_disk()
    {
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg');
        
        $media = $item->addMedia($file)->toMediaCollection('images');
        
        // Assert file exists in correct disk
        Storage::disk('media')->assertExists($media->getPath());
        
        // Assert conversions were created
        $this->assertNotEmpty($media->getGeneratedConversions());
    }
    
    public function test_private_documents_use_private_disk()
    {
        $workOrder = WorkOrder::factory()->create();
        $file = UploadedFile::fake()->create('report.pdf', 1000);
        
        $media = $workOrder->addMedia($file)->toMediaCollection('attachments');
        
        // Assert file exists in private disk
        Storage::disk('media-private')->assertExists($media->getPath());
    }
}
```

### Environment-Specific Bucket Structure

```
Local Development:
storage/app/
├── media/                    # Public files
│   └── {media-files}
├── media-private/           # Private files
│   └── {private-files}
└── media-temp/              # Temporary uploads

Staging (R2):
maintenance-os-staging/      # Public bucket
├── media/
│   └── {uuid}/
└── temp/

maintenance-os-staging-private/  # Private bucket
└── media/
    └── {uuid}/

Production (R2):
maintenance-os-production/   # Public bucket with CDN
├── media/
│   └── {uuid}/
└── temp/

maintenance-os-production-private/  # Private bucket
└── media/
    └── {uuid}/
```

### Deployment Configuration

```yaml
# .laravel-cloud.yml
environments:
  production:
    storage:
      - type: r2
        name: maintenance-os-production
        public: true
        cors: true
        cdn: true
      - type: r2
        name: maintenance-os-production-private
        public: false
        cors: false
        
  staging:
    storage:
      - type: r2
        name: maintenance-os-staging
        public: true
        cors: true
        cdn: false  # Optional CDN for staging
      - type: r2
        name: maintenance-os-staging-private
        public: false
        cors: false
```

### Media Library Configuration
```php
// config/media-library.php
return [
    'disk_name' => env('MEDIA_DISK', 'r2'),
    
    'max_file_size' => 50 * 1024 * 1024, // 50MB
    
    'queue_conversions_by_default' => true,
    
    'queue_connection_name' => env('QUEUE_CONNECTION', 'database'),
    
    'media_model' => App\Models\Media::class,
    
    'temporary_upload_disk' => 'local',
    
    'enable_temporary_uploads_session_affinity' => true,
    
    'generate_thumbnails_for_temporary_uploads' => true,
    
    'file_namer' => Spatie\MediaLibrary\Support\FileNamer\DefaultFileNamer::class,
    
    'path_generator' => App\Services\MediaPathGenerator::class,
    
    'image_optimizers' => [
        Spatie\ImageOptimizer\Optimizers\Jpegoptim::class => [
            '-m85',
            '--strip-all',
            '--all-progressive',
        ],
        Spatie\ImageOptimizer\Optimizers\Pngquant::class => [
            '--force',
            '--skip-if-larger',
        ],
        Spatie\ImageOptimizer\Optimizers\Optipng::class => [
            '-i0',
            '-o2',
            '-quiet',
        ],
        Spatie\ImageOptimizer\Optimizers\Svgo::class => [
            '--disable=cleanupIDs',
        ],
        Spatie\ImageOptimizer\Optimizers\Gifsicle::class => [
            '-b',
            '-O3',
        ],
        Spatie\ImageOptimizer\Optimizers\Cwebp::class => [
            '-m 6',
            '-pass 10',
            '-mt',
            '-q 85',
        ],
    ],
    
    'image_drivers' => [
        'gd' => 'gd',
        'imagick' => 'imagick',
    ],
    
    'temporary_upload_expiration' => 60 * 24, // 24 hours
    
    'prefix' => env('MEDIA_PREFIX', ''), // Future: tenant-specific prefix
];
```

### Custom Path Generator
```php
namespace App\Services;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\PathGenerator\PathGenerator;

class MediaPathGenerator implements PathGenerator
{
    public function getPath(Media $media): string
    {
        // Future-ready: Can add tenant prefix here
        return $this->getBasePath($media) . '/';
    }
    
    public function getPathForConversions(Media $media): string
    {
        return $this->getBasePath($media) . '/conversions/';
    }
    
    public function getPathForResponsiveImages(Media $media): string
    {
        return $this->getBasePath($media) . '/responsive/';
    }
    
    protected function getBasePath(Media $media): string
    {
        // Use UUID for better distribution and uniqueness
        // Future: prefix with tenant ID
        return 'media/' . $media->uuid;
    }
}
```

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1)

#### Day 1-2: Package Installation
```bash
composer require spatie/laravel-medialibrary
composer require league/flysystem-aws-s3-v3 "^3.0"
composer require spatie/laravel-image-optimizer

php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider" --tag="medialibrary-migrations"
php artisan vendor:publish --provider="Spatie\MediaLibrary\MediaLibraryServiceProvider" --tag="medialibrary-config"
```

#### Day 3-4: Laravel Cloud Storage Setup
1. Create R2 buckets in Laravel Cloud dashboard
2. Configure CORS policies
3. Set up environment variables
4. Test connectivity

#### Day 5: Custom Media Model
```php
namespace App\Models;

use Spatie\MediaLibrary\MediaCollections\Models\Media as BaseMedia;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Media extends BaseMedia
{
    protected $fillable = [
        'model_type',
        'model_id',
        'uuid',
        'collection_name',
        'name',
        'file_name',
        'mime_type',
        'disk',
        'conversions_disk',
        'size',
        'manipulations',
        'custom_properties',
        'generated_conversions',
        'responsive_images',
        'order_column',
        'created_at',
        'updated_at',
    ];
    
    protected $casts = [
        'manipulations' => 'array',
        'custom_properties' => 'array',
        'generated_conversions' => 'array',
        'responsive_images' => 'array',
        'size' => 'integer',
        'order_column' => 'integer',
    ];
    
    /**
     * Track who uploaded the file
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'custom_properties->uploaded_by');
    }
    
    /**
     * Future-proof: Add tenant scoping here when needed
     */
    public function scopeForCurrentContext($query)
    {
        // Currently no-op, but will add tenant scoping later
        return $query;
    }
}
```

### Phase 2: Model Integration (Week 2)

#### Update Item Model
```php
namespace App\Models\Production;

use App\Traits\HasMediaTrait;
use Spatie\MediaLibrary\HasMedia;

class Item extends Model implements HasMedia
{
    use HasMediaTrait;
    
    /**
     * Register media collections
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
            ->useDisk('r2')
            ->useFallbackUrl('/images/no-image.jpg');
    }
    
    /**
     * Get primary image (backward compatibility)
     */
    public function getPrimaryImageAttribute()
    {
        return $this->getFirstMedia('images');
    }
    
    /**
     * Get primary image URL (backward compatibility)
     */
    public function getPrimaryImageUrlAttribute()
    {
        return $this->getFirstMediaUrl('images');
    }
    
    /**
     * Get primary image thumbnail URL
     */
    public function getPrimaryImageThumbnailUrlAttribute()
    {
        return $this->getFirstMediaUrl('images', 'thumb');
    }
}
```

### Phase 3: Migration Script (Week 3)

```php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Production\Item;
use App\Models\Production\ItemImage;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class MigrateItemImagesToMediaLibrary extends Command
{
    protected $signature = 'media:migrate-item-images 
                            {--batch=100 : Number of images to process per batch}
                            {--dry-run : Run without making changes}';
    
    protected $description = 'Migrate existing item images to Spatie Media Library';
    
    public function handle()
    {
        $this->info('Starting migration of item images to Media Library...');
        
        $totalImages = ItemImage::count();
        $this->info("Found {$totalImages} images to migrate");
        
        $progress = $this->output->createProgressBar($totalImages);
        
        ItemImage::with(['item', 'uploader'])
            ->chunk($this->option('batch'), function ($images) use ($progress) {
                foreach ($images as $image) {
                    $this->migrateImage($image);
                    $progress->advance();
                }
            });
        
        $progress->finish();
        $this->newLine();
        $this->info('Migration completed!');
    }
    
    protected function migrateImage(ItemImage $image)
    {
        try {
            if ($this->option('dry-run')) {
                $this->info("Would migrate: {$image->filename}");
                return;
            }
            
            // Check if already migrated
            if ($image->media_id) {
                return;
            }
            
            // Get the file from storage
            if (!Storage::exists($image->storage_path)) {
                $this->error("File not found: {$image->storage_path}");
                return;
            }
            
            DB::transaction(function () use ($image) {
                // Create temporary file
                $tempPath = tempnam(sys_get_temp_dir(), 'media_migration');
                file_put_contents($tempPath, Storage::get($image->storage_path));
                
                // Add to media library
                $media = $image->item
                    ->addMedia($tempPath)
                    ->withCustomProperties([
                        'original_id' => $image->id,
                        'uploaded_by' => $image->uploaded_by,
                        'was_optimized' => $image->was_optimized,
                        'migrated_at' => now(),
                    ])
                    ->usingName($image->filename)
                    ->usingFileName($image->filename)
                    ->preservingOriginal()
                    ->toMediaCollection('images');
                
                // Update item image record with media ID
                $image->update(['media_id' => $media->id]);
                
                // Set as primary if needed
                if ($image->is_primary) {
                    $media->setCustomProperty('is_primary', true);
                    $media->save();
                }
            });
            
        } catch (\Exception $e) {
            $this->error("Failed to migrate image {$image->id}: " . $e->getMessage());
            Log::error('Image migration failed', [
                'image_id' => $image->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
```

## Security Architecture

### Access Control Strategy

#### Public Collections
```php
// For public images (item photos, etc.)
class PublicMediaController extends Controller
{
    public function show(Media $media)
    {
        // Public media can be accessed directly
        if (in_array($media->collection_name, ['images', 'public-documents'])) {
            return redirect($media->getUrl());
        }
        
        abort(404);
    }
}
```

#### Private Collections
```php
// For private files (work orders, reports, etc.)
class SecureMediaController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }
    
    public function download(Media $media)
    {
        // Check if user has access to the model
        $model = $media->model;
        
        if (!$this->userCanAccessModel($model)) {
            abort(403, 'Unauthorized access');
        }
        
        // Log access for audit trail
        activity()
            ->performedOn($media)
            ->causedBy(auth()->user())
            ->withProperties([
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->log('downloaded');
        
        // Generate temporary URL (5 minutes)
        return redirect($media->temporaryUrl(now()->addMinutes(5)));
    }
    
    protected function userCanAccessModel($model): bool
    {
        // Implement your authorization logic
        return auth()->user()->can('view', $model);
    }
}
```

### Upload Security
```php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MediaUploadRequest extends FormRequest
{
    public function rules()
    {
        return [
            'file' => [
                'required',
                'file',
                'max:51200', // 50MB
                'mimes:jpg,jpeg,png,webp,heic,pdf,xlsx,xls,csv',
            ],
            'collection' => 'required|string|in:images,attachments,documents',
        ];
    }
    
    public function messages()
    {
        return [
            'file.max' => 'The file size must not exceed 50MB.',
            'file.mimes' => 'The file must be an image, PDF, or spreadsheet.',
        ];
    }
}
```

### Virus Scanning Integration
```php
namespace App\Observers;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use App\Services\VirusScanService;

class MediaObserver
{
    protected $virusScan;
    
    public function __construct(VirusScanService $virusScan)
    {
        $this->virusScan = $virusScan;
    }
    
    public function created(Media $media)
    {
        // Queue virus scan for new uploads
        dispatch(new ScanMediaForVirus($media));
    }
}
```

## Performance Optimization

### Image Optimization Pipeline
```php
namespace App\Jobs;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\ImageOptimizer\OptimizerChainFactory;

class OptimizeMediaImage implements ShouldQueue
{
    use Queueable, SerializesModels;
    
    public $tries = 3;
    public $backoff = [60, 180, 300]; // Exponential backoff
    
    public function __construct(
        protected Media $media
    ) {}
    
    public function handle()
    {
        if (!$this->media->type === 'image') {
            return;
        }
        
        $optimizerChain = OptimizerChainFactory::create();
        
        // Download to temp
        $tempPath = tempnam(sys_get_temp_dir(), 'optimize');
        file_put_contents($tempPath, Storage::disk($this->media->disk)->get($this->media->getPath()));
        
        // Optimize
        $optimizerChain->optimize($tempPath);
        
        // Re-upload
        Storage::disk($this->media->disk)->put(
            $this->media->getPath(),
            file_get_contents($tempPath)
        );
        
        // Update size
        $this->media->size = filesize($tempPath);
        $this->media->save();
        
        // Cleanup
        unlink($tempPath);
    }
    
    public function failed(\Throwable $exception)
    {
        Log::error('Media optimization failed', [
            'media_id' => $this->media->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

### Caching Strategy
```php
namespace App\Services;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Support\Facades\Cache;

class MediaCacheService
{
    /**
     * Cache media URLs for better performance
     */
    public function getMediaUrl(Media $media, string $conversion = ''): string
    {
        $cacheKey = "media_url:{$media->id}:{$conversion}";
        
        return Cache::remember($cacheKey, 3600, function () use ($media, $conversion) {
            return $conversion 
                ? $media->getUrl($conversion)
                : $media->getUrl();
        });
    }
    
    /**
     * Clear cache when media is updated
     */
    public function clearMediaCache(Media $media): void
    {
        Cache::forget("media_url:{$media->id}:");
        
        foreach ($media->getGeneratedConversions() as $conversion => $generated) {
            if ($generated) {
                Cache::forget("media_url:{$media->id}:{$conversion}");
            }
        }
    }
}
```

## API Design

### Upload Endpoint
```php
// app/Http/Controllers/Api/MediaUploadController.php
class MediaUploadController extends Controller
{
    public function store(MediaUploadRequest $request)
    {
        $model = $this->findModel($request->model_type, $request->model_id);
        
        $this->authorize('update', $model);
        
        try {
            $media = $model
                ->addMediaFromRequest('file')
                ->withCustomProperties([
                    'uploaded_by' => auth()->id(),
                    'uploaded_at' => now(),
                    'ip_address' => $request->ip(),
                ])
                ->toMediaCollection($request->collection);
            
            return response()->json([
                'success' => true,
                'media' => new MediaResource($media),
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 422);
        }
    }
}
```

### Media Resource
```php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'file_name' => $this->file_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'human_readable_size' => $this->human_readable_size,
            'collection' => $this->collection_name,
            'conversions' => $this->when($this->type === 'image', function () {
                return [
                    'thumb' => $this->getUrl('thumb'),
                    'preview' => $this->getUrl('preview'),
                    'large' => $this->getUrl('large'),
                ];
            }),
            'url' => $this->getUrl(),
            'uploaded_by' => $this->getCustomProperty('uploaded_by'),
            'uploaded_at' => $this->created_at,
        ];
    }
}
```

## Frontend Integration

### TypeScript Types
```typescript
// types/media.ts
export interface Media {
  id: string;
  name: string;
  file_name: string;
  mime_type: string;
  size: number;
  human_readable_size: string;
  collection: string;
  conversions?: {
    thumb?: string;
    preview?: string;
    large?: string;
  };
  url: string;
  uploaded_by: number;
  uploaded_at: string;
}

export interface MediaCollection {
  name: string;
  media: Media[];
}
```

### React Upload Component
```tsx
// components/MediaUploader.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';

interface MediaUploaderProps {
  modelType: string;
  modelId: string | number;
  collection: string;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (media: Media[]) => void;
  onError?: (error: string) => void;
}

export function MediaUploader({
  modelType,
  modelId,
  collection,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['image/*', 'application/pdf'],
  onUploadComplete,
  onError,
}: MediaUploaderProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_type', modelType);
    formData.append('model_id', String(modelId));
    formData.append('collection', collection);
    
    const uploadId = Date.now() + Math.random();
    
    try {
      // Add to upload queue
      setUploads(prev => [...prev, {
        id: uploadId,
        name: file.name,
        progress: 0,
        status: 'uploading',
      }]);
      
      const response = await axios.post('/api/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
            
          setUploads(prev => prev.map(u => 
            u.id === uploadId ? { ...u, progress } : u
          ));
        },
      });
      
      // Mark as complete
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'complete', media: response.data.media } : u
      ));
      
      if (onUploadComplete) {
        onUploadComplete([response.data.media]);
      }
      
    } catch (error) {
      // Mark as error
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'error', error: error.message } : u
      ));
      
      if (onError) {
        onError(error.message);
      }
    }
  };
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => uploadFile(file));
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
  });
  
  const removeUpload = (id: number) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/10' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop files here, or click to select'
          }
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
        </p>
      </div>
      
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <div key={upload.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {upload.status === 'uploading' && (
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              )}
              {upload.status === 'complete' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {upload.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              
              <div className="flex-1">
                <p className="text-sm font-medium">{upload.name}</p>
                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-1 mt-1" />
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-red-500">{upload.error}</p>
                )}
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeUpload(upload.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Media Gallery Component
```tsx
// components/MediaGallery.tsx
import React, { useState } from 'react';
import { Media } from '@/types/media';
import { Image as ImageIcon, File, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MediaGalleryProps {
  media: Media[];
  collection?: string;
  canDelete?: boolean;
  onDelete?: (media: Media) => void;
  onMediaClick?: (media: Media) => void;
}

export function MediaGallery({
  media,
  collection,
  canDelete = false,
  onDelete,
  onMediaClick,
}: MediaGalleryProps) {
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);
  
  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  
  const handleDelete = async () => {
    if (deleteTarget && onDelete) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };
  
  const filteredMedia = collection
    ? media.filter(m => m.collection === collection)
    : media;
  
  if (filteredMedia.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No files uploaded yet</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div
              className="aspect-square cursor-pointer"
              onClick={() => onMediaClick?.(item)}
            >
              {isImage(item.mime_type) && item.conversions?.thumb ? (
                <img
                  src={item.conversions.thumb}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <File className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(item.url, '_blank');
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                {canDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(item);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-2">
              <p className="text-xs truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{item.human_readable_size}</p>
            </div>
          </div>
        ))}
      </div>
      
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

## Monitoring and Maintenance

### Health Checks
```php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Support\Facades\Storage;

class MediaHealthCheck extends Command
{
    protected $signature = 'media:health-check 
                            {--fix : Attempt to fix issues}
                            {--notify : Send notifications}';
    
    protected $description = 'Check media library health and integrity';
    
    public function handle()
    {
        $this->info('Running media health check...');
        
        $issues = [];
        
        // Check for orphaned media
        $orphaned = Media::doesntHave('model')->count();
        if ($orphaned > 0) {
            $issues[] = "Found {$orphaned} orphaned media records";
            
            if ($this->option('fix')) {
                Media::doesntHave('model')->delete();
                $this->info("Removed {$orphaned} orphaned records");
            }
        }
        
        // Check for missing files
        $missing = 0;
        Media::chunk(1000, function ($mediaItems) use (&$missing) {
            foreach ($mediaItems as $media) {
                if (!Storage::disk($media->disk)->exists($media->getPath())) {
                    $missing++;
                    
                    if ($this->option('fix')) {
                        $media->delete();
                    }
                }
            }
        });
        
        if ($missing > 0) {
            $issues[] = "Found {$missing} media records with missing files";
        }
        
        // Check conversion status
        $pendingConversions = Media::where('generated_conversions', 'like', '%false%')->count();
        if ($pendingConversions > 0) {
            $issues[] = "Found {$pendingConversions} media items with pending conversions";
        }
        
        // Report results
        if (empty($issues)) {
            $this->info('✓ Media library is healthy!');
        } else {
            $this->warn('Found the following issues:');
            foreach ($issues as $issue) {
                $this->warn("- {$issue}");
            }
            
            if ($this->option('notify')) {
                // Send notification to admins
                Notification::send(
                    User::admins()->get(),
                    new MediaHealthIssues($issues)
                );
            }
        }
        
        return empty($issues) ? 0 : 1;
    }
}
```

### Storage Usage Tracking
```php
namespace App\Services;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Illuminate\Support\Facades\Cache;

class MediaStorageAnalytics
{
    public function getStorageMetrics(): array
    {
        return Cache::remember('media_storage_metrics', 3600, function () {
            $totalSize = Media::sum('size');
            $totalCount = Media::count();
            
            $byCollection = Media::select('collection_name')
                ->selectRaw('COUNT(*) as count')
                ->selectRaw('SUM(size) as total_size')
                ->groupBy('collection_name')
                ->get();
            
            $byType = Media::select('mime_type')
                ->selectRaw('COUNT(*) as count')
                ->selectRaw('SUM(size) as total_size')
                ->groupBy('mime_type')
                ->get();
            
            return [
                'total_size' => $totalSize,
                'total_count' => $totalCount,
                'average_size' => $totalCount > 0 ? $totalSize / $totalCount : 0,
                'by_collection' => $byCollection,
                'by_type' => $byType,
                'storage_used_gb' => round($totalSize / 1024 / 1024 / 1024, 2),
            ];
        });
    }
}
```

### Scheduled Maintenance
```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Daily health check
    $schedule->command('media:health-check --notify')
        ->daily()
        ->at('02:00');
    
    // Weekly cleanup of temporary uploads
    $schedule->command('media-library:delete-old-temporary-uploads')
        ->weekly()
        ->sundays()
        ->at('03:00');
    
    // Monthly storage report
    $schedule->call(function () {
        $analytics = app(MediaStorageAnalytics::class);
        $metrics = $analytics->getStorageMetrics();
        
        Mail::to(config('mail.admin_email'))
            ->send(new MonthlyStorageReport($metrics));
    })->monthly();
}
```

## Migration Rollback Plan

In case issues arise during migration:

1. **Database Rollback**
   - Keep `item_images` table intact during migration
   - Add `media_id` column to track migrated images
   - Can revert to old system by ignoring media library

2. **Code Switch**
   ```php
   // In Item model
   public function getPrimaryImageUrlAttribute()
   {
       if (config('features.use_media_library')) {
           return $this->getFirstMediaUrl('images');
       }
       
       // Fallback to old system
       return $this->images()->where('is_primary', true)->first()?->url;
   }
   ```

3. **Gradual Rollout**
   - Use feature flags to control media library usage
   - Enable for specific models first
   - Monitor performance and issues
   - Full rollout only after validation

## Success Metrics

Track these metrics to measure migration success:

1. **Performance Metrics**
   - Page load time reduction (target: 30% improvement)
   - Image delivery speed (target: < 100ms from CDN)
   - Upload processing time (target: < 2s for average image)

2. **Storage Metrics**
   - Storage cost reduction (target: 40% via optimization)
   - Bandwidth cost reduction (target: 60% via CDN)

3. **Reliability Metrics**
   - Failed upload rate (target: < 0.1%)
   - Missing image rate (target: 0%)
   - Conversion success rate (target: > 99.9%)

4. **Developer Metrics**
   - Lines of code reduced (target: 50% reduction in image handling)
   - Bug reports related to images (target: 80% reduction)
   - Time to implement new media features (target: 75% faster)

## Conclusion

This specification provides a comprehensive plan for migrating to Spatie Media Library with Laravel Cloud Object Storage. The architecture is designed to:

1. **Simplify** the current complex image handling system
2. **Improve** performance through CDN delivery
3. **Prepare** for future multi-tenancy requirements
4. **Maintain** backward compatibility during migration
5. **Enhance** security and monitoring capabilities

The phased approach ensures minimal disruption while providing immediate benefits. The system is designed to scale with your application's growth and can easily adapt to multi-tenant architecture when needed.
