<?php

namespace Tests\Feature\MultiTenancy\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\MultiTenancyTestCase;

/**
 * Phase 7: Storage & Media - Path Isolation Tests.
 *
 * Tests automatic path prefixing and file isolation per tenant
 */
class PathIsolationTest extends MultiTenancyTestCase
{
    /**
     * Use tenancy automatically in setUp().
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test automatic path prefixing for tenant files.
     */
    public function test_automatic_path_prefixing(): void
    {
        // Use the shared tenant from setUp
        // Upload a file
        $file = UploadedFile::fake()->image('test.jpg');
        $path = Storage::disk('public')->putFile('images', $file);

        // Verify file was stored in tenant-specific path
        $this->assertTrue(Storage::disk('public')->exists($path));

        // Check that the actual path includes tenant isolation
        $fullPath = Storage::disk('public')->path($path);
        $this->assertStringContainsString((string) $this->tenant->id, $fullPath);
    }

    /**
     * Test file upload isolation between tenants.
     */
    public function test_file_upload_isolation(): void
    {
        $tenant1 = $this->createAdditionalTenant();
        $tenant2 = $this->createAdditionalTenant();

        // Upload file as tenant 1 with specific content
        $tenant1->run(function () {
            $file = UploadedFile::fake()->image('tenant1.jpg');
            $path = Storage::disk('public')->putFileAs('uploads', $file, 'shared-name.jpg');
            $this->assertTrue(Storage::disk('public')->exists($path));

            // Store marker content to verify isolation
            Storage::disk('public')->put('marker.txt', 'tenant1-content');
        });

        // Upload file with same name as tenant 2
        $tenant2->run(function () {
            $file = UploadedFile::fake()->image('tenant2.jpg');
            $path = Storage::disk('public')->putFileAs('uploads', $file, 'shared-name.jpg');
            $this->assertTrue(Storage::disk('public')->exists($path));

            // Store different marker content
            Storage::disk('public')->put('marker.txt', 'tenant2-content');
        });

        // Verify files are isolated - each tenant has their own marker
        $tenant1->run(function () {
            $this->assertEquals('tenant1-content', Storage::disk('public')->get('marker.txt'));
            $this->assertTrue(Storage::disk('public')->exists('uploads/shared-name.jpg'));
        });

        $tenant2->run(function () {
            $this->assertEquals('tenant2-content', Storage::disk('public')->get('marker.txt'));
            $this->assertTrue(Storage::disk('public')->exists('uploads/shared-name.jpg'));
        });

        // Clean up
        $this->cleanupAdditionalTenant($tenant1);
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test file retrieval with tenant context.
     */
    public function test_file_retrieval_with_tenant_context(): void
    {
        // Use shared tenant
        $content = 'Tenant-specific content';
        Storage::disk('local')->put('test.txt', $content);

        // Verify file is accessible in tenant context
        $this->assertEquals($content, Storage::disk('local')->get('test.txt'));
    }

    /**
     * Test cross-tenant file access prevention.
     */
    public function test_cross_tenant_file_access_prevention(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Create file as main tenant
        Storage::disk('local')->put('secret.txt', 'Tenant 1 secret data');

        // Try to access from tenant 2 - should not exist
        $tenant2->run(function () {
            $this->assertFalse(Storage::disk('local')->exists('secret.txt'));
        });

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test public/private file separation.
     */
    public function test_public_private_file_separation(): void
    {
        // Public file
        $publicFile = UploadedFile::fake()->image('public.jpg');
        $publicPath = Storage::disk('public')->putFile('images', $publicFile);
        $this->assertTrue(Storage::disk('public')->exists($publicPath));

        // Private file (use create for non-image files)
        $privateFile = UploadedFile::fake()->create('private.pdf', 100);
        $privatePath = Storage::disk('local')->putFile('documents', $privateFile);
        $this->assertTrue(Storage::disk('local')->exists($privatePath));

        // Verify they're on different disks
        $this->assertNotEquals(
            Storage::disk('public')->path($publicPath),
            Storage::disk('local')->path($privatePath)
        );
    }
}
