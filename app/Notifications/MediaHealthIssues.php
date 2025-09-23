<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MediaHealthIssues extends Notification implements ShouldQueue
{
    use Queueable;

    protected array $issues;

    /**
     * Create a new notification instance.
     */
    public function __construct(array $issues)
    {
        $this->issues = $issues;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Media Library Health Check - Issues Found')
            ->line('The media library health check has found the following issues:');

        foreach ($this->issues as $issue) {
            $mail->line('• ' . $issue);
        }

        $mail->line('Please run "php artisan media:health-check --fix" to attempt automatic fixes.')
            ->action('View System Status', url('/admin/system/media'));

        return $mail;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'issues' => $this->issues,
            'count' => count($this->issues),
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
