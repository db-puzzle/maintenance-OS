<?php

namespace App\Events\Scheduling;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SchedulingStarted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public string $algorithm,
        public int $totalSteps,
        public array $options
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
            'algorithm' => $this->algorithm,
            'totalSteps' => $this->totalSteps,
            'options' => $this->options,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
