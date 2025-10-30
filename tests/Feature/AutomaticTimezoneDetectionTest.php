<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutomaticTimezoneDetectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_timezone_can_be_updated_via_api(): void
    {
        $user = User::factory()->create([
            'timezone' => 'UTC',
        ]);

        $response = $this->actingAs($user)
            ->patch('/settings/timezone', [
                'timezone' => 'America/New_York',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'message' => 'Timezone updated successfully',
            'timezone' => 'America/New_York',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'timezone' => 'America/New_York',
        ]);
    }

    public function test_invalid_timezone_is_rejected(): void
    {
        $user = User::factory()->create([
            'timezone' => 'UTC',
        ]);

        $response = $this->actingAs($user)
            ->patch('/settings/timezone', [
                'timezone' => 'Invalid/Timezone',
            ]);

        $response->assertSessionHasErrors(['timezone']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'timezone' => 'UTC', // Should remain unchanged
        ]);
    }

    public function test_unauthenticated_user_cannot_update_timezone(): void
    {
        $response = $this->patch('/settings/timezone', [
            'timezone' => 'America/New_York',
        ]);

        $response->assertRedirect('/login');
    }
}
