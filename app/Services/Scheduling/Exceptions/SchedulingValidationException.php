<?php

namespace App\Services\Scheduling\Exceptions;

/**
 * Exception for scheduling validation errors.
 */
class SchedulingValidationException extends \Exception
{
    protected array $validationErrors;

    public function __construct(string $message, array $errors = [])
    {
        parent::__construct($message);
        $this->validationErrors = $errors;
    }

    public function getValidationErrors(): array
    {
        return $this->validationErrors;
    }
}
