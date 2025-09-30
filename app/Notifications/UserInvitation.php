<?php

namespace App\Notifications;

use App\Mail\UserInvitationMail;
use App\Models\UserInvitation as InvitationModel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class UserInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    protected $invitation;

    public function __construct(InvitationModel $invitation)
    {
        $this->invitation = $invitation;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return new UserInvitationMail($this->invitation);
    }

    /**
     * Get the array representation of the notification.
     *
     * @param mixed $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            'invitation_id' => $this->invitation->id,
            'email' => $this->invitation->email,
            'invited_by' => $this->invitation->inviter ? $this->invitation->inviter->name : 'System',
            'expires_at' => $this->invitation->expires_at,
        ];
    }
}
