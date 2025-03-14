<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineType extends Model
{
    protected $table = 'machine_types';

    protected $fillable = [
        'name',
        'description',
    ];

    public function machines()
    {
        return $this->hasMany(Machine::class, 'machine_type_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($machineType) {
            if ($machineType->machines()->exists()) {
                throw new \Exception('Não é possível excluir um tipo de máquina que possui máquinas.');
            }
        });
    }
} 