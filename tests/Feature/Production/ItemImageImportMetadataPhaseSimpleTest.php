<?php

namespace Tests\Feature\Production;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ItemImageImportMetadataPhaseSimpleTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->user->givePermissionTo('production.items.import');
        $this->actingAs($this->user);
    }

    public function test_metadata_phase_total_uses_valid_count_when_no_summary(): void
    {
        // Create a session with validation data but no summary
        $sessionId = 'test-session-' . uniqid();
        $sessionData = [
            'sessionId' => $sessionId,
            'status' => 'processing',
            'files' => [
                ['filename' => 'test1.jpg', 'valid' => true],
                ['filename' => 'test2.jpg', 'valid' => true],
                ['filename' => 'test3.jpg', 'valid' => false],
                ['filename' => 'test4.jpg', 'valid' => true],
                ['filename' => 'test5.jpg', 'valid' => true],
            ],
            'total' => 5,
            'valid_count' => 4, // 4 valid files
            'processed' => 0,
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        // Make request to get session status
        $response = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $response->assertOk();

        $phases = $response->json('phases');
        $metadataPhase = $phases['metadata'];

        // The total should be the valid file count (4), not dynamic
        $this->assertEquals(4, $metadataPhase['total'], 'Metadata phase total should be the valid file count');
    }

    public function test_metadata_phase_total_uses_valid_count_not_summary(): void
    {
        // Create a session with full summary data
        $sessionId = 'test-session-' . uniqid();
        $sessionData = [
            'sessionId' => $sessionId,
            'status' => 'completed',
            'files' => [],
            'total' => 10,
            'valid_count' => 8,
            'processed' => 8,
            'summary' => [
                'itemsAffected' => 5,
                'imagesImported' => 5,
                'imagesSkipped' => 2,
                'imagesReplaced' => 3,
                'duplicatesSkipped' => 0,
                'errors' => [],
            ],
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        // Make request to get session status
        $response = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $response->assertOk();

        $phases = $response->json('phases');
        $metadataPhase = $phases['metadata'];

        // The total should now always be the valid_count (8), NOT the sum of imported + replaced
        $this->assertEquals(8, $metadataPhase['total'], 'Metadata phase total should be the valid file count');
    }

    public function test_metadata_phase_total_remains_consistent(): void
    {
        // Test that shows the bug was fixed
        $sessionId = 'test-session-' . uniqid();

        // First state: processing with no media yet
        $sessionData = [
            'sessionId' => $sessionId,
            'status' => 'processing',
            'files' => array_map(fn ($i) => ['filename' => "test{$i}.jpg", 'valid' => true], range(1, 10)),
            'total' => 10,
            'valid_count' => 10,
            'processed' => 5,
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        $response1 = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $response1->assertOk();
        $phase1 = $response1->json('phases.metadata');

        // Should use valid_count as total
        $this->assertEquals(10, $phase1['total'], 'Initial metadata phase total should be 10');

        // Update with partial summary
        $sessionData['summary'] = [
            'imagesImported' => 3,
            'imagesReplaced' => 0,
        ];
        $sessionData['processed'] = 8;

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        $response2 = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $response2->assertOk();
        $phase2 = $response2->json('phases.metadata');

        // Total should still be consistent - always using valid_count
        $this->assertEquals(10, $phase2['total'], 'Metadata phase total should remain 10 even with partial summary');
    }

    public function test_metadata_phase_total_does_not_increase_with_growing_summary(): void
    {
        // This test specifically checks the bug where total increases as summary grows
        $sessionId = 'test-session-' . uniqid();
        $validFiles = 5;

        // Initial state: processing just started
        $sessionData = [
            'sessionId' => $sessionId,
            'status' => 'processing',
            'files' => array_map(fn ($i) => ['filename' => "test{$i}.jpg", 'valid' => true], range(1, $validFiles)),
            'total' => $validFiles,
            'valid_count' => $validFiles,
            'processed' => 1,
            'summary' => [
                'imagesImported' => 1,
                'imagesReplaced' => 0,
            ],
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        $response1 = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $phase1 = $response1->json('phases.metadata');
        $this->assertEquals($validFiles, $phase1['total'], 'Initial metadata phase total should be 5');

        // Simulate processing halfway - summary grows
        $sessionData['processed'] = 3;
        $sessionData['summary'] = [
            'imagesImported' => 2,
            'imagesReplaced' => 1,
            // This would make old logic calculate total as 2+1 = 3
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        $response2 = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $phase2 = $response2->json('phases.metadata');
        $this->assertEquals($validFiles, $phase2['total'], 'Metadata phase total should still be 5, not 3');

        // Simulate near completion - summary grows more
        $sessionData['processed'] = 5;
        $sessionData['summary'] = [
            'imagesImported' => 3,
            'imagesReplaced' => 2,
            // Old logic would calculate total as 3+2 = 5, coincidentally correct
            // But if there were skipped files, this would be wrong
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        $response3 = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $phase3 = $response3->json('phases.metadata');
        $this->assertEquals($validFiles, $phase3['total'], 'Metadata phase total should consistently be 5');
    }

    public function test_processing_phase_does_not_exceed_total(): void
    {
        // Test that processing phase completed count doesn't exceed total
        $sessionId = 'test-session-' . uniqid();

        $sessionData = [
            'sessionId' => $sessionId,
            'status' => 'processing',
            'files' => [
                ['filename' => 'test1.jpg', 'valid' => true],
                ['filename' => 'test2.jpg', 'valid' => true],
                ['filename' => 'test3.jpg', 'valid' => true],
                ['filename' => 'invalid.txt', 'valid' => false], // Invalid file
                ['filename' => 'test4.jpg', 'valid' => true],
            ],
            'total' => 5,
            'valid_count' => 4, // Only 4 valid files
            'processed' => 5, // But job processed all 5 files
        ];

        Cache::put("image_import_session_{$sessionId}", $sessionData, now()->addHours(24));

        $response = $this->getJson(route('production.items.images.import.session-status', [
            'sessionId' => $sessionId,
        ]));

        $response->assertOk();

        $phases = $response->json('phases');
        $processingPhase = $phases['processing'];
        $metadataPhase = $phases['metadata'];

        // Processing should be capped at valid_count (4), not show 5
        $this->assertEquals(4, $processingPhase['total'], 'Processing phase total should be 4');
        $this->assertEquals(4, $processingPhase['completed'], 'Processing phase completed should be capped at 4, not 5');
        $this->assertEquals(100, $processingPhase['progress'], 'Processing phase should show 100% (4/4), not 125% (5/4)');

        // Metadata phase should also use valid_count
        $this->assertEquals(4, $metadataPhase['total'], 'Metadata phase total should also be 4');
    }
}
