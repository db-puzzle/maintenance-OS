<?php

namespace App\Console\Commands;

use App\Models\Central\Feature;
use App\Services\FeatureService;
use Illuminate\Console\Command;

/**
 * Show feature flag status and clear cache.
 *
 * This command helps troubleshoot feature flag issues.
 */
class FeatureStatus extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'features:status {--clear-cache : Clear the feature cache}';

    /**
     * The console command description.
     */
    protected $description = 'Show feature flag status and optionally clear cache';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('=== Feature Flags Status ===');
        $this->newLine();

        $features = Feature::orderBy('category')->orderBy('name')->get();

        $headers = ['Key', 'Name', 'Type', 'Status', 'Category'];
        $rows = [];

        foreach ($features as $feature) {
            $rows[] = [
                $feature->key,
                $feature->name,
                $feature->is_global ? 'Global' : 'Plan-Based',
                $feature->is_global && $feature->is_enabled_globally ? '✅ Enabled' : '❌ Disabled',
                $feature->category ?? 'N/A',
            ];
        }

        $this->table($headers, $rows);

        $this->newLine();
        $this->info('Total Features: ' . $features->count());
        $this->info('Globally Enabled: ' . $features->filter(fn ($f) => $f->is_global && $f->is_enabled_globally)->count());
        $this->info('Plan-Based: ' . $features->filter(fn ($f) => ! $f->is_global)->count());

        if ($this->option('clear-cache')) {
            $this->newLine();
            $this->info('Clearing feature cache...');

            $featureService = app(FeatureService::class);
            $featureService->clearCache();

            $this->info('✅ Cache cleared successfully!');
        }

        return Command::SUCCESS;
    }
}
