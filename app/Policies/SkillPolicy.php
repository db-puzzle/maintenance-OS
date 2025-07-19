<?php

namespace App\Policies;

use App\Models\Skill;
use App\Models\User;

class SkillPolicy
{
    /**
     * Determine whether the user can view any skills.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('skills.viewAny');
    }

    /**
     * Determine whether the user can view the skill.
     */
    public function view(User $user, Skill $skill): bool
    {
        return $user->hasPermissionTo('skills.view');
    }

    /**
     * Determine whether the user can create skills.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('skills.create');
    }

    /**
     * Determine whether the user can update the skill.
     */
    public function update(User $user, Skill $skill): bool
    {
        return $user->hasPermissionTo('skills.update');
    }

    /**
     * Determine whether the user can delete the skill.
     */
    public function delete(User $user, Skill $skill): bool
    {
        return $user->hasPermissionTo('skills.delete');
    }
}