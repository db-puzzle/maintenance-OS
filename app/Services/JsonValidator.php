<?php

namespace App\Services;

class JsonValidator
{
    /**
     * Validate JSON and return detailed error information.
     *
     * @return array{valid: bool, data?: mixed, error?: string, line?: int, column?: int, position?: int}
     */
    public static function validate(string $json): array
    {
        // First, try to decode the JSON
        $data = json_decode($json, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            return [
                'valid' => true,
                'data' => $data,
            ];
        }

        // Get the basic error message
        $error = json_last_error_msg();

        // Try to find the exact position of the error
        $errorDetails = self::findJsonErrorPosition($json, json_last_error());

        return array_merge([
            'valid' => false,
            'error' => $error,
        ], $errorDetails);
    }

    /**
     * Find the approximate position of JSON error.
     *
     * @return array{line?: int, column?: int, position?: int, context?: string}
     */
    private static function findJsonErrorPosition(string $json, int $errorCode): array
    {
        $result = [];

        // For syntax errors, state mismatch, and control char errors (which often indicate unclosed strings)
        if ($errorCode === JSON_ERROR_SYNTAX || $errorCode === JSON_ERROR_STATE_MISMATCH || $errorCode === JSON_ERROR_CTRL_CHAR) {
            // Try progressive parsing to find where it breaks
            $position = self::findSyntaxErrorPosition($json);
            if ($position !== null) {
                $result['position'] = $position;

                // Calculate line and column
                $lines = explode("\n", substr($json, 0, $position));
                $result['line'] = count($lines);
                $result['column'] = strlen(end($lines)) + 1;

                // Get context around the error
                $contextStart = max(0, $position - 40);
                $contextEnd = min(strlen($json), $position + 40);
                $context = substr($json, $contextStart, $contextEnd - $contextStart);

                // Highlight the error position
                $errorOffset = $position - $contextStart;
                $result['context'] = substr($context, 0, $errorOffset) . '→' . substr($context, $errorOffset);
            }
        }

        // For UTF-8 errors, find the invalid character
        if ($errorCode === JSON_ERROR_UTF8) {
            $position = self::findUtf8ErrorPosition($json);
            if ($position !== null) {
                $result['position'] = $position;

                // Calculate line and column
                $lines = explode("\n", substr($json, 0, $position));
                $result['line'] = count($lines);
                $result['column'] = strlen(end($lines)) + 1;

                // Show the invalid byte
                $invalidByte = ord($json[$position]);
                $result['context'] = sprintf('Invalid UTF-8 byte: 0x%02X at position %d', $invalidByte, $position);
            }
        }

        // Note: Control character errors are often misreported syntax errors,
        // so they're handled together with syntax errors above

        return $result;
    }

    /**
     * Find syntax error position by progressive parsing.
     */
    private static function findSyntaxErrorPosition(string $json): ?int
    {
        $length = strlen($json);
        $lastValidPosition = 0;

        // First, try a simpler approach for common errors
        $simplePosition = self::findSimpleErrorPosition($json);
        if ($simplePosition !== null) {
            return $simplePosition;
        }

        // Binary search for the error position
        $low = 0;
        $high = $length;

        while ($low < $high) {
            $mid = (int) (($low + $high) / 2);
            $testJson = substr($json, 0, $mid);

            // Try to parse it
            json_decode($testJson);

            if (json_last_error() === JSON_ERROR_NONE ||
                (json_last_error() === JSON_ERROR_SYNTAX || json_last_error() === JSON_ERROR_STATE_MISMATCH)
                && self::isIncompleteJson($testJson)) {
                // This portion is valid or just incomplete
                $lastValidPosition = $mid;
                $low = $mid + 1;
            } else {
                // Error is before this position
                $high = $mid;
            }
        }

        return $lastValidPosition;
    }

