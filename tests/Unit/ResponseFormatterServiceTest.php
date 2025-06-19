<?php

namespace Tests\Unit;

use App\Models\Forms\FormTask;
use App\Models\Forms\ResponseAttachment;
use App\Models\Forms\TaskResponse;
use App\Services\ResponseFormatterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResponseFormatterServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ResponseFormatterService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ResponseFormatterService;
    }

    /** @test */
    public function it_formats_measurement_response_within_range()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_MEASUREMENT,
            'configuration' => [
                'measurement' => [
                    'unit' => 'L',
                    'min' => 3.0,
                    'max' => 5.0,
                    'target' => 4.0,
                ],
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['value' => 4.2],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('measurement', $formatted['type']);
        $this->assertEquals(4.2, $formatted['value']);
        $this->assertEquals('L', $formatted['unit']);
        $this->assertEquals('4.2 L', $formatted['display_value']);
        $this->assertTrue($formatted['is_within_range']);
        $this->assertEquals('success', $formatted['status']);
        $this->assertArrayHasKey('range_info', $formatted);
    }

    /** @test */
    public function it_formats_measurement_response_outside_range()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_MEASUREMENT,
            'configuration' => [
                'measurement' => [
                    'unit' => 'L',
                    'min' => 3.0,
                    'max' => 5.0,
                ],
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['value' => 6.0],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('measurement', $formatted['type']);
        $this->assertFalse($formatted['is_within_range']);
        $this->assertEquals('warning', $formatted['status']);
    }

    /** @test */
    public function it_formats_multiple_choice_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_MULTIPLE_CHOICE,
            'configuration' => [
                'options' => [
                    ['value' => 'good', 'label' => 'Good Condition'],
                    ['value' => 'fair', 'label' => 'Fair Condition'],
                    ['value' => 'poor', 'label' => 'Poor Condition'],
                ],
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['value' => 'good'],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('multiple_choice', $formatted['type']);
        $this->assertEquals('good', $formatted['value']);
        $this->assertEquals('Good Condition', $formatted['display_value']);
        $this->assertEquals('success', $formatted['status']);
        $this->assertArrayHasKey('options', $formatted);
    }

    /** @test */
    public function it_formats_multiple_select_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_MULTIPLE_SELECT,
            'configuration' => [
                'options' => [
                    ['value' => 'leak', 'label' => 'Leak Detected'],
                    ['value' => 'noise', 'label' => 'Unusual Noise'],
                    ['value' => 'vibration', 'label' => 'Excessive Vibration'],
                ],
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['values' => ['leak', 'noise']],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('multiple_select', $formatted['type']);
        $this->assertEquals(['leak', 'noise'], $formatted['values']);
        $this->assertEquals('Leak Detected, Unusual Noise', $formatted['display_value']);
        $this->assertEquals(2, $formatted['selected_count']);
        $this->assertEquals('success', $formatted['status']);
    }

    /** @test */
    public function it_formats_question_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_QUESTION,
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['answer' => 'The equipment is functioning normally with no visible issues.'],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('question', $formatted['type']);
        $this->assertEquals('The equipment is functioning normally with no visible issues.', $formatted['value']);
        $this->assertEquals('The equipment is functioning normally with no visible issues.', $formatted['display_value']);
        $this->assertArrayHasKey('word_count', $formatted);
        $this->assertArrayHasKey('character_count', $formatted);
        $this->assertEquals('success', $formatted['status']);
    }

    /** @test */
    public function it_formats_photo_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_PHOTO,
        ]);

        $attachment = ResponseAttachment::factory()->make([
            'filename' => 'equipment-photo.jpg',
            'file_path' => 'uploads/photos/equipment-photo.jpg',
        ]);

        $response = TaskResponse::factory()->make([
            'response' => [],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);
        $response->setRelation('attachments', collect([$attachment]));

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('photo', $formatted['type']);
        $this->assertArrayHasKey('photos', $formatted);
        $this->assertEquals(1, $formatted['photo_count']);
        $this->assertEquals('1 photo(s) captured', $formatted['display_value']);
        $this->assertEquals('success', $formatted['status']);
    }

    /** @test */
    public function it_formats_file_upload_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_FILE_UPLOAD,
        ]);

        $attachment = ResponseAttachment::factory()->make([
            'filename' => 'manual.pdf',
            'file_path' => 'uploads/files/manual.pdf',
        ]);

        $response = TaskResponse::factory()->make([
            'response' => [],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);
        $response->setRelation('attachments', collect([$attachment]));

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('file_upload', $formatted['type']);
        $this->assertArrayHasKey('files', $formatted);
        $this->assertEquals(1, $formatted['file_count']);
        $this->assertEquals('1 file(s) uploaded', $formatted['display_value']);
        $this->assertEquals('success', $formatted['status']);
    }

    /** @test */
    public function it_formats_code_reader_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_CODE_READER,
            'configuration' => [
                'codeReaderType' => 'qr_code',
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['code' => 'QR123456789'],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('code_reader', $formatted['type']);
        $this->assertEquals('QR123456789', $formatted['value']);
        $this->assertEquals('qr_code', $formatted['code_type']);
        $this->assertEquals('QR123456789', $formatted['display_value']);
        $this->assertEquals('success', $formatted['status']);
    }

    /** @test */
    public function it_handles_empty_response()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_QUESTION,
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['answer' => ''],
            'is_completed' => false,
        ]);

        $response->setRelation('formTask', $task);

        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('question', $formatted['type']);
        $this->assertEquals('No answer provided', $formatted['display_value']);
        $this->assertEquals('incomplete', $formatted['status']);
    }

    /** @test */
    public function it_determines_task_completion_status()
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_QUESTION,
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['answer' => 'Test answer'],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $status = $this->service->getTaskCompletionStatus($response);
        $this->assertEquals('success', $status);

        // Test incomplete response
        $response->is_completed = false;
        $status = $this->service->getTaskCompletionStatus($response);
        $this->assertEquals('incomplete', $status);
    }

    /** @test */
    public function it_checks_if_response_is_acceptable()
    {
        // Test measurement within range
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_MEASUREMENT,
            'configuration' => [
                'measurement' => [
                    'min' => 3.0,
                    'max' => 5.0,
                ],
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['value' => 4.0],
            'is_completed' => true,
        ]);

        $response->setRelation('formTask', $task);

        $this->assertTrue($this->service->isResponseAcceptable($response));

        // Test measurement outside range
        $response->response = ['value' => 6.0];
        $this->assertFalse($this->service->isResponseAcceptable($response));

        // Test incomplete response
        $response->is_completed = false;
        $this->assertFalse($this->service->isResponseAcceptable($response));
    }

    /** @test */
    public function it_generates_responses_summary()
    {
        $responses = collect([
            // Completed and acceptable
            $this->createMockResponse(FormTask::TYPE_QUESTION, ['answer' => 'Good'], true),

            // Completed but with issues (measurement outside range)
            $this->createMockMeasurementResponse(6.0, true), // Outside range 3-5

            // Incomplete
            $this->createMockResponse(FormTask::TYPE_QUESTION, ['answer' => ''], false),

            // Completed and acceptable
            $this->createMockResponse(FormTask::TYPE_QUESTION, ['answer' => 'Excellent'], true),
        ]);

        $summary = $this->service->getResponsesSummary($responses);

        $this->assertEquals(4, $summary['total']);
        $this->assertEquals(3, $summary['completed']);
        $this->assertEquals(2, $summary['acceptable']); // Two good responses
        $this->assertEquals(1, $summary['with_issues']); // One measurement outside range
        $this->assertEquals(75.0, $summary['completion_rate']); // 3/4 * 100
        $this->assertEquals(66.7, $summary['quality_rate']); // 2/3 * 100
    }

    /** @test */
    public function it_handles_missing_task_relationship()
    {
        $response = TaskResponse::factory()->make([
            'response' => ['value' => 'test'],
            'is_completed' => true,
        ]);

        // Don't set the formTask relationship
        $formatted = $this->service->formatResponse($response);

        $this->assertEquals('unknown', $formatted['type']);
        $this->assertEquals('Unknown task type', $formatted['display_value']);
        $this->assertEquals('error', $formatted['status']);
    }

    /**
     * Helper method to create mock response for testing
     */
    private function createMockResponse(string $type, array $responseData, bool $isCompleted): TaskResponse
    {
        $task = FormTask::factory()->make(['type' => $type]);
        $response = TaskResponse::factory()->make([
            'response' => $responseData,
            'is_completed' => $isCompleted,
        ]);

        $response->setRelation('formTask', $task);
        $response->setRelation('attachments', collect([]));

        return $response;
    }

    /**
     * Helper method to create mock measurement response
     */
    private function createMockMeasurementResponse(float $value, bool $isCompleted): TaskResponse
    {
        $task = FormTask::factory()->make([
            'type' => FormTask::TYPE_MEASUREMENT,
            'configuration' => [
                'measurement' => [
                    'min' => 3.0,
                    'max' => 5.0,
                    'unit' => 'L',
                ],
            ],
        ]);

        $response = TaskResponse::factory()->make([
            'response' => ['value' => $value],
            'is_completed' => $isCompleted,
        ]);

        $response->setRelation('formTask', $task);
        $response->setRelation('attachments', collect([]));

        return $response;
    }
}
