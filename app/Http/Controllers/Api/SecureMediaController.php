<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaResource;
use App\Models\Media;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SecureMediaController extends Controller
{
    private MediaService $mediaService;

    public function __construct(MediaService $mediaService)
    {
        $this->middleware('auth');
        $this->mediaService = $mediaService;
    }

    /**
     * Download private media file.
     */
    public function download(Request $request, Media $media)
    {
        // Check if user has access to the model
        if (! $this->userCanAccessMedia($media)) {
            abort(403, 'Unauthorized access');
        }

        // Log access for audit trail
        activity()
            ->performedOn($media)
            ->causedBy($request->user())
            ->withProperties([
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ])
            ->log('media_downloaded');

        // Generate temporary URL
        try {
            $url = $this->mediaService->generateTemporaryUrl($media, 5);

            return redirect($url);
        } catch (\Exception $e) {
            abort(404, 'File not found');
        }
    }

    /**
     * Stream private media file.
     */
    public function stream(Request $request, Media $media): StreamedResponse
    {
        // Check if user has access to the model
        if (! $this->userCanAccessMedia($media)) {
            abort(403, 'Unauthorized access');
        }

        // Get file path
        $path = $media->getPath();
        $disk = $media->disk;

        if (! Storage::disk($disk)->exists($path)) {
            abort(404, 'File not found');
        }

        // Create streamed response
        return response()->stream(function () use ($disk, $path) {
            $stream = Storage::disk($disk)->readStream($path);
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $media->mime_type,
            'Content-Length' => $media->size,
            'Content-Disposition' => 'inline; filename="' . $media->file_name . '"',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Get media information.
     */
    public function show(Request $request, Media $media): JsonResponse
    {
        // Check if user has access to the model
        if (! $this->userCanAccessMedia($media)) {
            abort(403, 'Unauthorized access');
        }

        return response()->json([
            'success' => true,
            'media' => new MediaResource($media),
        ]);
    }

    /**
     * Delete media file.
     */
    public function destroy(Request $request, Media $media): JsonResponse
    {
        $model = $media->model;

        // Check if user can update the model
        $this->authorize('update', $model);

        try {
            // Log deletion
            activity()
                ->performedOn($model)
                ->causedBy($request->user())
                ->withProperties([
                    'media_id' => $media->uuid,
                    'file_name' => $media->file_name,
                    'collection' => $media->collection_name,
                ])
                ->log('media_deleted');

            $media->delete();

            return response()->json([
                'success' => true,
                'message' => 'File deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete file: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Check if user has access to media.
     */
    protected function userCanAccessMedia(Media $media): bool
    {
        $user = auth()->user();
        $model = $media->model;

        // If media belongs to the user
        if ($model instanceof \App\Models\User && $model->id === $user->id) {
            return true;
        }

        // Check if user can view the model
        if (method_exists($model, 'userCanView')) {
            return $model->userCanView($user);
        }

        // Use policy if available
        $policyClass = get_class($model) . 'Policy';
        $policyClass = str_replace('Models', 'Policies', $policyClass);

        if (class_exists($policyClass)) {
            return $user->can('view', $model);
        }

        // Default to checking if user can view based on common patterns
        // This can be customized based on your authorization logic
        return true;
    }
}
