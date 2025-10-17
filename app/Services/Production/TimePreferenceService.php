<?php

namespace App\Services\Production;

use App\Models\User;
use App\Models\UserTimePreference;

class TimePreferenceService
{
    /**
     * Get user's time display preference for a specific entity.
     */
    public function getUserPreference(User $user, string $entityType, ?int $entityId = null): array
    {
        $preference = UserTimePreference::where('user_id', $user->id)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->first();

        if (! $preference && $entityType !== 'global') {
            // Fall back to global preference
            $preference = UserTimePreference::where('user_id', $user->id)
                ->where('entity_type', 'global')
                ->whereNull('entity_id')
                ->first();
        }

        return [
            'display_mode' => $preference?->display_mode ?? 'cycle_time',
            'time_scale' => $preference?->time_scale ?? 'auto',
        ];
    }

    /**
     * Save user's time display preference.
     */
    public function saveUserPreference(
        User $user,
        string $entityType,
        ?int $entityId,
        string $displayMode,
        string $timeScale
    ): void {
        UserTimePreference::updateOrCreate(
            [
                'user_id' => $user->id,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
            ],
            [
                'display_mode' => $displayMode,
                'time_scale' => $timeScale,
            ]
        );
    }

    /**
     * Delete user's time display preference.
     */
    public function deleteUserPreference(User $user, string $entityType, ?int $entityId = null): void
    {
        UserTimePreference::where('user_id', $user->id)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->delete();
    }

    /**
     * Get all user preferences.
     */
    public function getAllUserPreferences(User $user): array
    {
        return UserTimePreference::where('user_id', $user->id)
            ->get()
            ->map(function ($preference) {
                return [
                    'entity_type' => $preference->entity_type,
                    'entity_id' => $preference->entity_id,
                    'display_mode' => $preference->display_mode,
                    'time_scale' => $preference->time_scale,
                ];
            })
            ->toArray();
    }
}
