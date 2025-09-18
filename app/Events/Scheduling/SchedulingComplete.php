<?php

namespace App\Events\Scheduling;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SchedulingComplete implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public bool $success,
        public array $summary,
        public int $alertCount,
        public array $alertBreakdown
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        return new Channel("scheduling.{$this->scheduleVersionId}");
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'jobId' => $this->jobId,
            'scheduleVersionId' => $this->scheduleVersionId,
            'success' => $this->success,
            'summary' => $this->summary,
            'alertCount' => $this->alertCount,
            'alertBreakdown' => $this->alertBreakdown,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
