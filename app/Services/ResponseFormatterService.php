<?php

namespace App\Services;

use App\Models\Forms\TaskResponse;
use App\Models\Forms\FormTask;

class ResponseFormatterService
{
    /**
     * Format a task response for display
     */
    public function formatResponse(TaskResponse $response): array
    {
        $task = $response->formTask;
        
        if (!$task) {
            return $this->getEmptyResponse();
        }

        return match ($task->type) {
            FormTask::TYPE_MEASUREMENT => $this->formatMeasurementResponse($response, $task),
            FormTask::TYPE_MULTIPLE_CHOICE => $this->formatMultipleChoiceResponse($response, $task),
            FormTask::TYPE_MULTIPLE_SELECT => $this->formatMultipleSelectResponse($response, $task),
            FormTask::TYPE_QUESTION => $this->formatQuestionResponse($response, $task),
            FormTask::TYPE_PHOTO => $this->formatPhotoResponse($response, $task),
            FormTask::TYPE_FILE_UPLOAD => $this->formatFileUploadResponse($response, $task),
            FormTask::TYPE_CODE_READER => $this->formatCodeReaderResponse($response, $task),
            default => $this->formatGenericResponse($response, $task),
        };
    }

    /**
     * Format measurement response
     */
    private function formatMeasurementResponse(TaskResponse $response, FormTask $task): array
    {
        $config = $task->getMeasurementConfig();
        $value = $response->response['value'] ?? null;
        
        $formatted = [
            'type' => 'measurement',
            'value' => $value,
            'unit' => $config['unit'] ?? '',
            'display_value' => $value ? "{$value} {$config['unit']}" : 'No response',
            'is_within_range' => false,
            'range_info' => null,
            'status' => 'unknown',
        ];

        if ($value !== null && $config) {
            $numericValue = (float) $value;
            $min = $config['min'] ?? null;
            $max = $config['max'] ?? null;
            $target = $config['target'] ?? null;

            if ($min !== null && $max !== null) {
                $isWithinRange = $numericValue >= $min && $numericValue <= $max;
                $formatted['is_within_range'] = $isWithinRange;
                $formatted['status'] = $isWithinRange ? 'success' : 'warning';
                
                $formatted['range_info'] = [
                    'min' => $min,
                    'max' => $max,
                    'target' => $target,
                    'range_text' => $target 
                        ? "Target: {$target} (Range: {$min} - {$max})"
                        : "Range: {$min} - {$max}",
                ];
            }
        }

        return $formatted;
    }

    /**
     * Format multiple choice response
     */
    private function formatMultipleChoiceResponse(TaskResponse $response, FormTask $task): array
    {
        $selectedValue = $response->response['value'] ?? null;
        $options = $task->getOptions();
        
        $selectedOption = collect($options)->firstWhere('value', $selectedValue);
        
        return [
            'type' => 'multiple_choice',
            'value' => $selectedValue,
            'display_value' => $selectedOption['label'] ?? $selectedValue ?? 'No selection',
            'options' => $options,
            'status' => $selectedValue ? 'success' : 'incomplete',
        ];
    }

    /**
     * Format multiple select response
     */
    private function formatMultipleSelectResponse(TaskResponse $response, FormTask $task): array
    {
        $selectedValues = $response->response['values'] ?? [];
        $options = $task->getOptions();
        
        $selectedOptions = collect($options)
            ->whereIn('value', $selectedValues)
            ->pluck('label')
            ->toArray();
        
        return [
            'type' => 'multiple_select',
            'values' => $selectedValues,
            'display_value' => !empty($selectedOptions) 
                ? implode(', ', $selectedOptions)
                : 'No selections',
            'selected_count' => count($selectedValues),
            'options' => $options,
            'status' => !empty($selectedValues) ? 'success' : 'incomplete',
        ];
    }

    /**
     * Format question response
     */
    private function formatQuestionResponse(TaskResponse $response, FormTask $task): array
    {
        $answer = $response->response['answer'] ?? '';
        
        return [
            'type' => 'question',
            'value' => $answer,
            'display_value' => $answer ?: 'No answer provided',
            'word_count' => str_word_count($answer),
            'character_count' => strlen($answer),
            'status' => $answer ? 'success' : 'incomplete',
        ];
    }

    /**
     * Format photo response
     */
    private function formatPhotoResponse(TaskResponse $response, FormTask $task): array
    {
        $attachments = $response->attachments;
        $photoAttachments = $attachments->filter(function ($attachment) {
            return $this->isImageFile($attachment->file_path);
        });
        
        return [
            'type' => 'photo',
            'photos' => $photoAttachments->map(function ($attachment) {
                return [
                    'id' => $attachment->id,
                    'filename' => $attachment->filename,
                    'file_path' => $attachment->file_path,
                    'url' => $this->getAttachmentUrl($attachment),
                    'thumbnail_url' => $this->getThumbnailUrl($attachment),
                    'uploaded_at' => $attachment->created_at,
                    'file_size' => $attachment->file_size ?? null,
                ];
            })->values()->toArray(),
            'photo_count' => $photoAttachments->count(),
            'display_value' => $photoAttachments->count() > 0 
                ? "{$photoAttachments->count()} photo(s) captured"
                : 'No photos captured',
            'status' => $photoAttachments->count() > 0 ? 'success' : 'incomplete',
        ];
    }

