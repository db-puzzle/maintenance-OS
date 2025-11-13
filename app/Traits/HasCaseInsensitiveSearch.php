<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

/**
 * Trait to handle case-insensitive search queries across the application.
 *
 * This trait provides methods to perform case-insensitive searches
 * on database columns, ensuring consistent behavior across different
 * database systems (MySQL, PostgreSQL, SQLite).
 */
trait HasCaseInsensitiveSearch
{
    /**
     * Apply case-insensitive search to a query builder.
     *
     * @param Builder $query The query builder instance
     * @param string|array $columns Column(s) to search in
     * @param string $searchTerm The search term
     * @param string $boolean Whether to use 'and' or 'or' for multiple columns
     */
    protected function applyCaseInsensitiveSearch(Builder $query, $columns, string $searchTerm, string $boolean = 'or'): Builder
    {
        if (empty($searchTerm)) {
            return $query;
        }

        $columns = is_array($columns) ? $columns : [$columns];
        $searchTerm = strtolower($searchTerm);

        return $query->where(function ($q) use ($columns, $searchTerm, $boolean) {
            foreach ($columns as $index => $column) {
                $method = $index === 0 ? 'whereRaw' : ($boolean === 'or' ? 'orWhereRaw' : 'whereRaw');

                // Handle related columns (e.g., 'relation.column')
                if (str_contains($column, '.')) {
                    [$relation, $relatedColumn] = explode('.', $column, 2);
                    $q->$method('EXISTS (
                        SELECT 1 FROM ' . $this->getTableFromRelation($relation) . '
                        WHERE ' . $this->getRelationForeignKey($relation) . ' = ' . $this->getTable() . '.id
                        AND LOWER(' . $relatedColumn . ') LIKE ?
                    )', ["%{$searchTerm}%"]);
                } else {
                    // Direct column search
                    $q->$method("LOWER({$column}) LIKE ?", ["%{$searchTerm}%"]);
                }
            }
        });
    }

    /**
     * Apply case-insensitive search with relationships.
     *
     * @param Builder $query The query builder instance
     * @param array $searchConfig Configuration array for search
     * @param string $searchTerm The search term
     */
    protected function applyAdvancedCaseInsensitiveSearch(Builder $query, array $searchConfig, string $searchTerm): Builder
    {
        if (empty($searchTerm)) {
            return $query;
        }

        $searchTerm = strtolower($searchTerm);

        return $query->where(function ($q) use ($searchConfig, $searchTerm) {
            foreach ($searchConfig as $config) {
                if (is_string($config)) {
                    // Simple column search
                    $q->orWhereRaw("LOWER({$config}) LIKE ?", ["%{$searchTerm}%"]);
                } elseif (is_array($config) && isset($config['relation'])) {
                    // Relationship search
                    $q->orWhereHas($config['relation'], function ($relationQuery) use ($config, $searchTerm) {
                        $columns = $config['columns'] ?? ['name'];
                        $columns = is_array($columns) ? $columns : [$columns];

                        $relationQuery->where(function ($subQuery) use ($columns, $searchTerm) {
                            foreach ($columns as $column) {
                                $subQuery->orWhereRaw("LOWER({$column}) LIKE ?", ["%{$searchTerm}%"]);
                            }
                        });
                    });
                }
            }
        });
    }

    /**
     * Helper method to get table name from relation
     * This is a simplified version - you might need to enhance it based on your relations.
     */
    private function getTableFromRelation(string $relation): string
    {
        // This would need to be implemented based on your specific relations
        // For now, returning a pluralized version as a simple guess
        return str($relation)->plural()->snake()->toString();
    }

    /**
     * Helper method to get foreign key from relation
     * This is a simplified version - you might need to enhance it based on your relations.
     */
    private function getRelationForeignKey(string $relation): string
    {
        // This would need to be implemented based on your specific relations
        // For now, returning a standard foreign key format
        return str($relation)->snake()->append('_id')->toString();
    }
}
