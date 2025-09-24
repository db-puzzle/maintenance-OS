<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Serve a media file with authentication check.
     */
    public function show(Media $media)
    {
        // Check if user has access to the media's parent model
        if ($media->model) {
            $this->authorize('view', $media->model);
        }

        // Track access
        $media->trackAccess();

        try {
            // Get the base path for the media using our custom path generator
            $pathGenerator = app(\App\Services\Media\MediaPathGenerator::class);
            $basePath = $pathGenerator->getPath($media);
            
            // Build the full file path
            $filePath = $basePath . $media->file_name;
            

            // Ensure path doesn't start with / for storage operations
            $filePath = ltrim($filePath, '/');

            // For production (R2), generate temporary URL
            if (app()->environment('production')) {
                return redirect(
                    Storage::disk($media->disk)->temporaryUrl(
                        $filePath,
                        now()->addMinutes(5)
                    )
                );
            }

            // For local development, stream the file
            // First check if file exists
            if (! Storage::disk($media->disk)->exists($filePath)) {
                abort(404, 'Media file not found');
            }

            return Storage::disk($media->disk)->response($filePath);
        } catch (\Exception $e) {
            \Log::error('Error serving media file', [
                'media_id' => $media->id,
                'error' => $e->getMessage(),
            ]);
            abort(404, 'Media file not found');
        }
    }

    /**
     * Serve a conversion with authentication check.
     */
    public function showConversion(Media $media, string $conversion)
    {
        // Check if user has access to the media's parent model
        if ($media->model) {
            $this->authorize('view', $media->model);
        }

        // Track access
        $media->trackAccess();

        // Get the conversion path using Spatie's method
        try {
            // Get the disk name for conversions
            $disk = $media->conversions_disk ?? $media->disk;

            // First check if the conversion exists
            if (! $media->hasGeneratedConversion($conversion)) {
                abort(404, 'Conversion not found');
            }

            // Get the base path for the media using our custom path generator
            $pathGenerator = app(\App\Services\Media\MediaPathGenerator::class);
            $basePath = $pathGenerator->getPathForConversions($media);
            
            // Build the conversion file path
            $conversionFileName = pathinfo($media->file_name, PATHINFO_FILENAME) . '_' . $conversion . '.' . pathinfo($media->file_name, PATHINFO_EXTENSION);
            $conversionPath = $basePath . $conversionFileName;


            // The path is relative to the disk root, no need to add prefixes
            $storagePath = ltrim($conversionPath, '/');

            // For production (R2), generate temporary URL
            if (app()->environment('production')) {
                return redirect(
                    Storage::disk($disk)->temporaryUrl(
                        ltrim($conversionPath, '/'), // Remove leading slash for S3/R2
                        now()->addMinutes(5)
                    )
                );
            }

            // For local development, stream the file
            // First check if file exists
            if (! Storage::disk($disk)->exists($storagePath)) {
                abort(404, 'Media file not found');
            }

            return Storage::disk($disk)->response($storagePath);
        } catch (\Exception $e) {
            \Log::error('Error serving media conversion', [
                'media_id' => $media->id,
                'conversion' => $conversion,
                'error' => $e->getMessage(),
            ]);
            abort(404, 'Media conversion not found');
        }
    }

    /**
     * Download a media file.
     */
    public function download(Media $media)
    {
        // Check if user has access to the media's parent model
        if ($media->model) {
            $this->authorize('view', $media->model);
        }

        try {
            // Get the file path
            $filePath = $media->getPath();

            // Ensure path doesn't start with / for storage operations
            $filePath = ltrim($filePath, '/');

            // For production (R2), generate temporary URL with download headers
            if (app()->environment('production')) {
                return redirect(
                    Storage::disk($media->disk)->temporaryUrl(
                        $filePath,
                        now()->addMinutes(5),
                        [
                            'ResponseContentDisposition' => 'attachment; filename="' . $media->file_name . '"',
                        ]
                    )
                );
            }

            // For local development, download the file
            if (! Storage::disk($media->disk)->exists($filePath)) {
                abort(404, 'Media file not found');
            }

            return Storage::disk($media->disk)->download($filePath, $media->file_name);
        } catch (\Exception $e) {
            \Log::error('Error downloading media file', [
                'media_id' => $media->id,
                'error' => $e->getMessage(),
            ]);
            abort(404, 'Media file not found');
        }
    }

    /**
     * Delete a media file.
     */
    public function destroy(Media $media)
    {
        // Check if user has permission to delete the media's parent model
        $this->authorize('delete', $media->model);

        // Delete the media
        $media->delete();

        return response()->json(['message' => 'Media deleted successfully']);
    }
}