    /**
     * Format file upload response
     */
    private function formatFileUploadResponse(TaskResponse $response, FormTask $task): array
    {
        $attachments = $response->attachments;
        
        return [
            'type' => 'file_upload',
            'files' => $attachments->map(function ($attachment) {
                return [
                    'id' => $attachment->id,
                    'filename' => $attachment->filename,
                    'file_path' => $attachment->file_path,
                    'url' => $this->getAttachmentUrl($attachment),
                    'uploaded_at' => $attachment->created_at,
                    'file_size' => $attachment->file_size ?? null,
                    'file_type' => pathinfo($attachment->filename, PATHINFO_EXTENSION),
                ];
            })->values()->toArray(),
            'file_count' => $attachments->count(),
            'display_value' => $attachments->count() > 0 
                ? "{$attachments->count()} file(s) uploaded"
                : 'No files uploaded',
            'status' => $attachments->count() > 0 ? 'success' : 'incomplete',
        ];
    }

    /**
     * Format code reader response
     */
    private function formatCodeReaderResponse(TaskResponse $response, FormTask $task): array
    {
        $code = $response->response['code'] ?? '';
        $type = $task->getCodeReaderType() ?? 'unknown';
        
        return [
            'type' => 'code_reader',
            'value' => $code,
            'code_type' => $type,
            'display_value' => $code ?: 'No code scanned',
            'status' => $code ? 'success' : 'incomplete',
        ];
    }

    /**
     * Format generic response
     */
    private function formatGenericResponse(TaskResponse $response, FormTask $task): array
    {
        $responseData = $response->response ?? [];
        
        return [
            'type' => 'generic',
            'value' => $responseData,
            'display_value' => $this->formatGenericValue($responseData),
            'status' => !empty($responseData) ? 'success' : 'incomplete',
        ];
    }

    /**
     * Get empty response structure
     */
    private function getEmptyResponse(): array
    {
        return [
            'type' => 'unknown',
            'value' => null,
            'display_value' => 'Unknown task type',
            'status' => 'error',
        ];
    }

    /**
     * Format generic value for display
     */
    private function formatGenericValue($value): string
    {
        if (is_array($value)) {
            return json_encode($value, JSON_PRETTY_PRINT);
        }
        
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        
        return (string) $value;
    }

    /**
     * Check if file is an image
     */
    private function isImageFile(string $filePath): bool
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        return in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
    }

    /**
     * Get attachment URL (placeholder)
     */
    private function getAttachmentUrl($attachment): string
    {
        // In a real implementation, this would generate a proper URL
        return "/storage/{$attachment->file_path}";
    }

    /**
     * Get thumbnail URL (placeholder)
     */
    private function getThumbnailUrl($attachment): string
    {
        // In a real implementation, this would generate a thumbnail
        return $this->getAttachmentUrl($attachment);
    }

    /**
     * Get task completion status
     */
    public function getTaskCompletionStatus(TaskResponse $response): string
    {
        if (!$response->is_completed) {
            return 'incomplete';
        }

        $formatted = $this->formatResponse($response);
        return $formatted['status'] ?? 'unknown';
    }

    /**
     * Check if response is within acceptable parameters
     */
    public function isResponseAcceptable(TaskResponse $response): bool
    {
        if (!$response->is_completed) {
            return false;
        }

        $formatted = $this->formatResponse($response);
        
        // For measurements, check if within range
        if ($formatted['type'] === 'measurement') {
            return $formatted['is_within_range'] ?? false;
        }

        // For other types, completed status is acceptable
        return $formatted['status'] === 'success';
    }

    /**
     * Get summary statistics for multiple responses
     */
    public function getResponsesSummary(iterable $responses): array
    {
        $total = 0;
        $completed = 0;
        $acceptable = 0;
        $withIssues = 0;
        
        foreach ($responses as $response) {
            $total++;
            
            if ($response->is_completed) {
                $completed++;
                
                if ($this->isResponseAcceptable($response)) {
                    $acceptable++;
                } else {
                    $withIssues++;
                }
            }
        }

        return [
            'total' => $total,
            'completed' => $completed,
            'acceptable' => $acceptable,
            'with_issues' => $withIssues,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
            'quality_rate' => $completed > 0 ? round(($acceptable / $completed) * 100, 1) : 0,
        ];
    }
}