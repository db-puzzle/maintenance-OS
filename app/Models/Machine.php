<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Machine extends Model
{
    protected $fillable = [
        'tag',
        'machine_type_id',
        'description',
        'nickname',
        'manufacturer',
        'manufacturing_year',
        'area_id'
    ];

    public function machineType(): BelongsTo
    {
        return $this->belongsTo(MachineType::class, 'machine_type_id')->withDefault();
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
} 