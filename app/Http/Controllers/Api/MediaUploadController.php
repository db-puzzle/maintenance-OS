<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MediaUploadRequest;
use App\Http\Resources\MediaResource;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MediaUploadController extends Controller
{
    private MediaService $mediaService;

    public function __construct(MediaService $mediaService)
    {
        $this->mediaService = $mediaService;
    }

    /**
     * Upload media file.
     */
    public function store(MediaUploadRequest $request): JsonResponse
    {
        $model = $this->findModel($request->model_type, $request->model_id);

        $this->authorize('update', $model);

        try {
            DB::beginTransaction();

            // Check for duplicates if configured
            if ($request->check_duplicates && $hash = md5_file($request->file('file')->getRealPath())) {
                $duplicate = $this->mediaService->findDuplicateByHash($hash);

                if ($duplicate && ! $request->allow_duplicates) {
                    return response()->json([
                        'success' => false,
                        'duplicate' => true,
                        'existing_media' => new MediaResource($duplicate),
                        'message' => 'This file already exists in the system.',
                    ], 409);
                }
            }

            // Add custom properties
            $customProperties = [];
            if ($request->caption) {
                $customProperties['caption'] = $request->caption;
            }
            if ($request->alt_text) {
                $customProperties['alt_text'] = $request->alt_text;
            }
            if ($request->is_primary) {
                $customProperties['is_primary'] = true;
            }

            // Upload the file
            $media = $this->mediaService->addMediaToModel(
                $model,
                $request->file('file'),
                $request->collection,
                $customProperties
            );

            // Set as primary if requested
            if ($request->is_primary && method_exists($model, 'setPrimaryMedia')) {
                $model->setPrimaryMedia($media);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'media' => new MediaResource($media),
                'message' => 'File uploaded successfully.',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Media upload failed', [
                'error' => $e->getMessage(),
                'model_type' => $request->model_type,
                'model_id' => $request->model_id,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Find model by type and ID.
     */
    protected function findModel(string $modelType, $modelId)
    {
        $allowedModels = [
            'item' => \App\Models\Production\Item::class,
            'work_order' => \App\Models\WorkOrders\WorkOrder::class,
            'work_order_execution' => \App\Models\WorkOrders\WorkOrderExecution::class,
            'user' => \App\Models\User::class,
            'qr_tag_template' => \App\Models\QrTagTemplate::class,
        ];

        if (! isset($allowedModels[$modelType])) {
            abort(422, 'Invalid model type');
        }

        $modelClass = $allowedModels[$modelType];
        $model = $modelClass::findOrFail($modelId);

        return $model;
    }
}
