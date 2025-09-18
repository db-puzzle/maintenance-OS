<?php

namespace App\Events\Scheduling;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SchedulingProgress implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public string $jobId,
        public int $scheduleVersionId,
        public float $percentage,
        public int $currentStep,
        public int $totalSteps,
        public string $currentOperation,
        public ?int $estimatedSecondsRemaining = null
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
            'percentage' => $this->percentage,
            'currentStep' => $this->currentStep,
            'totalSteps' => $this->totalSteps,
            'currentOperation' => $this->currentOperation,
            'estimatedSecondsRemaining' => $this->estimatedSecondsRemaining,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
