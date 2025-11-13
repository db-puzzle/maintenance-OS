<?php

namespace App\Http\Controllers;

use App\Traits\HasCaseInsensitiveSearch;
use Illuminate\Database\Eloquent\Builder;

/**
 * Base controller that provides case-insensitive search functionality.
 *
 * Controllers that need search functionality should extend this controller
 * to automatically get case-insensitive search capabilities.
 */
abstract class BaseSearchController extends Controller
{
    use HasCaseInsensitiveSearch;

    /**
     * Apply search filter to a query builder.
     *
     * This method can be overridden in child controllers for custom search logic
     *
     * @param Builder $query The query builder
     * @param string $search The search term
     * @param array $searchColumns Columns to search in
     */
    protected function applySearchFilter(Builder $query, ?string $search, array $searchColumns): Builder
    {
        if (empty($search)) {
            return $query;
        }

        // Check if we have advanced search configuration
        if ($this->hasAdvancedSearchConfig($searchColumns)) {
            return $this->applyAdvancedCaseInsensitiveSearch($query, $searchColumns, $search);
        }

        // Simple column search
        return $this->applyCaseInsensitiveSearch($query, $searchColumns, $search);
    }

    /**
     * Check if the search columns array contains advanced configuration.
     */
    private function hasAdvancedSearchConfig(array $searchColumns): bool
    {
        foreach ($searchColumns as $config) {
            if (is_array($config) && isset($config['relation'])) {
                return true;
            }
        }

        return false;
    }
}
