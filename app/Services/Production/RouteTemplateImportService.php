<?php

namespace App\Services\Production;

use App\Models\Production\ItemCategory;
use App\Models\Production\ManufacturingRoute;
use App\Models\Production\WorkCell;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class RouteTemplateImportService
{
    /**
     * Import route templates from native JSON format (our own export).
     */
    public function importFromNativeJson(array $data, bool $updateExisting = true): array
    {
        return DB::transaction(function () use ($data, $updateExisting) {
            $imported = [];
            $errors = [];
            $createdWorkCells = [];

            // Process route templates
            $templates = isset($data['templates']) ? $data['templates'] : [];
            foreach ($templates as $templateData) {
                try {
                    $result = $this->processTemplate($templateData, $updateExisting);
                    if ($result['template']) {
                        $imported[] = $result['template'];
                    }
                    // Merge created work cells
                    $createdWorkCells = array_merge($createdWorkCells, $result['created_work_cells']);
                } catch (\Exception $e) {
                    $templateName = isset($templateData['name']) ? $templateData['name'] : 'unknown';
                    $errors[] = "Failed to import template {$templateName}: " . $e->getMessage();
                }
            }

            return [
                'imported' => $imported,
                'errors' => $errors,
                'count' => count($imported),
                'skipped' => 0, // Will be tracked in processTemplate
                'created_work_cells' => array_unique($createdWorkCells),
            ];
        });
    }

    /**
     * Import route templates from CSV file.
     */
    public function importFromCsv(UploadedFile $file, array $mapping, bool $updateExisting = true): array
    {
        $rows = $this->parseCsvFile($file);
        $imported = [];
        $errors = [];
        $skipped = 0;
        $createdWorkCells = [];

        DB::transaction(function () use ($rows, $mapping, $updateExisting, &$imported, &$errors, &$skipped, &$createdWorkCells) {
            // Group rows by template (assuming template_name is mapped)
            $templateGroups = [];
            foreach ($rows as $index => $row) {
                try {
                    $mappedData = $this->mapCsvRow($row, $mapping);
                    if ($mappedData) {
                        $templateName = $mappedData['template_name'] ?? 'Template ' . ($index + 1);
                        if (! isset($templateGroups[$templateName])) {
                            $templateGroups[$templateName] = [
                                'name' => $templateName,
                                'description' => $mappedData['template_description'] ?? null,
                                'item_category_name' => $mappedData['item_category_name'] ?? null,
                                'version' => $mappedData['version'] ?? 1,
                                'is_active' => $mappedData['is_active'] ?? true,
                                'steps' => [],
                            ];
                        }
                        // Add step data
                        $templateGroups[$templateName]['steps'][] = $mappedData;
                    }
                } catch (\Exception $e) {
                    $errors[] = 'Row ' . ($index + 2) . ': ' . $e->getMessage();
                }
            }

            // Process each template group
            foreach ($templateGroups as $templateData) {
                try {
                    $result = $this->processTemplate($templateData, $updateExisting);
                    if ($result['template'] === null) {
                        $skipped++;
                    } else {
                        $imported[] = $result['template'];
                    }
                    $createdWorkCells = array_merge($createdWorkCells, $result['created_work_cells']);
                } catch (\Exception $e) {
                    $errors[] = "Template {$templateData['name']}: " . $e->getMessage();
                }
            }
        });

        return [
            'imported' => $imported,
            'errors' => $errors,
            'count' => count($imported),
            'skipped' => $skipped,
            'created_work_cells' => array_unique($createdWorkCells),
        ];
    }

    /**
     * Process and create/update a single route template.
     */
    protected function processTemplate(array $data, bool $updateExisting = true): array
    {
        $createdWorkCells = [];

        // Find or create category if provided
        $categoryId = null;
        if (isset($data['item_category_name']) && $data['item_category_name']) {
            $category = ItemCategory::firstOrCreate(
                ['name' => $data['item_category_name']],
                ['description' => 'Imported category', 'is_active' => true]
            );
            $categoryId = $category->id;
        } elseif (isset($data['item_category_id'])) {
            $categoryId = $data['item_category_id'];
        }

        // Prepare template data
        $templateData = [
            'name' => $data['name'],
            'description' => isset($data['description']) ? $data['description'] : null,
            'is_template' => true,
            'is_active' => isset($data['is_active']) ? $data['is_active'] : true,
            'item_category_id' => $categoryId,
            'template_metadata' => isset($data['template_metadata']) ? $data['template_metadata'] : [],
            'created_by' => auth()->id(),
        ];

        // Check if template exists by name and category
        $existingTemplate = ManufacturingRoute::templates()
            ->where('name', $data['name'])
            ->where('item_category_id', $categoryId)
            ->first();

        if ($existingTemplate && ! $updateExisting) {
            // Skip existing templates when update_existing is false
            return ['template' => null, 'created_work_cells' => []];
        }

        // Create or update template
        $template = $existingTemplate ?? new ManufacturingRoute;
        $template->fill($templateData);
        $template->save();

        // Delete existing steps if updating
        if ($existingTemplate && $updateExisting) {
            $template->steps()->delete();
        }

        // Process and create steps
        if (isset($data['steps']) && is_array($data['steps'])) {
            // Sort steps by step_number if available for proper ordering
            $sortedSteps = $data['steps'];
            usort($sortedSteps, function ($a, $b) {
                $aNum = isset($a['step_number']) ? $a['step_number'] : 0;
                $bNum = isset($b['step_number']) ? $b['step_number'] : 0;

                return $aNum <=> $bNum;
            });

            $previousStep = null;
            foreach ($sortedSteps as $index => $stepData) {
                // Handle work cell creation if needed
                $workCellId = null;
                if (isset($stepData['work_cell_name']) && $stepData['work_cell_name']) {
                    $workCell = $this->findOrCreateWorkCell($stepData['work_cell_name']);
                    $workCellId = $workCell->id;
                    if ($workCell->wasRecentlyCreated) {
                        $createdWorkCells[] = $workCell->name;
                    }
                } elseif (isset($stepData['work_cell_id'])) {
                    $workCellId = $stepData['work_cell_id'];
                }

                // Create step with dependency based on previous step
                $newStep = $template->steps()->create([
                    'name' => $stepData['name'] ?? 'Step ' . ($index + 1),
                    'description' => $stepData['description'] ?? null,
                    'step_type' => $stepData['step_type'] ?? 'standard',
                    'work_cell_id' => $workCellId,
                    'setup_time_seconds' => isset($stepData['setup_time_minutes']) ? $stepData['setup_time_minutes'] * 60 : 0,
                    'cycle_time_seconds' => isset($stepData['cycle_time_minutes']) ? $stepData['cycle_time_minutes'] * 60 : 0,
                    'use_workcell_throughput' => $stepData['use_workcell_throughput'] ?? false,
                    'quality_check_mode' => $stepData['quality_check_mode'] ?? 'every_part',
                    'sampling_size' => $stepData['sampling_size'] ?? 0,
                    'form_id' => $stepData['form_id'] ?? null,
                    'depends_on_step_id' => $previousStep ? $previousStep->id : null,
                    'can_start_when_dependency' => $stepData['can_start_when_dependency'] ?? 'completed',
                    'dependency_start_condition' => $stepData['dependency_start_condition'] ?? 'completed',
                    'dependency_minimum_quantity' => $stepData['dependency_minimum_quantity'] ?? null,
                    'dependency_minimum_percentage' => $stepData['dependency_minimum_percentage'] ?? null,
                    'child_order_dependency_type' => $stepData['child_order_dependency_type'] ?? 'none',
                    'child_order_minimum_quantity' => $stepData['child_order_minimum_quantity'] ?? null,
                    'is_template' => true,
                    'status' => 'pending',
                ]);

                $previousStep = $newStep;
            }
        }

        return ['template' => $template, 'created_work_cells' => $createdWorkCells];
    }

    /**
     * Find or create a work cell by name.
     */
    protected function findOrCreateWorkCell(string $name): WorkCell
    {
        return WorkCell::firstOrCreate(
            ['name' => $name],
            [
                'description' => 'Imported work cell - please configure settings',
                'cell_type' => 'internal',
                'has_finite_capacity' => false, // Infinite capacity as default
                'default_production_rate_per_hour' => 60,
                'default_unit_of_measure' => 'UN',
                'default_setup_time_minutes' => 0,
                'max_parallel_executions' => 1,
                'is_active' => true,
            ]
        );
    }

    /**
     * Parse CSV file into array of rows.
     */
    protected function parseCsvFile(UploadedFile $file): array
    {
        $content = file_get_contents($file->getRealPath());
        $lines = explode("\n", $content);
        $headers = str_getcsv(array_shift($lines));

        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }

            $values = str_getcsv($line);
            $row = [];

            foreach ($headers as $index => $header) {
                $row[$header] = isset($values[$index]) ? $values[$index] : '';
            }

            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Map CSV row to template/step data using field mapping.
     */
    protected function mapCsvRow(array $row, array $mapping): ?array
    {
        $data = [];

        foreach ($mapping as $csvField => $templateField) {
            if (empty($templateField) || $templateField === '_ignore') {
                continue;
            }

            $value = isset($row[$csvField]) ? $row[$csvField] : '';

            // Handle boolean fields
            if (in_array($templateField, ['is_active', 'use_workcell_throughput'])) {
                $value = in_array(strtolower($value), ['true', '1', 'yes', 'sim', 's']);
            }

            // Handle numeric fields
            if (in_array($templateField, ['version', 'step_number', 'setup_time_minutes', 'cycle_time_minutes', 'sampling_size', 'form_id', 'depends_on_step_id', 'dependency_minimum_quantity'])) {
                $value = is_numeric($value) ? (int) $value : 0;
            }

            // Handle decimal fields
            if (in_array($templateField, ['dependency_minimum_percentage', 'child_order_minimum_quantity'])) {
                $value = is_numeric($value) ? (float) $value : 0;
            }

            // Handle JSON fields
            if ($templateField === 'template_metadata') {
                if (! empty($value)) {
                    $decoded = json_decode($value, true);
                    $value = $decoded !== null ? $decoded : [];
                } else {
                    $value = [];
                }
            }

            $data[$templateField] = $value;
        }

        // Skip if no template name (for template rows) or no step name (for step rows)
        if (empty($data['template_name']) && empty($data['name'])) {
            return null;
        }

        return $data;
    }
}
