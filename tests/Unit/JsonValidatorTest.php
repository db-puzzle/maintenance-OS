<?php

namespace Tests\Unit;

use App\Services\JsonValidator;
use PHPUnit\Framework\TestCase;

class JsonValidatorTest extends TestCase
{
    public function test_valid_json_passes()
    {
        $json = '{"name": "Test", "items": [1, 2, 3]}';
        $result = JsonValidator::validate($json);

        $this->assertTrue($result['valid']);
        $this->assertEquals(['name' => 'Test', 'items' => [1, 2, 3]], $result['data']);
    }

    public function test_syntax_error_detection()
    {
        // Missing closing quote
        $json = '{"name": "Test, "items": [1, 2, 3]}';
        $result = JsonValidator::validate($json);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('line', $result);
        $this->assertArrayHasKey('column', $result);
        $this->assertEquals(1, $result['line']);
    }

    public function test_trailing_comma_error()
    {
        $json = '{"name": "Test", "items": [1, 2, 3,]}';
        $result = JsonValidator::validate($json);

        $this->assertFalse($result['valid']);
    }

    public function test_multiline_error_detection()
    {
        $json = '{
    "name": "Test",
    "items": [
        1,
        2,
        3
        // Missing comma here
        4
    ]
}';
        $result = JsonValidator::validate($json);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('line', $result);
        // Should detect error around line 7-8
        $this->assertGreaterThan(5, $result['line']);
    }

    public function test_utf8_error_detection()
    {
        // Invalid UTF-8 sequence
        $json = '{"name": "Test' . chr(0xFF) . '"}';
        $result = JsonValidator::validate($json);

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('UTF-8', $result['error']);
    }

    public function test_control_character_detection()
    {
        // Control character in string
        $json = '{"name": "Test' . chr(0x01) . '"}';
        $result = JsonValidator::validate($json);

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('Control character', $result['error']);
    }
}
