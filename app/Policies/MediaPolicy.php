<?php

namespace App\Policies;

use App\Models\Media;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class MediaPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the media.
     */
    public function view(User $user, Media $media): bool
    {
        // Check if user has permission to view the parent model
        $model = $media->model;
        
        if (!$model) {
            return false;
        }
        
        // Check model-specific permissions
        $modelClass = class_basename($model);
        $permission = strtolower($modelClass) . '.view';
        
        if ($user->can($permission)) {
            return true;
        }
        
        // Check if user owns the model (if applicable)
        if (method_exists($model, 'user') && $model->user_id === $user->id) {
            return true;
        }
        
        // Check if user uploaded the media
        if ($media->getCustomProperty('uploaded_by') === $user->id) {
            return true;
        }
        
        return false;
    }

    /**
     * Determine whether the user can create media.
     */
    public function create(User $user): bool
    {
        // Users can upload media if they have any create permissions
        return $user->hasAnyPermission([
            'item.create',
            'asset.create',
            'work-order.create',
            'shipment.create',
        ]);
    }

    /**
     * Determine whether the user can update the media.
     */
    public function update(User $user, Media $media): bool
    {
        // Check if user can update the parent model
        $model = $media->model;
        
        if (!$model) {
            return false;
        }
        
        $modelClass = class_basename($model);
        $permission = strtolower($modelClass) . '.update';
        
        return $user->can($permission);
    }

    /**
     * Determine whether the user can delete the media.
     */
    public function delete(User $user, Media $media): bool
    {
        // Check if user can delete from the parent model
        $model = $media->model;
        
        if (!$model) {
            return false;
        }
        
        $modelClass = class_basename($model);
        $permission = strtolower($modelClass) . '.delete';
        
        if ($user->can($permission)) {
            return true;
        }
        
        // Allow user to delete their own uploads within 24 hours
        if ($media->getCustomProperty('uploaded_by') === $user->id &&
            $media->created_at->greaterThan(now()->subHours(24))) {
            return true;
        }
        
        return false;
    }

    /**
     * Determine whether the user can restore the media.
     */
    public function restore(User $user, Media $media): bool
    {
        return $this->delete($user, $media);
    }

    /**
     * Determine whether the user can permanently delete the media.
     */
    public function forceDelete(User $user, Media $media): bool
    {
        return $user->hasRole('admin');
    }
}
