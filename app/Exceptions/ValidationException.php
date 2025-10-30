<?php

namespace App\Exceptions;

use Exception;

class ValidationException extends Exception
{
    protected $statusCode = 422;

    /**
     * Create a new validation exception instance.
     *
     * @param string $message
     * @param int $code
     * @param \Throwable|null $previous
     */
    public function __construct($message = 'The given data was invalid.', $code = 0, $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the HTTP status code.
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * Report the exception.
     *
     * @return bool|null
     */
    public function report()
    {
        return false;
    }

    /**
     * Render the exception into an HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function render($request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $this->getMessage(),
                'errors' => ['general' => [$this->getMessage()]],
            ], $this->statusCode);
        }

        return back()
            ->withInput()
            ->withErrors(['general' => $this->getMessage()]);
    }
}
