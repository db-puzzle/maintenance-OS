<?php

namespace Tests\Unit;

use App\Jobs\GenerateExecutionPDF;
use App\Models\Maintenance\ExecutionExport;
use App\Models\Maintenance\Routine;
use App\Models\Maintenance\RoutineExecution;
use App\Models\User;
use App\Services\PDFGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class GenerateExecutionPDFTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected RoutineExecution $execution;

    protected ExecutionExport $export;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $routine = Routine::factory()->create();
        $this->execution = RoutineExecution::factory()->create([
            'routine_id' => $routine->id,
            'executed_by' => $this->user->id,
        ]);
    }

    /** @test */
    public function it_processes_single_pdf_export_successfully()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        // Mock the PDF service
        $pdfService = Mockery::mock(PDFGeneratorService::class);
        $pdfService->shouldReceive('generateExecutionReport')
            ->once()
            ->with($this->execution, Mockery::any())
            ->andReturn('exports/executions/test-report.pdf');

        $job = new GenerateExecutionPDF($this->export);
        $job->handle($pdfService);

        // Refresh the export model to see changes
        $this->export->refresh();

        $this->assertEquals(ExecutionExport::STATUS_COMPLETED, $this->export->status);
        $this->assertEquals('exports/executions/test-report.pdf', $this->export->file_path);
        $this->assertNotNull($this->export->completed_at);
    }

    /** @test */
    public function it_processes_csv_export_successfully()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_CSV,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        // Mock the PDF service (which also handles CSV)
        $pdfService = Mockery::mock(PDFGeneratorService::class);
        $pdfService->shouldReceive('generateCSVExport')
            ->once()
            ->with([$this->execution->id])
            ->andReturn('exports/executions/export.csv');

        $job = new GenerateExecutionPDF($this->export);
        $job->handle($pdfService);

        $this->export->refresh();

        $this->assertEquals(ExecutionExport::STATUS_COMPLETED, $this->export->status);
        $this->assertEquals('exports/executions/export.csv', $this->export->file_path);
    }

    /** @test */
    public function it_marks_export_as_processing_when_starting()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        // Mock the PDF service to do nothing so we can check the processing status
        $pdfService = Mockery::mock(PDFGeneratorService::class);
        $pdfService->shouldReceive('generateExecutionReport')
            ->once()
            ->andReturnUsing(function () {
                // During processing, check the status
                $this->export->refresh();
                $this->assertEquals(ExecutionExport::STATUS_PROCESSING, $this->export->status);

                return 'exports/executions/test-report.pdf';
            });

        $job = new GenerateExecutionPDF($this->export);
        $job->handle($pdfService);
    }

    /** @test */
    public function it_handles_exceptions_and_marks_export_as_failed()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        // Mock the PDF service to throw an exception
        $pdfService = Mockery::mock(PDFGeneratorService::class);
        $pdfService->shouldReceive('generateExecutionReport')
            ->once()
            ->andThrow(new \Exception('PDF generation failed'));

        Log::shouldReceive('info')->twice(); // Start and error logs
        Log::shouldReceive('error')->once();

        $job = new GenerateExecutionPDF($this->export);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('PDF generation failed');

        $job->handle($pdfService);

        $this->export->refresh();
        $this->assertEquals(ExecutionExport::STATUS_FAILED, $this->export->status);
    }

    /** @test */
    public function it_handles_job_failure()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PROCESSING,
        ]);

        Log::shouldReceive('error')->once();

        $job = new GenerateExecutionPDF($this->export);
        $exception = new \Exception('Job failed permanently');

        $job->failed($exception);

        $this->export->refresh();
        $this->assertEquals(ExecutionExport::STATUS_FAILED, $this->export->status);
    }

    /** @test */
    public function it_throws_exception_for_missing_execution_id()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [], // Empty array
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        $pdfService = Mockery::mock(PDFGeneratorService::class);
        $pdfService->shouldNotReceive('generateExecutionReport');

        Log::shouldReceive('info')->once(); // Start log
        Log::shouldReceive('error')->once(); // Error log

        $job = new GenerateExecutionPDF($this->export);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('No execution ID provided for single PDF generation');

        $job->handle($pdfService);
    }

    /** @test */
    public function it_throws_exception_for_unsupported_export_combination()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => 'unsupported_format', // Invalid format
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        $pdfService = Mockery::mock(PDFGeneratorService::class);

        Log::shouldReceive('info')->once(); // Start log
        Log::shouldReceive('error')->once(); // Error log

        $job = new GenerateExecutionPDF($this->export);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Unsupported export combination');

        $job->handle($pdfService);
    }

    /** @test */
    public function it_calculates_progress_percentage()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PROCESSING,
            'updated_at' => now()->subSeconds(3), // Processing for 3 seconds
        ]);

        $job = new GenerateExecutionPDF($this->export);
        $progress = $job->getProgressPercentage();

        $this->assertIsInt($progress);
        $this->assertGreaterThanOrEqual(0, $progress);
        $this->assertLessThanOrEqual(90, $progress); // Should be capped at 90%
    }

    /** @test */
    public function it_logs_generation_start_and_completion()
    {
        $this->export = ExecutionExport::factory()->create([
            'user_id' => $this->user->id,
            'export_type' => ExecutionExport::TYPE_SINGLE,
            'export_format' => ExecutionExport::FORMAT_PDF,
            'execution_ids' => [$this->execution->id],
            'status' => ExecutionExport::STATUS_PENDING,
        ]);

        $pdfService = Mockery::mock(PDFGeneratorService::class);
        $pdfService->shouldReceive('generateExecutionReport')
            ->once()
            ->andReturn('exports/executions/test-report.pdf');

        // Expect specific log messages
        Log::shouldReceive('info')
            ->once()
            ->with(
                "Starting PDF generation for export {$this->export->id}",
                Mockery::subset([
                    'export_id' => $this->export->id,
                    'execution_count' => 1,
                    'format' => ExecutionExport::FORMAT_PDF,
                    'type' => ExecutionExport::TYPE_SINGLE,
                ])
            );

        Log::shouldReceive('info')
            ->once()
            ->with(
                "PDF generation completed for export {$this->export->id}",
                Mockery::subset([
                    'export_id' => $this->export->id,
                    'file_path' => 'exports/executions/test-report.pdf',
                ])
            );

        $job = new GenerateExecutionPDF($this->export);
        $job->handle($pdfService);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
