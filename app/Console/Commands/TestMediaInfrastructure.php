<?php

namespace App\Console\Commands;

use App\Models\Production\Item;
use App\Models\User;
use App\Services\MediaDiskResolver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class TestMediaInfrastructure extends Command
{
    protected $signature = 'media:test-infrastructure';
    protected $description = 'Test the media infrastructure is working correctly';

    public function handle()
    {
        $this->info('Testing Media Infrastructure...');

        // Test 1: Check configurations
        $this->line('');
        $this->info('1. Checking configurations:');
        $this->line('Public disk: ' . MediaDiskResolver::getPublicDisk());
        $this->line('Private disk: ' . MediaDiskResolver::getPrivateDisk());
        $this->line('Is local environment: ' . (MediaDiskResolver::isLocalEnvironment() ? 'Yes' : 'No'));
        $this->line('Should use CDN: ' . (MediaDiskResolver::shouldUseCdn() ? 'Yes' : 'No'));

        // Test 2: Check storage directories
        $this->line('');
        $this->info('2. Checking storage directories:');
        $publicPath = storage_path('app/media');
        $privatePath = storage_path('app/media-private');
        $tempPath = storage_path('app/media-temp');

        $this->line('Public media path exists: ' . (is_dir($publicPath) ? 'Yes' : 'No'));
        $this->line('Private media path exists: ' . (is_dir($privatePath) ? 'Yes' : 'No'));
        $this->line('Temp media path exists: ' . (is_dir($tempPath) ? 'Yes' : 'No'));

        // Test 3: Test media upload
        $this->line('');
        $this->info('3. Testing media upload:');

        try {
            $user = User::first();
            if (! $user) {
                $this->warn('No users found. Creating a test user...');
                $user = User::factory()->create(['email' => 'media-test@example.com']);
            }

            $item = Item::first();
            if (! $item) {
                $this->warn('No items found. Creating a test item...');
                $item = Item::factory()->create(['name' => 'Media Test Item']);
            }

            // Create a test image
            $imagePath = storage_path('app/test-image.jpg');
            $image = imagecreatetruecolor(100, 100);
            imagefill($image, 0, 0, imagecolorallocate($image, 255, 0, 0));
            imagejpeg($image, $imagePath);
            imagedestroy($image);

            // Add to media library
            $media = $item->addMedia($imagePath)
                ->withCustomProperties(['uploaded_by' => $user->id])
                ->toMediaCollection('images');

            $this->line('Media uploaded successfully!');
            $this->line('Media ID: ' . $media->id);
            $this->line('Media UUID: ' . $media->uuid);
            $this->line('Media URL: ' . $media->getUrl());
            $this->line('Collection: ' . $media->collection_name);
            $this->line('Disk: ' . $media->disk);

            // Clean up (file was moved by media library)
            // unlink($imagePath);
        } catch (\Exception $e) {
            $this->error('Media upload failed: ' . $e->getMessage());
        }

        // Test 4: Check API routes
        $this->line('');
        $this->info('4. Checking API routes:');
        $routes = [
            'api.media.upload',
            'api.media.secure.show',
            'api.media.secure.download',
            'media.public.show',
        ];

        foreach ($routes as $route) {
            try {
                $url = route($route, ['media' => 'test-uuid']);
                $this->line("Route '{$route}' exists: Yes");
            } catch (\Exception $e) {
                $this->warn("Route '{$route}' exists: No");
            }
        }

        $this->line('');
        $this->info('Media infrastructure test completed!');

        return Command::SUCCESS;
    }
}
