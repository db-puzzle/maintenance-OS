<?php

namespace App\Console\Commands;

use App\Jobs\GenerateMediaMetadata;
use App\Models\Media;
use Illuminate\Console\Command;

class RegenerateMediaMetadata extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:regenerate-metadata 
                            {--missing : Only process media missing metadata}
                            {--id=* : Process specific media IDs}
                            {--limit= : Limit number of media to process}
                            {--force : Skip confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Regenerate metadata (hashes, blurhash, dimensions) for media files';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $query = Media::query();

        // Filter by specific IDs if provided
        if ($ids = $this->option('id')) {
            $query->whereIn('id', $ids);
        }

        // Only process missing metadata if requested
        if ($this->option('missing')) {
            $query->where(function ($q) {
                $q->whereNull('file_hash')
                    ->orWhereNull('blurhash')
                    ->orWhereNull('width')
                    ->orWhereNull('height');
            });
        }

        // Apply limit if specified
        if ($limit = $this->option('limit')) {
            $query->limit($limit);
        }

        $media = $query->get();
        $count = $media->count();

        if ($count === 0) {
            $this->info('No media found to process.');

            return self::SUCCESS;
        }

        $this->info("Found {$count} media files to process.");

        if ($this->option('force') || $this->confirm("Do you want to regenerate metadata for {$count} media files?")) {
            $bar = $this->output->createProgressBar($count);
            $bar->start();

            foreach ($media as $item) {
                // Dispatch the job to generate metadata
                dispatch(new GenerateMediaMetadata($item));
                $bar->advance();
            }

            $bar->finish();
            $this->newLine();
            $this->info('Metadata regeneration jobs dispatched successfully!');
            $this->info('Run `php artisan queue:work` to process the jobs.');
        }

        return self::SUCCESS;
    }
}