    /**
     * Find simple error positions for common cases.
     */
    private static function findSimpleErrorPosition(string $json): ?int
    {
        $inString = false;
        $escapeNext = false;
        $stack = [];

        for ($i = 0; $i < strlen($json); $i++) {
            $char = $json[$i];

            // Handle escape sequences
            if ($escapeNext) {
                $escapeNext = false;
                continue;
            }

            if ($char === '\\' && $inString) {
                $escapeNext = true;
                continue;
            }

            // Handle strings
            if ($char === '"' && ! $escapeNext) {
                if (! $inString) {
                    // Check if we're in a valid position for a string start
                    if (! empty($stack)) {
                        $last = end($stack);
                        // After '{' or '[' we expect a key or value
                        // After ':' we expect a value
                        // After ',' we expect a key (in object) or value (in array)
                        if ($i > 0) {
                            $prevNonWhitespace = self::getPreviousNonWhitespace($json, $i - 1);
                            if ($prevNonWhitespace !== null &&
                                ! in_array($json[$prevNonWhitespace], ['{', '[', ':', ','])) {
                                return $i; // Unexpected string
                            }
                        }
                    }
                }
                $inString = ! $inString;
                continue;
            }

            // Skip content inside strings
            if ($inString) {
                continue;
            }

            // Handle structural characters
            switch ($char) {
                case '{':
                case '[':
                    $stack[] = $char;
                    break;

                case '}':
                    if (empty($stack) || array_pop($stack) !== '{') {
                        return $i; // Unmatched closing brace
                    }
                    break;

                case ']':
                    if (empty($stack) || array_pop($stack) !== '[') {
                        return $i; // Unmatched closing bracket
                    }
                    break;

                case ':':
                    // Colons should only appear in objects after a key
                    if (empty($stack) || end($stack) !== '{') {
                        return $i; // Colon outside object
                    }
                    break;

                case ',':
                    // Commas should not appear at the beginning or after opening brackets/braces
                    if ($i > 0) {
                        $prevNonWhitespace = self::getPreviousNonWhitespace($json, $i - 1);
                        if ($prevNonWhitespace !== null &&
                            in_array($json[$prevNonWhitespace], ['{', '[', ','])) {
                            return $i; // Double comma or comma after opening
                        }
                    }
                    break;
            }
        }

        // If we're still in a string, find where it started
        if ($inString) {
            // Find the last unescaped quote
            for ($i = strlen($json) - 1; $i >= 0; $i--) {
                if ($json[$i] === '"' && ($i === 0 || $json[$i - 1] !== '\\')) {
                    return $i; // Unclosed string
                }
            }
        }

        // If stack is not empty, we have unclosed brackets/braces
        if (! empty($stack)) {
            // Find the position of the last unclosed bracket/brace
            $searchFor = array_pop($stack);
            for ($i = strlen($json) - 1; $i >= 0; $i--) {
                if ($json[$i] === $searchFor) {
                    return $i;
                }
            }
        }

        return null;
    }

    /**
     * Get the position of the previous non-whitespace character.
     */
    private static function getPreviousNonWhitespace(string $json, int $start): ?int
    {
        for ($i = $start; $i >= 0; $i--) {
            if (! ctype_space($json[$i])) {
                return $i;
            }
        }

        return null;
    }

    /**
     * Check if JSON is just incomplete (not actually invalid).
     */
    private static function isIncompleteJson(string $json): bool
    {
        $trimmed = rtrim($json);
        if (empty($trimmed)) {
            return true;
        }

        // Count opening and closing brackets/braces
        $openBraces = substr_count($trimmed, '{');
        $closeBraces = substr_count($trimmed, '}');
        $openBrackets = substr_count($trimmed, '[');
        $closeBrackets = substr_count($trimmed, ']');

        // If we have more opens than closes, it might just be incomplete
        if ($openBraces > $closeBraces || $openBrackets > $closeBrackets) {
            return true;
        }

        // Check if it ends with a comma or colon (incomplete)
        $lastChar = substr($trimmed, -1);
        if (in_array($lastChar, [',', ':'])) {
            return true;
        }

        // Check if we're in the middle of a string
        $quoteCount = 0;
        $escaped = false;
        for ($i = 0; $i < strlen($trimmed); $i++) {
            if (! $escaped && $trimmed[$i] === '"') {
                $quoteCount++;
            }
            $escaped = ! $escaped && $trimmed[$i] === '\\';
        }

        return $quoteCount % 2 !== 0;
    }

    /**
     * Find UTF-8 error position.
     */
    private static function findUtf8ErrorPosition(string $json): ?int
    {
        $length = strlen($json);
        for ($i = 0; $i < $length; $i++) {
            $byte = ord($json[$i]);

            // Single byte character (0xxxxxxx)
            if ($byte <= 0x7F) {
                continue;
            }

            // Invalid UTF-8 start byte
            if ($byte < 0xC0) {
                return $i;
            }

            // Determine number of bytes in this character
            if ($byte <= 0xDF) {
                $bytes = 2;
            } elseif ($byte <= 0xEF) {
                $bytes = 3;
            } elseif ($byte <= 0xF7) {
                $bytes = 4;
            } else {
                return $i; // Invalid UTF-8
            }

            // Check if we have enough bytes
            if ($i + $bytes > $length) {
                return $i;
            }

            // Check continuation bytes
            for ($j = 1; $j < $bytes; $j++) {
                if ($i + $j >= $length) {
                    return $i;
                }
                $contByte = ord($json[$i + $j]);
                if ($contByte < 0x80 || $contByte > 0xBF) {
                    return $i + $j;
                }
            }

            $i += $bytes - 1;
        }

        return null;
    }

    /**
     * Find control character position.
     */
    private static function findControlCharPosition(string $json): ?int
    {
        $length = strlen($json);
        $inString = false;
        $escaped = false;

        for ($i = 0; $i < $length; $i++) {
            $char = $json[$i];
            $ord = ord($char);

            // Track if we're inside a string
            if (! $escaped && $char === '"') {
                $inString = ! $inString;
            }

            // Check for control characters (0x00-0x1F) except for allowed ones
            if ($inString && ! $escaped && $ord < 0x20 && ! in_array($ord, [0x09, 0x0A, 0x0D])) {
                return $i;
            }

            $escaped = ! $escaped && $char === '\\';
        }

        return null;
    }
}
