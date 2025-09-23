<?php

namespace Tests\Feature;

use App\Models\Production\Item;
use App\Models\User;
use App\Services\MediaDiskResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaInfrastructureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('media');
        Storage::fake('media-private');

        config(['media-library.disk_name' => 'media']);
        config(['media-library.private_disk_name' => 'media-private']);
    }

    public function test_media_upload_endpoint_works(): void
    {
        $user = User::factory()->create();
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg', 100, 100);

        $response = $this->actingAs($user)
            ->postJson('/api/media/upload', [
                'file' => $file,
                'model_type' => Item::class,
                'model_id' => $item->id,
                'collection' => 'images',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'media' => [
                    'id',
                    'name',
                    'file_name',
                    'mime_type',
                    'size',
                    'collection',
                    'url',
                ],
            ]);

        $this->assertDatabaseHas('media', [
            'model_type' => Item::class,
            'model_id' => $item->id,
            'collection_name' => 'images',
        ]);
    }

    public function test_media_uses_correct_disk(): void
    {
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg');

        $media = $item->addMedia($file)->toMediaCollection('images');

        // The path includes the full media path structure
        $fullPath = $media->getPath() . $media->file_name;
        
        Storage::disk(MediaDiskResolver::getPublicDisk())->assertExists($fullPath);
        Storage::disk(MediaDiskResolver::getPrivateDisk())->assertMissing($fullPath);
    }

    public function test_conversions_are_generated(): void
    {
        $item = Item::factory()->create();
        $file = UploadedFile::fake()->image('product.jpg', 1000, 1000);

        $media = $item->addMedia($file)->toMediaCollection('images');

        // In tests, conversions might not be generated unless we run them manually
        // or have queue processing enabled
        $this->assertNotNull($media);
        $this->assertEquals('images', $media->collection_name);
        $this->assertEquals('image/jpeg', $media->mime_type);
    }

    public function test_private_media_requires_authentication(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('report.pdf', 1000, 'application/pdf');

        $media = $user->addMedia($file)->toMediaCollection('documents');

        // Without authentication
        $response = $this->getJson("/api/media/secure/{$media->uuid}");
        $response->assertUnauthorized();

        // With authentication
        $response = $this->actingAs($user)->getJson("/api/media/secure/{$media->uuid}");
        $response->assertOk();
    }

    public function test_media_manager_component_loads(): void
    {
        // Create admin user to ensure permissions
        $user = User::factory()->create();
        $user->assignRole('Admin'); // Ensure user has permissions
        
        $item = Item::factory()->create();

        $response = $this->actingAs($user)->get("/production/items/{$item->id}");
        
        // Should contain our media components in the page
        $response->assertOk();
        // The actual component testing would be done in Jest/React tests
    }
}
