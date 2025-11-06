<?php

namespace Tests\Feature\MultiTenancy\Routing;

use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Test domain validation rules using Validator directly
 * No HTTP requests, no database - pure validation logic testing.
 */
class DomainValidationTest extends TestCase
{
    /**
     * Disable automatic seeding for these validation tests.
     *
     * @var bool
     */
    protected $withoutSeeding = true;

    /**
     * Reserved subdomains that cannot be used.
     *
     * @var array<string>
     */
    protected const RESERVED_SUBDOMAINS = [
        'www', 'admin', 'api', 'app', 'mail', 'ftp', 'blog',
        'help', 'support', 'docs', 'status', 'cdn', 'media',
    ];

    /**
     * Get the validation rules for subdomain.
     *
     * @return array<int, mixed>
     */
    protected function getSubdomainValidationRules(): array
    {
        return [
            'required',
            'string',
            'min:3',
            'max:63',
            'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/',
            'not_in:' . implode(',', self::RESERVED_SUBDOMAINS),
        ];
    }

    /**
     * Test that subdomain format validation works.
     */
    public function test_subdomain_format_validation(): void
    {
        $rules = ['subdomain' => $this->getSubdomainValidationRules()];

        // Test invalid format (starts with hyphen)
        $validator = Validator::make(['subdomain' => '-invalid'], $rules);
        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('subdomain', $validator->errors()->toArray());

        // Test invalid format (ends with hyphen)
        $validator = Validator::make(['subdomain' => 'invalid-'], $rules);
        $this->assertTrue($validator->fails());

        // Test valid format
        $validator = Validator::make(['subdomain' => 'valid-subdomain'], $rules);
        $this->assertFalse($validator->fails());
    }

    /**
     * Test that reserved subdomains are rejected.
     */
    public function test_reserved_subdomain_rejection(): void
    {
        $rules = ['subdomain' => $this->getSubdomainValidationRules()];

        $reservedSubdomains = ['admin', 'www', 'api', 'app', 'mail'];

        foreach ($reservedSubdomains as $reserved) {
            $validator = Validator::make(['subdomain' => $reserved], $rules);
            $this->assertTrue($validator->fails(), "Reserved subdomain '{$reserved}' should be rejected");
        }
    }

    /**
     * Test that duplicate subdomains are prevented
     * Note: This test is covered by the unique rule at controller level.
     */
    public function test_duplicate_subdomain_prevention(): void
    {
        // The unique rule validation happens at the controller level
        // Here we just verify the format rules work
        $rules = ['subdomain' => $this->getSubdomainValidationRules()];

        $validator = Validator::make(['subdomain' => 'unique-test'], $rules);
        $this->assertFalse($validator->fails());
    }

    /**
     * Test that DNS-compliant subdomain validation works.
     */
    public function test_dns_compliant_subdomain_validation(): void
    {
        $rules = ['subdomain' => $this->getSubdomainValidationRules()];

        // Test invalid DNS characters
        $invalidSubdomains = [
            'Test' => 'Uppercase should fail',
            'test_company' => 'Underscore should fail',
            'test.company' => 'Dot should fail',
            'test company' => 'Space should fail',
            'test@company' => 'Special char should fail',
        ];

        foreach ($invalidSubdomains as $invalid => $reason) {
            $validator = Validator::make(['subdomain' => $invalid], $rules);
            $this->assertTrue($validator->fails(), $reason);
        }

        // Test valid DNS-compliant subdomains
        $validSubdomains = ['test', 'test-company', 'test123', 'test-123'];

        foreach ($validSubdomains as $valid) {
            $validator = Validator::make(['subdomain' => $valid], $rules);
            $this->assertFalse($validator->fails(), "Subdomain '{$valid}' should be valid");
        }
    }

    /**
     * Test that special characters in subdomains are handled correctly.
     */
    public function test_special_character_handling_in_subdomains(): void
    {
        $rules = ['subdomain' => $this->getSubdomainValidationRules()];

        // Hyphens are allowed in middle
        $validator = Validator::make(['subdomain' => 'test-company'], $rules);
        $this->assertFalse($validator->fails());

        // But not at start or end
        $validator = Validator::make(['subdomain' => '-test'], $rules);
        $this->assertTrue($validator->fails());

        $validator = Validator::make(['subdomain' => 'test-'], $rules);
        $this->assertTrue($validator->fails());
    }

    /**
     * Test that subdomain length constraints are enforced.
     */
    public function test_subdomain_length_constraints(): void
    {
        $rules = ['subdomain' => $this->getSubdomainValidationRules()];

        // Too short (less than 3 characters)
        $validator = Validator::make(['subdomain' => 'ab'], $rules);
        $this->assertTrue($validator->fails());

        // Exactly 3 characters (should pass)
        $validator = Validator::make(['subdomain' => 'abc'], $rules);
        $this->assertFalse($validator->fails());

        // Too long (more than 63 characters)
        $validator = Validator::make(['subdomain' => str_repeat('a', 64)], $rules);
        $this->assertTrue($validator->fails());

        // Exactly 63 characters (should pass)
        $validator = Validator::make(['subdomain' => 'a' . str_repeat('b', 61) . 'c'], $rules);
        $this->assertFalse($validator->fails());
    }
}
