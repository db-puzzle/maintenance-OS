<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MediaStorageAnalytics
{
    /**
     * Get comprehensive storage metrics.
     */
    public function getStorageMetrics(): array
    {
        return Cache::remember('media_storage_metrics', 3600, function () {
            $totalSize = Media::sum('size');
            $totalCount = Media::count();

            $byCollection = Media::select('collection_name')
                ->selectRaw('COUNT(*) as count')
                ->selectRaw('SUM(size) as total_size')
                ->selectRaw('AVG(size) as avg_size')
                ->groupBy('collection_name')
                ->get()
                ->map(function ($item) {
                    return [
                        'collection' => $item->collection_name,
                        'count' => $item->count,
                        'total_size' => $item->total_size,
                        'avg_size' => round($item->avg_size, 2),
                        'total_size_mb' => round($item->total_size / 1024 / 1024, 2),
                        'percentage' => 0, // Will be calculated below
                    ];
                });

            // Calculate percentages
            if ($totalSize > 0) {
                $byCollection = $byCollection->map(function ($item) use ($totalSize) {
                    $item['percentage'] = round(($item['total_size'] / $totalSize) * 100, 2);

                    return $item;
                });
            }

            $byType = Media::select('mime_type')
                ->selectRaw('COUNT(*) as count')
                ->selectRaw('SUM(size) as total_size')
                ->groupBy('mime_type')
                ->orderByDesc('total_size')
                ->limit(10)
                ->get();

            $byModel = Media::select('model_type')
                ->selectRaw('COUNT(*) as count')
                ->selectRaw('SUM(size) as total_size')
                ->groupBy('model_type')
                ->get();

            return [
                'total_size' => $totalSize,
                'total_count' => $totalCount,
                'average_size' => $totalCount > 0 ? round($totalSize / $totalCount, 2) : 0,
                'by_collection' => $byCollection,
                'by_type' => $byType,
                'by_model' => $byModel,
                'storage_used_gb' => round($totalSize / 1024 / 1024 / 1024, 2),
                'storage_used_mb' => round($totalSize / 1024 / 1024, 2),
                'last_updated' => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Get growth metrics over time.
     */
    public function getGrowthMetrics(int $days = 30): array
    {
        return Cache::remember("media_growth_metrics_{$days}", 3600, function () use ($days) {
            $endDate = now();
            $startDate = now()->subDays($days);

            $dailyGrowth = Media::select(DB::raw('DATE(created_at) as date'))
                ->selectRaw('COUNT(*) as count')
                ->selectRaw('SUM(size) as total_size')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            $totalGrowthCount = Media::whereBetween('created_at', [$startDate, $endDate])->count();
            $totalGrowthSize = Media::whereBetween('created_at', [$startDate, $endDate])->sum('size');

            return [
                'period_days' => $days,
                'daily_growth' => $dailyGrowth,
                'total_growth_count' => $totalGrowthCount,
                'total_growth_size' => $totalGrowthSize,
                'total_growth_size_mb' => round($totalGrowthSize / 1024 / 1024, 2),
                'avg_daily_count' => round($totalGrowthCount / $days, 2),
                'avg_daily_size_mb' => round(($totalGrowthSize / 1024 / 1024) / $days, 2),
            ];
        });
    }

    /**
     * Get top uploaders.
     */
    public function getTopUploaders(int $limit = 10): array
    {
        return Cache::remember("media_top_uploaders_{$limit}", 3600, function () use ($limit) {
            return DB::table('media')
                ->select('custom_properties->uploaded_by as user_id')
                ->selectRaw('COUNT(*) as upload_count')
                ->selectRaw('SUM(size) as total_size')
                ->whereNotNull('custom_properties->uploaded_by')
                ->groupBy('custom_properties->uploaded_by')
                ->orderByDesc('upload_count')
                ->limit($limit)
                ->get()
                ->map(function ($item) {
                    $user = \App\Models\User::find($item->user_id);

                    return [
                        'user_id' => $item->user_id,
                        'user_name' => $user ? $user->name : 'Unknown',
                        'upload_count' => $item->upload_count,
                        'total_size' => $item->total_size,
                        'total_size_mb' => round($item->total_size / 1024 / 1024, 2),
                    ];
                });
        });
    }

    /**
     * Get optimization opportunities.
     */
    public function getOptimizationOpportunities(): array
    {
        $opportunities = [];

        // Large unoptimized images
        $largeImages = Media::where('mime_type', 'like', 'image/%')
            ->where('size', '>', 5 * 1024 * 1024) // > 5MB
            ->whereJsonDoesntContain('custom_properties->was_optimized', true)
            ->count();

        if ($largeImages > 0) {
            $opportunities[] = [
                'type' => 'large_unoptimized_images',
                'count' => $largeImages,
                'potential_savings' => round($largeImages * 2, 2), // Estimate 2MB savings per image
                'description' => "Found {$largeImages} large images that could be optimized",
            ];
        }

        // Missing conversions
        $missingConversions = Media::where('mime_type', 'like', 'image/%')
            ->where('generated_conversions', 'like', '%false%')
            ->count();

        if ($missingConversions > 0) {
            $opportunities[] = [
                'type' => 'missing_conversions',
                'count' => $missingConversions,
                'description' => "Found {$missingConversions} images with missing conversions",
            ];
        }

        // Duplicate files
        $duplicates = DB::table('media')
            ->select('custom_properties->file_hash as hash')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(size) as total_size')
            ->whereNotNull('custom_properties->file_hash')
            ->groupBy('custom_properties->file_hash')
            ->having('count', '>', 1)
            ->get();

        $duplicateCount = $duplicates->sum('count') - $duplicates->count();
        $duplicateSize = $duplicates->sum(function ($item) {
            return $item->total_size - ($item->total_size / $item->count);
        });

        if ($duplicateCount > 0) {
            $opportunities[] = [
                'type' => 'duplicate_files',
                'count' => $duplicateCount,
                'potential_savings_mb' => round($duplicateSize / 1024 / 1024, 2),
                'description' => "Found {$duplicateCount} duplicate files",
            ];
        }

        return $opportunities;
    }

    /**
     * Clear all analytics caches.
     */
    public function clearCache(): void
    {
        Cache::forget('media_storage_metrics');
        Cache::forget('media_growth_metrics_30');
        Cache::forget('media_top_uploaders_10');
    }
}
