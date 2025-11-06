<?php

namespace Tests\Feature\MultiTenancy\Storage;

use Illuminate\Support\Facades\Storage;
use Tests\MultiTenancyTestCase;

/**
 * Phase 7: Storage & Media - File Operations Tests.
 *
 * Tests various file operations with tenant context
 */
class FileOperationsTest extends MultiTenancyTestCase
{
    /**
     * Use tenancy automatically in setUp().
     *
     * @var bool
     */
    protected $tenancy = true;

    /**
     * Test file exists checks tenant scope.
     */
    public function test_file_exists_checks_tenant_scope(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Create file in main tenant
        Storage::disk('local')->put('test.txt', 'Tenant 1 content');
        $this->assertTrue(Storage::disk('local')->exists('test.txt'));

        // Check doesn't exist in tenant 2
        $tenant2->run(function () {
            $this->assertFalse(Storage::disk('local')->exists('test.txt'));
        });

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test file copy within tenant.
     */
    public function test_file_copy_within_tenant(): void
    {
        // Create source file
        Storage::disk('local')->put('source.txt', 'Content to copy');

        // Copy file
        Storage::disk('local')->copy('source.txt', 'destination.txt');

        // Verify both exist
        $this->assertTrue(Storage::disk('local')->exists('source.txt'));
        $this->assertTrue(Storage::disk('local')->exists('destination.txt'));

        // Verify content is same
        $this->assertEquals(
            Storage::disk('local')->get('source.txt'),
            Storage::disk('local')->get('destination.txt')
        );
    }

    /**
     * Test file move respects boundaries.
     */
    public function test_file_move_respects_boundaries(): void
    {
        // Create file
        Storage::disk('local')->put('old-location.txt', 'Content to move');

        // Move file
        Storage::disk('local')->move('old-location.txt', 'new-location.txt');

        // Verify moved
        $this->assertFalse(Storage::disk('local')->exists('old-location.txt'));
        $this->assertTrue(Storage::disk('local')->exists('new-location.txt'));
    }

    /**
     * Test directory listing tenant scoped.
     */
    public function test_directory_listing_tenant_scoped(): void
    {
        $tenant2 = $this->createAdditionalTenant();

        // Create files in main tenant
        Storage::disk('local')->put('folder/file1.txt', 'Content 1');
        Storage::disk('local')->put('folder/file2.txt', 'Content 2');

        $files = Storage::disk('local')->files('folder');
        $this->assertCount(2, $files);

        // Tenant 2 shouldn't see those files
        $tenant2->run(function () {
            $files = Storage::disk('local')->allFiles('folder');
            $this->assertCount(0, $files);
        });

        // Clean up
        $this->cleanupAdditionalTenant($tenant2);
    }

    /**
     * Test file deletion in tenant context.
     */
    public function test_file_deletion_in_tenant_context(): void
    {
        // Create files
        Storage::disk('local')->put('to-delete.txt', 'Will be deleted');
        Storage::disk('local')->put('to-keep.txt', 'Will be kept');

        $this->assertTrue(Storage::disk('local')->exists('to-delete.txt'));

        // Delete one file
        Storage::disk('local')->delete('to-delete.txt');

        // Verify deletion
        $this->assertFalse(Storage::disk('local')->exists('to-delete.txt'));
        $this->assertTrue(Storage::disk('local')->exists('to-keep.txt'));
    }

    /**
     * Test directory deletion in tenant context.
     */
    public function test_directory_deletion_in_tenant_context(): void
    {
        // Create directory with files
        Storage::disk('local')->put('to-remove/file1.txt', 'Content 1');
        Storage::disk('local')->put('to-remove/file2.txt', 'Content 2');
        Storage::disk('local')->put('to-remove/subfolder/file3.txt', 'Content 3');

        $this->assertTrue(Storage::disk('local')->exists('to-remove/file1.txt'));

        // Delete directory
        Storage::disk('local')->deleteDirectory('to-remove');

        // Verify deletion
        $this->assertFalse(Storage::disk('local')->exists('to-remove/file1.txt'));
        $this->assertFalse(Storage::disk('local')->exists('to-remove'));
    }
}
