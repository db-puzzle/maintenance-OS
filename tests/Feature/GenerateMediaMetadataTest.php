<?php

namespace Tests\Feature;

use App\Jobs\GenerateMediaMetadata;
use App\Models\Media;
use App\Models\Production\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GenerateMediaMetadataTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Item $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);

        $this->item = Item::factory()->create();
    }

    /** @test */
    public function it_generates_metadata_for_any_storage()
    {
        // The job should work the same for both local and remote storage
        // Configure storage
        config(['media-library.disk_name' => 'media-local']);
        Storage::fake('media-local');

        // Create a test image
        $file = UploadedFile::fake()->image('test-image.jpg', 800, 600);

        // Add media to item
        $media = $this->item->addMedia($file)
            ->toMediaCollection('images');

        // Dispatch the job
        $job = new GenerateMediaMetadata($media);
        $job->handle(
            app(\App\Services\Media\ImageHashService::class),
            app(\App\Services\Media\BlurHashService::class)
        );

        // Refresh media from database
        $media->refresh();

        // Assert metadata was generated
        $this->assertNotNull($media->file_hash);
        $this->assertNotNull($media->perceptual_hash);
        $this->assertNotNull($media->blurhash);
        $this->assertNotNull($media->dominant_color);
        $this->assertEquals(800, $media->width);
        $this->assertEquals(600, $media->height);
        $this->assertEquals(1.333, $media->aspect_ratio);
    }

    /** @test */
    public function it_generates_metadata_for_remote_storage()
    {
        // Configure remote storage (simulating R2/S3)
        config(['media-library.disk_name' => 'default']);
        config(['filesystems.disks.default.driver' => 's3']);
        Storage::fake('default');

        // Create a test image
        $file = UploadedFile::fake()->image('test-image.jpg', 1024, 768);

        // Manually create media record to simulate remote storage scenario
        $media = new Media([
            'model_type' => Item::class,
            'model_id' => $this->item->id,
            'collection_name' => 'images',
            'name' => 'Test Image',
            'file_name' => 'test-image.jpg',
            'mime_type' => 'image/jpeg',
            'disk' => 'default',
            'size' => $file->getSize(),
            'uuid' => \Str::uuid(),
        ]);
        $media->save();

        // Get the expected file path
        $pathGenerator = app(\App\Services\Media\MediaPathGenerator::class);
        $basePath = $pathGenerator->getPath($media);
        $filePath = ltrim($basePath . $media->file_name, '/');

        // Put the file in the fake storage
        Storage::disk('default')->put($filePath, $file->getContent());

        // Dispatch the job
        $job = new GenerateMediaMetadata($media);
        $job->handle(
            app(\App\Services\Media\ImageHashService::class),
            app(\App\Services\Media\BlurHashService::class)
        );

        // Refresh media from database
        $media->refresh();

        // Assert metadata was generated
        $this->assertNotNull($media->file_hash);
        $this->assertNotNull($media->perceptual_hash);
        $this->assertNotNull($media->blurhash);
        $this->assertNotNull($media->dominant_color);
        $this->assertEquals(1024, $media->width);
        $this->assertEquals(768, $media->height);
        $this->assertEquals(1.333, $media->aspect_ratio);
    }

    /** @test */
    public function it_handles_non_image_files()
    {
        // Configure local storage
        config(['media-library.disk_name' => 'media-local']);
        Storage::fake('media-local');

        // Create a test PDF
        $file = UploadedFile::fake()->create('document.pdf', 100);

        // Add media to item
        $media = $this->item->addMedia($file)
            ->toMediaCollection('documents');

        // Dispatch the job
        $job = new GenerateMediaMetadata($media);
        $job->handle(
            app(\App\Services\Media\ImageHashService::class),
            app(\App\Services\Media\BlurHashService::class)
        );

        // Refresh media from database
        $media->refresh();

        // Assert only file hash was generated (no image metadata)
        $this->assertNotNull($media->file_hash);
        $this->assertNull($media->perceptual_hash);
        $this->assertNull($media->blurhash);
        $this->assertNull($media->dominant_color);
        $this->assertNull($media->width);
        $this->assertNull($media->height);
    }

    /** @test */
    public function it_handles_missing_files_gracefully()
    {
        // Configure storage
        config(['media-library.disk_name' => 'default']);
        Storage::fake('default');

        // Create media record without actual file
        $media = new Media([
            'model_type' => Item::class,
            'model_id' => $this->item->id,
            'collection_name' => 'images',
            'name' => 'Test Image',
            'file_name' => 'test-image.jpg',
            'mime_type' => 'image/jpeg',
            'disk' => 'default',
            'size' => 1000,
            'uuid' => \Str::uuid(),
        ]);
        $media->save();

        // Expect exception when file doesn't exist
        $this->expectException(\Exception::class);

        // Dispatch the job
        $job = new GenerateMediaMetadata($media);
        $job->handle(
            app(\App\Services\Media\ImageHashService::class),
            app(\App\Services\Media\BlurHashService::class)
        );
    }

    /** @test */
    public function it_queues_metadata_generation_when_media_is_created()
    {
        Queue::fake();

        // Configure local storage
        config(['media-library.disk_name' => 'media-local']);
        Storage::fake('media-local');

        // Create a test image
        $file = UploadedFile::fake()->image('test-image.jpg');

        // Add media to item
        $media = $this->item->addMedia($file)
            ->toMediaCollection('images');

        // Assert job was queued
        Queue::assertPushed(GenerateMediaMetadata::class, function ($job) use ($media) {
            return $job->media->id === $media->id;
        });
    }
}
