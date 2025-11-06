<?php

use App\Models\User;
use App\Models\UserInvitation;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\delete;

beforeEach(function () {
    // Create an admin user
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Administrator');
});

it('can delete a pending invitation', function () {
    $invitation = UserInvitation::create([
        'email' => 'test@example.com',
        'invited_by' => $this->admin->id,
    ]);

    actingAs($this->admin)
        ->delete(route('invitations.destroy', $invitation))
        ->assertRedirect()
        ->assertSessionHas('success', 'Convite excluído com sucesso.');

    assertDatabaseMissing('user_invitations', [
        'id' => $invitation->id,
    ]);
});

it('can delete an expired invitation', function () {
    $invitation = UserInvitation::create([
        'email' => 'expired@example.com',
        'invited_by' => $this->admin->id,
        'expires_at' => now()->subDay(), // Expired yesterday
    ]);

    actingAs($this->admin)
        ->delete(route('invitations.destroy', $invitation))
        ->assertRedirect()
        ->assertSessionHas('success', 'Convite excluído com sucesso.');

    assertDatabaseMissing('user_invitations', [
        'id' => $invitation->id,
    ]);
});

it('can delete a revoked invitation', function () {
    $invitation = UserInvitation::create([
        'email' => 'revoked@example.com',
        'invited_by' => $this->admin->id,
    ]);

    $invitation->revoke($this->admin, 'Test revocation');

    actingAs($this->admin)
        ->delete(route('invitations.destroy', $invitation))
        ->assertRedirect()
        ->assertSessionHas('success', 'Convite excluído com sucesso.');

    assertDatabaseMissing('user_invitations', [
        'id' => $invitation->id,
    ]);
});

it('cannot delete an accepted invitation', function () {
    $invitation = UserInvitation::create([
        'email' => 'accepted@example.com',
        'invited_by' => $this->admin->id,
    ]);

    $user = User::factory()->create(['email' => 'accepted@example.com']);
    $invitation->markAsAccepted($user);

    actingAs($this->admin)
        ->delete(route('invitations.destroy', $invitation))
        ->assertRedirect()
        ->assertSessionHas('error', 'Não é possível excluir um convite que já foi aceito.');

    // Invitation should still exist
    assertDatabaseHas('user_invitations', [
        'id' => $invitation->id,
    ]);
});

it('successfully deletes invitations and returns success message', function () {
    $invitation = UserInvitation::create([
        'email' => 'success-test@example.com',
        'invited_by' => $this->admin->id,
    ]);

    actingAs($this->admin)
        ->delete(route('invitations.destroy', $invitation))
        ->assertRedirect()
        ->assertSessionHas('success', 'Convite excluído com sucesso.');

    assertDatabaseMissing('user_invitations', [
        'id' => $invitation->id,
    ]);
});

it('requires authentication to delete invitations', function () {
    $invitation = UserInvitation::create([
        'email' => 'unauth@example.com',
        'invited_by' => $this->admin->id,
    ]);

    delete(route('invitations.destroy', $invitation))
        ->assertRedirect(route('login'));
});

it('respects permissions when deleting invitations', function () {
    $regularUser = User::factory()->create();

    $invitation = UserInvitation::create([
        'email' => 'permission-test@example.com',
        'invited_by' => $this->admin->id,
    ]);

    actingAs($regularUser)
        ->delete(route('invitations.destroy', $invitation))
        ->assertForbidden();
});
