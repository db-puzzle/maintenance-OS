<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Models\Production\Item;
use App\Models\User;
use App\Models\Media;

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
        $user = User::factory()->create();
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg');
        
        $this->actingAs($user);
        
        $response = $this->postJson('/api/media/upload', [
            'file' => $file,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
        ]);
        
        $response->assertStatus(201);
        $response->assertJsonStructure([
            'success',
            'media' => [
                'id',
                'name',
                'file_name',
                'url',
                'collection',
            ],
        ]);
        
        // Assert media was created
        $this->assertDatabaseHas('media', [
            'model_type' => Item::class,
            'model_id' => $item->id,
            'collection_name' => 'images',
        ]);
        
        // Assert file exists in correct disk
        $media = Media::latest()->first();
        Storage::disk('media')->assertExists($media->getPath());
    }
    
    public function test_private_documents_use_private_disk()
    {
        $user = User::factory()->create();
        $workOrder = \App\Models\WorkOrders\WorkOrder::factory()->create();
        $file = UploadedFile::fake()->create('report.pdf', 1000);
        
        $this->actingAs($user);
        
        $response = $this->postJson('/api/media/upload', [
            'file' => $file,
            'model_type' => 'work_order',
            'model_id' => $workOrder->id,
            'collection' => 'attachments',
        ]);
        
        $response->assertStatus(201);
        
        // Assert media was created
        $media = Media::latest()->first();
        $this->assertEquals('attachments', $media->collection_name);
        
        // Assert file exists in private disk
        Storage::disk('media-private')->assertExists($media->getPath());
    }
    
    public function test_duplicate_detection_works()
    {
        $user = User::factory()->create();
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('duplicate.jpg');
        
        $this->actingAs($user);
        
        // Upload first file
        $response1 = $this->postJson('/api/media/upload', [
            'file' => $file,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
        ]);
        
        $response1->assertStatus(201);
        
        // Try to upload same file with duplicate checking
        $response2 = $this->postJson('/api/media/upload', [
            'file' => $file,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
            'check_duplicates' => true,
            'allow_duplicates' => false,
        ]);
        
        $response2->assertStatus(409);
        $response2->assertJson([
            'success' => false,
            'duplicate' => true,
        ]);
    }
    
    public function test_secure_media_requires_authentication()
    {
        $media = Media::factory()->create();
        
        $response = $this->getJson("/api/media/secure/{$media->uuid}");
        
        $response->assertStatus(401);
    }
    
    public function test_media_deletion_removes_file()
    {
        $user = User::factory()->create();
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('deleteme.jpg');
        
        $this->actingAs($user);
        
        // Upload file
        $response = $this->postJson('/api/media/upload', [
            'file' => $file,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
        ]);
        
        $media = Media::latest()->first();
        $path = $media->getPath();
        
        // Assert file exists
        Storage::disk('media')->assertExists($path);
        
        // Delete media
        $response = $this->deleteJson("/api/media/secure/{$media->uuid}");
        
        $response->assertStatus(200);
        
        // Assert media was deleted from database
        $this->assertDatabaseMissing('media', ['id' => $media->id]);
        
        // Assert file was deleted from storage
        Storage::disk('media')->assertMissing($path);
    }
    
    public function test_media_conversions_are_generated()
    {
        $user = User::factory()->create();
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg', 1000, 1000);
        
        $this->actingAs($user);
        
        $response = $this->postJson('/api/media/upload', [
            'file' => $file,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
        ]);
        
        $media = Media::latest()->first();
        
        // Assert conversions are marked as generated
        $this->assertTrue($media->hasGeneratedConversion('thumb'));
        $this->assertTrue($media->hasGeneratedConversion('preview'));
    }
    
    public function test_chunked_upload_assembles_correctly()
    {
        $user = User::factory()->create();
        $item = Item::factory()->create();
        
        $this->actingAs($user);
        
        $uploadId = 'test-upload-' . time();
        $fileContent = str_repeat('Test content ', 1000);
        $chunks = str_split($fileContent, 100);
        
        // Upload chunks
        foreach ($chunks as $index => $chunkContent) {
            $chunk = UploadedFile::fake()->createWithContent("chunk{$index}", $chunkContent);
            
            $response = $this->postJson('/api/media/upload/chunk', [
                'chunk' => $chunk,
                'upload_id' => $uploadId,
                'chunk_index' => $index,
                'total_chunks' => count($chunks),
                'file_hash' => md5($fileContent),
            ]);
            
            $response->assertStatus(200);
        }
        
        // Finalize upload
        $response = $this->postJson('/api/media/upload/finalize', [
            'upload_id' => $uploadId,
            'filename' => 'test-file.txt',
            'mime_type' => 'text/plain',
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'documents',
        ]);
        
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'media',
        ]);
        
        // Assert media was created
        $this->assertDatabaseHas('media', [
            'model_type' => Item::class,
            'model_id' => $item->id,
            'collection_name' => 'documents',
        ]);
    }
    
    public function test_primary_media_functionality()
    {
        $user = User::factory()->create();
        $item = Item::factory()->create();
        
        $this->actingAs($user);
        
        // Upload multiple images
        $file1 = UploadedFile::fake()->image('image1.jpg');
        $file2 = UploadedFile::fake()->image('image2.jpg');
        
        $this->postJson('/api/media/upload', [
            'file' => $file1,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
            'is_primary' => true,
        ]);
        
        $this->postJson('/api/media/upload', [
            'file' => $file2,
            'model_type' => 'item',
            'model_id' => $item->id,
            'collection' => 'images',
            'is_primary' => false,
        ]);
        
        // Refresh item
        $item->refresh();
        
        // Assert primary media is set correctly
        $primaryMedia = $item->getPrimaryMedia('images');
        $this->assertNotNull($primaryMedia);
        $this->assertTrue($primaryMedia->getCustomProperty('is_primary'));
        
        // Assert primary image URL works
        $primaryUrl = $item->getPrimaryMediaUrl('images');
        $this->assertNotEmpty($primaryUrl);
    }
}
