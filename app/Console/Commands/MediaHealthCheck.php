<?php

namespace App\Console\Commands;

use App\Models\Media;
use App\Models\User;
use App\Notifications\MediaHealthIssues;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class MediaHealthCheck extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:health-check 
                            {--fix : Attempt to fix issues}
                            {--notify : Send notifications}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check media library health and integrity';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Log::info('[media health check] Media health check started');
        $this->info('Running media health check...');

        $issues = [];

        // Check for orphaned media
        $orphanedCount = $this->checkOrphanedMedia();
        if ($orphanedCount > 0) {
            $issues[] = "Found {$orphanedCount} orphaned media records";
        }

        // Check for missing files
        $missingCount = $this->checkMissingFiles();
        if ($missingCount > 0) {
            $issues[] = "Found {$missingCount} media records with missing files";
        }

        // Check conversion status
        $pendingConversions = $this->checkPendingConversions();
        if ($pendingConversions > 0) {
            $issues[] = "Found {$pendingConversions} media items with pending conversions";
        }

        // Check disk usage
        $diskUsage = $this->checkDiskUsage();
        if ($diskUsage['warning']) {
            $issues[] = $diskUsage['message'];
        }

        // Report results
        if (empty($issues)) {
            $this->info('✓ Media library is healthy!');
            Log::info('[media health check] Media health check completed - no issues found');
        } else {
            $this->warn('Found the following issues:');
            foreach ($issues as $issue) {
                $this->warn("- {$issue}");
            }

            Log::info('[media health check] Media health check completed - found ' . count($issues) . ' issue(s)');

            if ($this->option('notify')) {
                $this->sendNotifications($issues);
            }
        }

        return empty($issues) ? 0 : 1;
    }

    /**
     * Check for orphaned media records.
     */
    protected function checkOrphanedMedia(): int
    {
        $orphaned = Media::doesntHave('model')->count();

        if ($orphaned > 0 && $this->option('fix')) {
            $this->info("Removing {$orphaned} orphaned media records...");

            Media::doesntHave('model')->each(function ($media) {
                $media->delete();
            });

            $this->info("Removed {$orphaned} orphaned records");
        }

        return $orphaned;
    }

    /**
     * Check for missing files.
     */
    protected function checkMissingFiles(): int
    {
        $missing = 0;
        $progressBar = $this->output->createProgressBar(Media::count());
        $progressBar->start();

        Media::chunk(100, function ($mediaItems) use (&$missing, $progressBar) {
            foreach ($mediaItems as $media) {
                if (! Storage::disk($media->disk)->exists($media->getPath())) {
                    $missing++;

                    if ($this->option('fix')) {
                        $media->delete();
                    }
                }
                $progressBar->advance();
            }
        });

        $progressBar->finish();
        $this->newLine();

        if ($missing > 0 && $this->option('fix')) {
            $this->info("Removed {$missing} media records with missing files");
        }

        return $missing;
    }

    /**
     * Check for pending conversions.
     */
    protected function checkPendingConversions(): int
    {
        $pending = Media::where('generated_conversions', 'like', '%false%')->count();

        if ($pending > 0 && $this->option('fix')) {
            $this->info("Processing {$pending} pending conversions...");

            Media::where('generated_conversions', 'like', '%false%')
                ->each(function ($media) {
                    dispatch(new \Spatie\MediaLibrary\Conversions\Jobs\PerformConversionsJob(
                        $media,
                        $media->getConversions()->pluck('name')->toArray()
                    ));
                });

            $this->info("Queued {$pending} media items for conversion");
        }

        return $pending;
    }

    /**
     * Check disk usage.
     */
    protected function checkDiskUsage(): array
    {
        $totalSize = Media::sum('size');
        $totalSizeGB = round($totalSize / 1024 / 1024 / 1024, 2);

        $this->info("Total media storage used: {$totalSizeGB} GB");

        // Check by collection
        $this->info("\nStorage by collection:");

        Media::select('collection_name')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(size) as total_size')
            ->groupBy('collection_name')
            ->orderByDesc('total_size')
            ->get()
            ->each(function ($collection) {
                $sizeGB = round($collection->total_size / 1024 / 1024 / 1024, 2);
                $this->info("  {$collection->collection_name}: {$collection->count} files, {$sizeGB} GB");
            });

        // Warning if storage is high
        $warningThresholdGB = config('media-library.storage_warning_threshold', 100);

        return [
            'warning' => $totalSizeGB > $warningThresholdGB,
            'message' => "Media storage usage is high: {$totalSizeGB} GB (threshold: {$warningThresholdGB} GB)",
            'total_size_gb' => $totalSizeGB,
        ];
    }

    /**
     * Send notifications about issues.
     */
    protected function sendNotifications(array $issues): void
    {
        $admins = User::role('super-admin')->get();

        if ($admins->isEmpty()) {
            Log::info('[media health check] No administrators found to notify about media health issues');

            return;
        }

        Notification::send($admins, new MediaHealthIssues($issues));

        Log::info('[media health check] Media health notifications sent to ' . $admins->count() . ' administrator(s)');
        $this->info('Notifications sent to administrators');
    }
}
