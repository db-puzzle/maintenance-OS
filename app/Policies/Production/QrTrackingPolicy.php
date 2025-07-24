<?php

namespace App\Policies\Production;

use App\Models\Production\QrTracking;
use App\Models\User;

class QrTrackingPolicy
{
    /**
     * Determine whether the user can view any QR tracking events.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('production.qr.viewAny');
    }

    /**
     * Determine whether the user can view the QR tracking event.
     */
    public function view(User $user, QrTracking $tracking): bool
    {
        return $user->hasPermissionTo('production.qr.view');
    }

    /**
     * Determine whether the user can generate QR codes.
     */
    public function generate(User $user): bool
    {
        return $user->hasPermissionTo('production.qr.generate');
    }

    /**
     * Determine whether the user can print QR labels.
     */
    public function print(User $user): bool
    {
        return $user->hasPermissionTo('production.qr.print');
    }
} 