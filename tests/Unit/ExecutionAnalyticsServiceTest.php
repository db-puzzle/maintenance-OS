<?php

namespace Tests\Unit;

use App\Models\AssetHierarchy\Asset;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use App\Models\User;
use App\Services\ExecutionAnalyticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExecutionAnalyticsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ExecutionAnalyticsService $service;

    protected User $user;

    protected Routine $routine;

    protected Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ExecutionAnalyticsService;
        $this->user = User::factory()->create();
        $this->asset = Asset::factory()->create();
        $this->routine = Routine::factory()->create();
        $this->routine->assets()->attach($this->asset);
    }

    /** @test */
    public function it_calculates_dashboard_stats_correctly()
    {
        // Create executions with different statuses
        RoutineExecution::factory()->count(3)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        RoutineExecution::factory()->count(1)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_IN_PROGRESS,
        ]);

        RoutineExecution::factory()->count(1)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_CANCELLED,
        ]);

        $stats = $this->service->getDashboardStats();

        $this->assertEquals(5, $stats['total']);
        $this->assertEquals(3, $stats['completed']);
        $this->assertEquals(1, $stats['in_progress']);
        $this->assertEquals(1, $stats['failed']);
        $this->assertEquals(60.0, $stats['completion_rate']);
        $this->assertArrayHasKey('trend', $stats);
    }

    /** @test */
    public function it_returns_recent_executions()
    {
        // Create executions with different timestamps
        $executions = RoutineExecution::factory()->count(3)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => Carbon::now()->subMinutes(30),
        ]);

        $recentExecutions = $this->service->getRecentExecutions(5);

        $this->assertCount(3, $recentExecutions);
        $this->assertEquals($executions->first()->id, $recentExecutions->first()['id']);
        $this->assertArrayHasKey('routine_name', $recentExecutions->first());
        $this->assertArrayHasKey('asset_tag', $recentExecutions->first());
        $this->assertArrayHasKey('executor_name', $recentExecutions->first());
    }

    /** @test */
    public function it_generates_daily_trend_data()
    {
        $today = Carbon::today();
        $yesterday = $today->copy()->subDay();

        // Create executions on different days
        RoutineExecution::factory()->count(2)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => $today,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => $yesterday,
            'status' => RoutineExecution::STATUS_CANCELLED,
        ]);

        $trendData = $this->service->getDailyTrend(7);

        $this->assertNotEmpty($trendData);

        $todayData = $trendData->firstWhere('date', $today->toDateString());
        if ($todayData) {
            $this->assertEquals(2, $todayData['count']);
            $this->assertEquals(2, $todayData['completed']);
            $this->assertEquals(0, $todayData['failed']);
        }

        $yesterdayData = $trendData->firstWhere('date', $yesterday->toDateString());
        if ($yesterdayData) {
            $this->assertEquals(1, $yesterdayData['count']);
            $this->assertEquals(0, $yesterdayData['completed']);
            $this->assertEquals(1, $yesterdayData['failed']);
        }
    }

    /** @test */
    public function it_calculates_performance_metrics()
    {
        // Create completed executions with durations
        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
            'started_at' => Carbon::now()->subMinutes(60),
            'completed_at' => Carbon::now()->subMinutes(30), // 30 minutes duration
        ]);

        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
            'started_at' => Carbon::now()->subMinutes(90),
            'completed_at' => Carbon::now()->subMinutes(30), // 60 minutes duration
        ]);

        $metrics = $this->service->getPerformanceMetrics();

        $this->assertEquals(45.0, $metrics['average_duration_minutes']); // (30 + 60) / 2
        $this->assertEquals(30, $metrics['fastest_execution_minutes']);
        $this->assertEquals(60, $metrics['slowest_execution_minutes']);
        $this->assertEquals(1.5, $metrics['total_execution_time_hours']); // 90 minutes / 60
    }

    /** @test */
    public function it_handles_empty_performance_metrics()
    {
        $metrics = $this->service->getPerformanceMetrics();

        $this->assertEquals(0, $metrics['average_duration_minutes']);
        $this->assertEquals(0, $metrics['median_duration_minutes']);
        $this->assertEquals(0, $metrics['fastest_execution_minutes']);
        $this->assertEquals(0, $metrics['slowest_execution_minutes']);
        $this->assertEquals(0, $metrics['total_execution_time_hours']);
    }

    /** @test */
    public function it_gets_asset_execution_summary()
    {
        $asset2 = Asset::factory()->create(['tag' => 'ASSET-002']);
        $routine2 = Routine::factory()->create();
        $routine2->assets()->attach($asset2);

        // Create executions for different assets
        RoutineExecution::factory()->count(3)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
            'started_at' => Carbon::now()->subMinutes(60),
            'completed_at' => Carbon::now()->subMinutes(30),
        ]);

        RoutineExecution::factory()->count(2)->create([
            'routine_id' => $routine2->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
            'started_at' => Carbon::now()->subMinutes(90),
            'completed_at' => Carbon::now()->subMinutes(60),
        ]);

        $summary = $this->service->getAssetExecutionSummary();

        $this->assertCount(2, $summary);

        $asset1Summary = $summary->firstWhere('asset_id', $this->asset->id);
        $this->assertEquals(3, $asset1Summary['total_executions']);
        $this->assertEquals(3, $asset1Summary['completed_executions']);
        $this->assertEquals(100.0, $asset1Summary['completion_rate']);

        $asset2Summary = $summary->firstWhere('asset_id', $asset2->id);
        $this->assertEquals(2, $asset2Summary['total_executions']);
        $this->assertEquals(2, $asset2Summary['completed_executions']);
        $this->assertEquals(100.0, $asset2Summary['completion_rate']);
    }

    /** @test */
    public function it_applies_filters_correctly()
    {
        $asset2 = Asset::factory()->create();
        $routine2 = Routine::factory()->create();
        $routine2->assets()->attach($asset2);

        // Create executions for different assets and statuses
        RoutineExecution::factory()->count(2)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        RoutineExecution::factory()->create([
            'routine_id' => $routine2->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_IN_PROGRESS,
        ]);

        // Test filtering by asset
        $stats = $this->service->getDashboardStats([
            'asset_ids' => [$this->asset->id],
        ]);

        $this->assertEquals(2, $stats['total']);
        $this->assertEquals(2, $stats['completed']);
        $this->assertEquals(0, $stats['in_progress']);

        // Test filtering by status
        $stats = $this->service->getDashboardStats([
            'status' => [RoutineExecution::STATUS_IN_PROGRESS],
        ]);

        $this->assertEquals(1, $stats['total']);
        $this->assertEquals(0, $stats['completed']);
        $this->assertEquals(1, $stats['in_progress']);
    }

    /** @test */
    public function it_calculates_median_correctly()
    {
        // Test with odd number of values
        $collection = collect([10, 20, 30]);
        $median = $this->callPrivateMethod($this->service, 'getMedian', [$collection]);
        $this->assertEquals(20, $median);

        // Test with even number of values
        $collection = collect([10, 20, 30, 40]);
        $median = $this->callPrivateMethod($this->service, 'getMedian', [$collection]);
        $this->assertEquals(25, $median); // (20 + 30) / 2

        // Test with empty collection
        $collection = collect([]);
        $median = $this->callPrivateMethod($this->service, 'getMedian', [$collection]);
        $this->assertEquals(0, $median);
    }

    /**
     * Helper method to call private methods for testing
     */
    private function callPrivateMethod($object, $methodName, $parameters = [])
    {
        $reflection = new \ReflectionClass(get_class($object));
        $method = $reflection->getMethod($methodName);
        $method->setAccessible(true);

        return $method->invokeArgs($object, $parameters);
    }
}
