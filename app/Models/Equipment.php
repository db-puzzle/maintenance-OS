<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Equipment extends Model
{
    protected $table = 'equipment';

    protected $fillable = [
        'tag',
        'machine_type_id',
        'description',
        'nickname',
        'manufacturer',
        'manufacturing_year',
        'area_id',
        'photo_path'
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