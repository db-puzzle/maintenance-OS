<?php

namespace Tests\Feature\Models;

use App\Models\AssetHierarchy\Area;
use App\Models\AssetHierarchy\Asset;
use App\Models\AssetHierarchy\Plant;
use App\Models\AssetHierarchy\Sector;
use App\Models\Maintenance\Routine;
use App\Models\PermissionAuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssetIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create and authenticate a user for all tests
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    /**
     * Test asset has many routines relationship
     */
    public function test_asset_has_many_routines()
    {
        $asset = Asset::factory()->create();
        $routines = Routine::factory()->count(3)->create(['asset_id' => $asset->id]);

        // Reload asset with eager loaded routines and their forms
        $asset->load('routines.form');
        
        $this->assertCount(3, $asset->routines);
        $this->assertTrue($asset->routines->contains($routines->first()));
        
        // Verify each routine has its associated form
        foreach ($asset->routines as $routine) {
            $this->assertNotNull($routine->form);
        }
        
        // Verify audit logs were created for the plant
        $plantLog = PermissionAuditLog::where('user_id', $this->user->id)
            ->where('event_type', 'permissions.generated')
            ->where('auditable_type', 'App\Models\AssetHierarchy\Plant')
            ->where('auditable_id', $asset->plant_id)
            ->first();
            
        $this->assertNotNull($plantLog);
        $this->assertEquals($this->user->id, $plantLog->user_id);
    }

    /**
     * Test asset hierarchy validation
     */
    public function test_asset_hierarchy_validation()
    {
        $plant = Plant::factory()->create();
        $area = Area::factory()->create(['plant_id' => $plant->id]);
        $sector = Sector::factory()->create(['area_id' => $area->id]);
        
        // Test valid hierarchy
        $asset = Asset::factory()->create([
            'plant_id' => $plant->id,
            'area_id' => $area->id,
            'sector_id' => $sector->id,
        ]);
        
        $this->assertEquals($plant->id, $asset->plant_id);
        $this->assertEquals($area->id, $asset->area_id);
        $this->assertEquals($sector->id, $asset->sector_id);
        
        // Verify relationships
        $this->assertTrue($asset->plant->is($plant));
        $this->assertTrue($asset->area->is($area));
        $this->assertTrue($asset->sector->is($sector));
        
        // Verify audit logs for hierarchy creation
        $logs = PermissionAuditLog::where('user_id', $this->user->id)
            ->where('event_type', 'permissions.generated')
            ->whereIn('auditable_type', [
                'App\Models\AssetHierarchy\Plant',
                'App\Models\AssetHierarchy\Area',
                'App\Models\AssetHierarchy\Sector'
            ])
            ->get();
            
        $this->assertGreaterThanOrEqual(3, $logs->count());
    }

    /**
     * Test asset sector area validation
     */
    public function test_asset_sector_area_validation()
    {
        $plant = Plant::factory()->create();
        $area1 = Area::factory()->create(['plant_id' => $plant->id]);
        $area2 = Area::factory()->create(['plant_id' => $plant->id]);
        $sector = Sector::factory()->create(['area_id' => $area1->id]);
        
        // Create asset with matching area and sector
        $asset = Asset::factory()->create([
            'plant_id' => $plant->id,
            'area_id' => $area1->id,
            'sector_id' => $sector->id,
        ]);
        
        $this->assertEquals($area1->id, $asset->area_id);
        $this->assertEquals($sector->id, $asset->sector_id);
        
        // Verify the sector belongs to the correct area
        $this->assertEquals($area1->id, $asset->sector->area_id);
    }

    /**
     * Test creating asset with routines
     */
    public function test_creating_asset_with_routines()
    {
        $asset = Asset::factory()->create();
        
        // Create multiple routines for the asset
        $routine1 = Routine::factory()->daily()->create(['asset_id' => $asset->id]);
        $routine2 = Routine::factory()->weekly()->create(['asset_id' => $asset->id]);
        $routine3 = Routine::factory()->monthly()->create(['asset_id' => $asset->id]);
        
        // Reload asset with eager loaded relationships
        $asset->load('routines.form');
        
        $this->assertCount(3, $asset->routines);
        
        // Verify each routine has correct trigger hours
        $triggerHours = $asset->routines->pluck('trigger_hours')->sort()->values();
        $this->assertEquals([24, 168, 720], $triggerHours->toArray());
        
        // Verify each routine has an associated form
        foreach ($asset->routines as $routine) {
            $this->assertNotNull($routine->form);
            $this->assertStringContainsString($routine->name, $routine->form->name);
        }
    }
    
    /**
     * Test that different users creating assets generate separate audit logs
     */
    public function test_different_users_creating_assets_generate_separate_audit_logs()
    {
        // Create second user
        $user2 = User::factory()->create();
        
        // First user creates an asset
        $this->actingAs($this->user);
        $asset1 = Asset::factory()->create();
        
        // Second user creates an asset
        $this->actingAs($user2);
        $asset2 = Asset::factory()->create();
        
        // Get audit logs for both users
        $user1Logs = PermissionAuditLog::where('user_id', $this->user->id)
            ->where('event_type', 'permissions.generated')
            ->get();
            
        $user2Logs = PermissionAuditLog::where('user_id', $user2->id)
            ->where('event_type', 'permissions.generated')
            ->get();
            
        // Verify both users have audit logs
        $this->assertNotEmpty($user1Logs);
        $this->assertNotEmpty($user2Logs);
        
        // Verify logs are associated with correct assets' plants
        $this->assertTrue($user1Logs->contains('auditable_id', $asset1->plant_id));
        $this->assertTrue($user2Logs->contains('auditable_id', $asset2->plant_id));
    }
} 