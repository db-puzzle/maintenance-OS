<?php

use Spatie\Activitylog\ActivityLogger;

if (! function_exists('central_activity')) {
    /**
     * Log activity to the central database.
     *
     * Use this helper for logging Account/Subscription/Central model operations
     * that should be tracked in the central database regardless of tenant context.
     */
    function central_activity(): ActivityLogger
    {
        return activity()->tap(function ($activity) {
            $activity->setConnection('central');
        });
    }
}
