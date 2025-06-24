<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\UserInvitation as InvitationModel;

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
        $message = (new MailMessage)
            ->subject('Invitation to join ' . config('app.name'))
            ->greeting('Hello!')
            ->line('You have been invited to join our maintenance management system by ' . $this->invitation->invitedBy->name . '.');

        if ($this->invitation->initial_role) {
            $message->line('You will be assigned the role of ' . ucfirst($this->invitation->initial_role) . '.');
        }

        if ($this->invitation->message) {
            $message->line('Personal message: "' . $this->invitation->message . '"');
        }

        $message->action('Accept Invitation', $this->invitation->generateSignedUrl())
            ->line('This invitation will expire on ' . $this->invitation->expires_at->format('F j, Y at g:i A') . '.')
            ->line('If you did not expect to receive this invitation, you can safely ignore this email.');

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            'invitation_id' => $this->invitation->id,
            'email' => $this->invitation->email,
            'invited_by' => $this->invitation->invitedBy->name,
            'expires_at' => $this->invitation->expires_at,
        ];
    }
}