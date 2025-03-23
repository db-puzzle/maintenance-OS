<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Equipment extends Model
{
    protected $table = 'equipment';

    protected $fillable = [
        'tag',
        'serial_number',
        'machine_type_id',
        'description',
        'manufacturer',
        'manufacturing_year',
        'area_id',
        'sector_id',
        'photo_path'
    ];

    protected $casts = [
        'manufacturing_year' => 'integer',
        'machine_type_id' => 'integer',
        'area_id' => 'integer',
        'sector_id' => 'integer'
    ];

    public function machineType(): BelongsTo
    {
        return $this->belongsTo(MachineType::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }
} 