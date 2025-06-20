<?php

namespace Tests\Feature;

use App\Models\AssetHierarchy\Asset;
use App\Models\Maintenance\ExecutionExport;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use App\Models\User;
use App\Services\ExecutionAnalyticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ExecutionHistoryTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;

    protected Routine $routine;

    protected Asset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->asset = Asset::factory()->create();
        $this->routine = Routine::factory()->create();
        $this->routine->assets()->attach($this->asset);
    }

    /** @test */
    public function it_shows_execution_history_dashboard()
    {
        // Create test executions
        $executions = RoutineExecution::factory()
            ->count(10)
            ->create(['routine_id' => $this->routine->id, 'executed_by' => $this->user->id]);

        $response = $this->actingAs($this->user)
            ->get('/maintenance/executions/history');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('maintenance/executions/History')
                ->has('stats')
                ->has('recentExecutions')
                ->has('dailyTrend')
                ->has('performanceMetrics')
            );
    }

    /** @test */
    public function it_calculates_dashboard_statistics_correctly()
    {
        // Create executions with different statuses
        RoutineExecution::factory()->count(5)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        RoutineExecution::factory()->count(2)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_IN_PROGRESS,
        ]);

        RoutineExecution::factory()->count(1)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_CANCELLED,
        ]);

        $service = new ExecutionAnalyticsService;
        $stats = $service->getDashboardStats();

        $this->assertEquals(8, $stats['total']);
        $this->assertEquals(5, $stats['completed']);
        $this->assertEquals(2, $stats['in_progress']);
        $this->assertEquals(1, $stats['failed']);
        $this->assertEquals(62.5, $stats['completion_rate']);
    }

    /** @test */
    public function it_filters_executions_by_date_range()
    {
        $yesterday = Carbon::yesterday();
        $today = Carbon::today();

        // Create executions on different dates
        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => $yesterday,
        ]);

        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => $today,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/maintenance/executions?'.http_build_query([
                'date_from' => $today->toDateString(),
                'date_to' => $today->toDateString(),
            ]));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('maintenance/executions/Index')
                ->where('executions.data', fn ($executions) => count($executions) === 1)
            );
    }

    /** @test */
    public function it_shows_execution_detail_view()
    {
        $execution = RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/maintenance/executions/{$execution->id}");

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('maintenance/executions/Show')
                ->has('execution')
                ->has('taskResponses')
                ->has('canExport')
            );
    }

    /** @test */
    public function it_exports_single_execution_to_pdf()
    {
        $execution = RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/maintenance/executions/{$execution->id}/export", [
                'format' => 'pdf',
                'template' => 'standard',
                'include_images' => true,
                'delivery' => [
                    'method' => 'download',
                ],
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'export_id',
                'status',
            ]);

        $this->assertDatabaseHas('execution_exports', [
            'user_id' => $this->user->id,
            'export_type' => 'single',
            'export_format' => 'pdf',
        ]);
    }

    /** @test */
    public function it_exports_multiple_executions_in_batch()
    {
        $executions = RoutineExecution::factory()->count(3)->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/maintenance/executions/export/batch', [
                'execution_ids' => $executions->pluck('id')->toArray(),
                'format' => 'pdf',
                'template' => 'summary',
                'grouping' => 'by_asset',
                'delivery' => [
                    'method' => 'download',
                ],
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'export_id',
                'status',
                'estimated_time_seconds',
            ]);

        $this->assertDatabaseHas('execution_exports', [
            'user_id' => $this->user->id,
            'export_type' => 'batch',
            'export_format' => 'pdf',
        ]);
    }

    /** @test */
    public function it_tracks_export_status()
    {
        $export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'status' => ExecutionExport::STATUS_PROCESSING,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/maintenance/executions/exports/{$export->id}/status");

        $response->assertOk()
            ->assertJsonStructure([
                'export_id',
                'status',
                'progress_percentage',
            ]);
    }

    /** @test */
    public function it_prevents_unauthorized_export_access()
    {
        $otherUser = User::factory()->create();
        $export = ExecutionExport::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/maintenance/executions/exports/{$export->id}/status");

        $response->assertForbidden();
    }

    /** @test */
    public function it_validates_export_parameters()
    {
        $execution = RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/maintenance/executions/{$execution->id}/export", [
                'format' => 'invalid_format',
                'delivery' => [
                    'method' => 'invalid_method',
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['format', 'delivery.method']);
    }

    /** @test */
    public function it_returns_user_export_history()
    {
        ExecutionExport::factory()->count(3)->create([
            'user_id' => $this->user->id,
        ]);

        // Create exports for another user that shouldn't appear
        $otherUser = User::factory()->create();
        ExecutionExport::factory()->count(2)->create([
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/maintenance/executions/exports');

        $response->assertOk()
            ->assertJsonStructure([
                'exports' => [
                    '*' => [
                        'id',
                        'export_type',
                        'export_format',
                        'execution_count',
                        'status',
                        'created_at',
                    ],
                ],
            ])
            ->assertJsonCount(3, 'exports');
    }

    /** @test */
    public function it_filters_executions_by_multiple_criteria()
    {
        $asset2 = Asset::factory()->create();
        $routine2 = Routine::factory()->create();
        $routine2->assets()->attach($asset2);

        // Create executions for different assets and statuses
        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_COMPLETED,
        ]);

        RoutineExecution::factory()->create([
            'routine_id' => $routine2->id,
            'executed_by' => $this->user->id,
            'status' => RoutineExecution::STATUS_IN_PROGRESS,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/maintenance/executions?'.http_build_query([
                'asset_ids' => [$this->asset->id],
                'status' => [RoutineExecution::STATUS_COMPLETED],
            ]));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('executions.data', fn ($executions) => count($executions) === 1)
            );
    }

    /** @test */
    public function it_sorts_executions_by_different_columns()
    {
        // Create executions with different start times
        $execution1 = RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => Carbon::now()->subHours(2),
        ]);

        $execution2 = RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'started_at' => Carbon::now()->subHour(),
        ]);

        $response = $this->actingAs($this->user)
            ->get('/maintenance/executions?'.http_build_query([
                'sort_by' => 'started_at',
                'sort_direction' => 'asc',
            ]));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('executions.data.0.id', $execution1->id)
            );
    }

    /** @test */
    public function it_searches_executions_by_text()
    {
        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'notes' => 'Special maintenance notes',
        ]);

        RoutineExecution::factory()->create([
            'routine_id' => $this->routine->id,
            'executed_by' => $this->user->id,
            'notes' => 'Regular maintenance',
        ]);

        $response = $this->actingAs($this->user)
            ->get('/maintenance/executions?'.http_build_query([
                'search' => 'Special',
            ]));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('executions.data', fn ($executions) => count($executions) === 1)
            );
    }
}
