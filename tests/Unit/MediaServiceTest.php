<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\MediaService;
use App\Services\MediaDiskResolver;
use App\Services\MediaCacheService;
use App\Services\MediaPathGenerator;
use App\Models\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MediaServiceTest extends TestCase
{
    protected MediaService $mediaService;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        Storage::fake('media');
        Storage::fake('media-private');
        
        $this->mediaService = new MediaService();
    }
    
    public function test_disk_resolver_returns_correct_disk_for_collections()
    {
        // Public collections
        $this->assertEquals('media', MediaDiskResolver::getDiskForCollection('images'));
        $this->assertEquals('media', MediaDiskResolver::getDiskForCollection('public-documents'));
        
        // Private collections
        $this->assertEquals('media-private', MediaDiskResolver::getDiskForCollection('attachments'));
        $this->assertEquals('media-private', MediaDiskResolver::getDiskForCollection('exports'));
        $this->assertEquals('media-private', MediaDiskResolver::getDiskForCollection('financial-documents'));
    }
    
    public function test_path_generator_creates_uuid_based_paths()
    {
        $media = new Media(['uuid' => '123e4567-e89b-12d3-a456-426614174000']);
        $pathGenerator = new MediaPathGenerator();
        
        $path = $pathGenerator->getPath($media);
        $this->assertEquals('media/123e4567-e89b-12d3-a456-426614174000/', $path);
        
        $conversionsPath = $pathGenerator->getPathForConversions($media);
        $this->assertEquals('media/123e4567-e89b-12d3-a456-426614174000/conversions/', $conversionsPath);
        
        $responsivePath = $pathGenerator->getPathForResponsiveImages($media);
        $this->assertEquals('media/123e4567-e89b-12d3-a456-426614174000/responsive/', $responsivePath);
    }
    
    public function test_cache_service_caches_media_urls()
    {
        $media = Media::factory()->create();
        $cacheService = new MediaCacheService();
        
        // First call should cache
        $url1 = $cacheService->getMediaUrl($media);
        
        // Second call should return cached value
        $url2 = $cacheService->getMediaUrl($media);
        
        $this->assertEquals($url1, $url2);
    }
    
    public function test_media_service_finds_duplicates_by_hash()
    {
        $hash = md5('test content');
        
        // Create a media with specific hash
        Media::factory()->create([
            'custom_properties' => ['file_hash' => $hash],
        ]);
        
        $duplicate = $this->mediaService->findDuplicateByHash($hash);
        
        $this->assertNotNull($duplicate);
        $this->assertEquals($hash, $duplicate->getCustomProperty('file_hash'));
    }
    
    public function test_media_service_generates_unique_filenames()
    {
        $file1 = UploadedFile::fake()->image('test.jpg');
        $file2 = UploadedFile::fake()->image('test.jpg');
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->mediaService);
        $method = $reflection->getMethod('generateUniqueFileName');
        $method->setAccessible(true);
        
        $filename1 = $method->invoke($this->mediaService, $file1);
        $filename2 = $method->invoke($this->mediaService, $file2);
        
        $this->assertNotEquals($filename1, $filename2);
        $this->assertStringContainsString('test_', $filename1);
        $this->assertStringEndsWith('.jpg', $filename1);
    }
    
    public function test_is_local_environment_detection()
    {
        // Test in local environment
        app()->detectEnvironment(function () { return 'local'; });
        $this->assertTrue(MediaDiskResolver::isLocalEnvironment());
        
        // Test in production environment
        app()->detectEnvironment(function () { return 'production'; });
        $this->assertFalse(MediaDiskResolver::isLocalEnvironment());
        
        // Reset to testing
        app()->detectEnvironment(function () { return 'testing'; });
    }
}
