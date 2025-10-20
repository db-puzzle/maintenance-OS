# Time Parameter Standardization Plan for Work Cells and Manufacturing Steps

## Executive Summary

This document outlines a comprehensive plan to standardize time management across work cells and manufacturing steps in the production scheduler system. The goal is to create a consistent, flexible system that uses seconds as the base unit internally while providing intelligent UI display and input options.

## Current State Analysis

### Database Structure

#### Work Cells (`work_cells` table)
- **default_production_rate_per_hour** (decimal): Units produced per hour
- **default_setup_time_minutes** (integer): Setup time in minutes
- **default_unit_of_measure** (string): Unit of measure for production

#### Work Cell Item Rates (`work_cell_item_rates` table)
- **setup_time_minutes** (integer): Item-specific setup time
- **production_rate_per_hour** (decimal): Item-specific production rate
- **unit_of_measure** (string): Item-specific unit of measure

#### Manufacturing Steps (`manufacturing_steps` table)
- **setup_time_minutes** (integer): Step setup time
- **cycle_time_minutes** (integer): Time per unit (cycle time)
- **use_workcell_throughput** (boolean): Flag to use work cell rates instead

**Note**: Since we'll be modifying the original migrations directly (as the system will run `migrate:fresh`), we'll change these column names to their standardized versions.

### Current Issues

1. **Inconsistent Time Units**: Mix of minutes and hours across different fields
2. **Dual Paradigm**: Some fields use throughput (units/hour), others use cycle time (minutes/unit)
3. **No User Preference Storage**: UI cannot remember user's preferred display format
4. **Limited Flexibility**: Hard-coded time scales in UI components
5. **Calculation Complexity**: Business logic has to handle multiple unit conversions

## Proposed Solution

### Core Principles

1. **Base Unit: Seconds**
   - All time values stored in database as seconds
   - All calculations performed in seconds
   - Consistent precision and no fractional minute issues

2. **Dual Paradigm Support**
   - System stores cycle time (seconds per unit) as base
   - UI can display/accept either cycle time or throughput
   - Automatic conversion between the two

3. **Intelligent UI Display**
   - Automatic scale selection (seconds, minutes, hours)
   - User preference storage per work cell
   - Context-aware formatting

### Database Schema Changes

#### 1. Update Existing Migration Files

Since we will run `migrate:fresh`, we'll modify the original migration files directly:

##### Update `2025_01_10_000006_create_work_cells_table.php`

```php
// Replace lines 20-25 with:
// Capacity
$table->boolean('has_finite_capacity')->default(true);
$table->integer('default_setup_time_seconds')->default(0);
$table->decimal('default_cycle_time_seconds', 10, 3)->nullable();
$table->string('default_unit_of_measure_code', 20)->default('PC');
$table->foreign('default_unit_of_measure_code')->references('code')->on('units_of_measure');
$table->integer('max_parallel_executions')->default(1);

// Add after line 37 (before is_active):
// Time display preferences
$table->enum('time_display_preference', ['cycle_time', 'throughput'])->default('cycle_time');
$table->enum('time_scale_preference', ['seconds', 'minutes', 'hours', 'auto'])->default('auto');
```

##### Update `2025_01_10_000007_create_work_cell_item_rates_table.php`

```php
// Replace lines 18-20 with:
$table->integer('setup_time_seconds')->default(0);
$table->decimal('cycle_time_seconds', 10, 3);
$table->string('unit_of_measure_code', 20);
$table->foreign('unit_of_measure_code')->references('code')->on('units_of_measure');
```

##### Update `2025_01_10_000011_create_manufacturing_steps_table.php`

```php
// Replace lines 35-36 with:
$table->integer('setup_time_seconds')->default(0);
$table->decimal('cycle_time_seconds', 10, 3)->nullable();
```

#### 2. New Migration: User Time Preferences Table

Create a new migration file `2025_01_17_000001_create_user_time_preferences_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_time_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('entity_type', ['work_cell', 'global']);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->enum('display_mode', ['cycle_time', 'throughput'])->default('cycle_time');
            $table->enum('time_scale', ['seconds', 'minutes', 'hours', 'auto'])->default('auto');
            $table->timestamps();
            
            $table->unique(['user_id', 'entity_type', 'entity_id']);
            $table->index(['entity_type', 'entity_id']);
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('user_time_preferences');
    }
};
```

### Model Updates

#### WorkCell Model

```php
class WorkCell extends Model
{
    protected $casts = [
        'default_setup_time_seconds' => 'integer',
        'default_cycle_time_seconds' => 'decimal:3',
        'time_display_preference' => 'string',
        'time_scale_preference' => 'string',
    ];

    // NOTE: Since we're modifying the original migrations, we don't need backward
    // compatibility accessors. The database will use the new column names from the start.

    // Helper methods
    public function formatSetupTime(string $scale = 'auto'): array
    {
        return TimeFormatter::formatDuration($this->default_setup_time_seconds, $scale);
    }

    public function formatProductionRate(string $mode = 'cycle_time', string $scale = 'auto'): array
    {
        if ($mode === 'throughput') {
            return TimeFormatter::formatThroughput($this->default_cycle_time_seconds, $scale);
        }
        return TimeFormatter::formatCycleTime($this->default_cycle_time_seconds, $scale);
    }
}
```

### Service Layer

#### TimeFormatter Service

```php
namespace App\Services\Production;

class TimeFormatter
{
    public static function formatDuration(int $seconds, string $scale = 'auto'): array
    {
        if ($scale === 'auto') {
            $scale = self::detectBestScale($seconds);
        }

        return match($scale) {
            'hours' => [
                'value' => round($seconds / 3600, 2),
                'unit' => 'hours',
                'display' => round($seconds / 3600, 2) . ' hrs'
            ],
            'minutes' => [
                'value' => round($seconds / 60, 1),
                'unit' => 'minutes',
                'display' => round($seconds / 60, 1) . ' min'
            ],
            default => [
                'value' => $seconds,
                'unit' => 'seconds',
                'display' => $seconds . ' sec'
            ],
        };
    }

    public static function formatCycleTime(float $secondsPerUnit, string $scale = 'auto'): array
    {
        if ($scale === 'auto') {
            $scale = self::detectBestScale($secondsPerUnit);
        }

        return match($scale) {
            'hours' => [
                'value' => round($secondsPerUnit / 3600, 3),
                'unit' => 'hours/unit',
                'display' => round($secondsPerUnit / 3600, 3) . ' hrs/unit'
            ],
            'minutes' => [
                'value' => round($secondsPerUnit / 60, 2),
                'unit' => 'minutes/unit',
                'display' => round($secondsPerUnit / 60, 2) . ' min/unit'
            ],
            default => [
                'value' => round($secondsPerUnit, 1),
                'unit' => 'seconds/unit',
                'display' => round($secondsPerUnit, 1) . ' sec/unit'
            ],
        };
    }

    public static function formatThroughput(float $secondsPerUnit, string $scale = 'auto'): array
    {
        if ($secondsPerUnit <= 0) {
            return ['value' => 0, 'unit' => 'units/hour', 'display' => '0 units/hr'];
        }

        $unitsPerSecond = 1 / $secondsPerUnit;
        
        if ($scale === 'auto') {
            $scale = self::detectBestThroughputScale($unitsPerSecond);
        }

        return match($scale) {
            'hours' => [
                'value' => round($unitsPerSecond * 3600, 2),
                'unit' => 'units/hour',
                'display' => round($unitsPerSecond * 3600, 2) . ' units/hr'
            ],
            'minutes' => [
                'value' => round($unitsPerSecond * 60, 2),
                'unit' => 'units/minute',
                'display' => round($unitsPerSecond * 60, 2) . ' units/min'
            ],
            default => [
                'value' => round($unitsPerSecond, 3),
                'unit' => 'units/second',
                'display' => round($unitsPerSecond, 3) . ' units/sec'
            ],
        };
    }

    private static function detectBestScale(float $seconds): string
    {
        if ($seconds >= 3600) return 'hours';
        if ($seconds >= 60) return 'minutes';
        return 'seconds';
    }

    private static function detectBestThroughputScale(float $unitsPerSecond): string
    {
        if ($unitsPerSecond <= 0.017) return 'hours'; // Less than 1 unit/minute
        if ($unitsPerSecond <= 1) return 'minutes';
        return 'seconds';
    }
}
```

#### TimePreferenceService

```php
namespace App\Services\Production;

class TimePreferenceService
{
    public function getUserPreference(User $user, string $entityType, ?int $entityId = null): array
    {
        $preference = UserTimePreference::where('user_id', $user->id)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->first();

        if (!$preference && $entityType !== 'global') {
            // Fall back to global preference
            $preference = UserTimePreference::where('user_id', $user->id)
                ->where('entity_type', 'global')
                ->whereNull('entity_id')
                ->first();
        }

        return [
            'display_mode' => $preference?->display_mode ?? 'cycle_time',
            'time_scale' => $preference?->time_scale ?? 'auto',
        ];
    }

    public function saveUserPreference(
        User $user, 
        string $entityType, 
        ?int $entityId, 
        string $displayMode, 
        string $timeScale
    ): void {
        UserTimePreference::updateOrCreate(
            [
                'user_id' => $user->id,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
            ],
            [
                'display_mode' => $displayMode,
                'time_scale' => $timeScale,
            ]
        );
    }
}
```

### React Components

#### TimeInput Component

```tsx
interface TimeInputProps {
    value: number; // Always in seconds
    onChange: (seconds: number) => void;
    mode?: 'duration' | 'cycle_time' | 'throughput';
    displayMode?: 'cycle_time' | 'throughput'; // For mode='cycle_time' only
    scale?: 'seconds' | 'minutes' | 'hours' | 'auto';
    label?: string;
    required?: boolean;
    disabled?: boolean;
    min?: number;
    max?: number;
    unitOfMeasure?: string; // For throughput display
    onPreferenceChange?: (mode: string, scale: string) => void;
}

const TimeInput: React.FC<TimeInputProps> = ({
    value,
    onChange,
    mode = 'duration',
    displayMode = 'cycle_time',
    scale = 'auto',
    label,
    required,
    disabled,
    min,
    max,
    unitOfMeasure = 'units',
    onPreferenceChange,
}) => {
    const [localScale, setLocalScale] = useState(scale);
    const [localDisplayMode, setLocalDisplayMode] = useState(displayMode);
    const [showSettings, setShowSettings] = useState(false);

    const convertFromDisplay = (displayValue: number): number => {
        if (mode === 'throughput' || (mode === 'cycle_time' && localDisplayMode === 'throughput')) {
            // Convert throughput to cycle time (seconds)
            const multiplier = localScale === 'hours' ? 3600 : localScale === 'minutes' ? 60 : 1;
            return displayValue > 0 ? multiplier / displayValue : 0;
        } else {
            // Convert duration or cycle time to seconds
            const multiplier = localScale === 'hours' ? 3600 : localScale === 'minutes' ? 60 : 1;
            return displayValue * multiplier;
        }
    };

    const convertToDisplay = (seconds: number): number => {
        if (mode === 'throughput' || (mode === 'cycle_time' && localDisplayMode === 'throughput')) {
            // Convert cycle time to throughput
            const divisor = localScale === 'hours' ? 3600 : localScale === 'minutes' ? 60 : 1;
            return seconds > 0 ? divisor / seconds : 0;
        } else {
            // Convert seconds to display unit
            const divisor = localScale === 'hours' ? 3600 : localScale === 'minutes' ? 60 : 1;
            return seconds / divisor;
        }
    };

    const getUnitLabel = (): string => {
        if (mode === 'throughput' || (mode === 'cycle_time' && localDisplayMode === 'throughput')) {
            const timeUnit = localScale === 'hours' ? 'hour' : localScale === 'minutes' ? 'minute' : 'second';
            return `${unitOfMeasure}/${timeUnit}`;
        } else if (mode === 'cycle_time' && localDisplayMode === 'cycle_time') {
            const timeUnit = localScale === 'hours' ? 'hours' : localScale === 'minutes' ? 'minutes' : 'seconds';
            return `${timeUnit}/${unitOfMeasure}`;
        } else {
            return localScale === 'hours' ? 'hours' : localScale === 'minutes' ? 'minutes' : 'seconds';
        }
    };

    const handleScaleChange = (newScale: string) => {
        setLocalScale(newScale as any);
        onPreferenceChange?.(localDisplayMode, newScale);
    };

    const handleModeToggle = () => {
        if (mode === 'cycle_time') {
            const newMode = localDisplayMode === 'cycle_time' ? 'throughput' : 'cycle_time';
            setLocalDisplayMode(newMode);
            onPreferenceChange?.(newMode, localScale);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <div className="flex items-center gap-2">
                    {mode === 'cycle_time' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleModeToggle}
                        >
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            {localDisplayMode === 'cycle_time' ? 'Cycle Time' : 'Throughput'}
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="sm">
                                <Settings2 className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Time Scale</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={localScale} onValueChange={handleScaleChange}>
                                <DropdownMenuRadioItem value="auto">Auto</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="seconds">Seconds</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="minutes">Minutes</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="hours">Hours</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    value={convertToDisplay(value).toFixed(2)}
                    onChange={(e) => onChange(convertFromDisplay(parseFloat(e.target.value) || 0))}
                    disabled={disabled}
                    required={required}
                    min={min ? convertToDisplay(min) : undefined}
                    max={max ? convertToDisplay(max) : undefined}
                    step="0.01"
                    className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {getUnitLabel()}
                </span>
            </div>
        </div>
    );
};
```

### API Controllers

#### WorkCellController Updates

```php
public function store(StoreWorkCellRequest $request)
{
    $data = $request->validated();
    
    // Convert input times to seconds
    if (isset($data['default_setup_time'])) {
        $data['default_setup_time_seconds'] = $this->convertToSeconds(
            $data['default_setup_time']['value'],
            $data['default_setup_time']['unit']
        );
    }
    
    if (isset($data['default_production_rate'])) {
        if ($data['default_production_rate']['mode'] === 'throughput') {
            // Convert throughput to cycle time
            $unitsPerSecond = $this->convertThroughputToUnitsPerSecond(
                $data['default_production_rate']['value'],
                $data['default_production_rate']['unit']
            );
            $data['default_cycle_time_seconds'] = $unitsPerSecond > 0 ? 1 / $unitsPerSecond : null;
        } else {
            // Direct cycle time input
            $data['default_cycle_time_seconds'] = $this->convertToSeconds(
                $data['default_production_rate']['value'],
                $data['default_production_rate']['unit']
            );
        }
    }
    
    // Store display preferences
    if (isset($data['time_preferences'])) {
        $data['time_display_preference'] = $data['time_preferences']['display_mode'];
        $data['time_scale_preference'] = $data['time_preferences']['time_scale'];
    }
    
    $workCell = WorkCell::create($data);
    
    // Save user preferences
    if (isset($data['save_as_user_preference']) && $data['save_as_user_preference']) {
        app(TimePreferenceService::class)->saveUserPreference(
            auth()->user(),
            'work_cell',
            $workCell->id,
            $data['time_preferences']['display_mode'],
            $data['time_preferences']['time_scale']
        );
    }
    
    return redirect()
        ->route('production.work-cells.show', $workCell)
        ->with('success', 'Work cell created successfully');
}
```

### Migration Strategy

Since we're modifying the original migrations and running `migrate:fresh`:

1. **Phase 1: Update Migration Files**
   - Modify original migration files with new column names
   - Create new migration for user_time_preferences table
   - Update seeders to use new column names (if any)

2. **Phase 2: Model Updates**
   - Update all model $fillable arrays
   - Update model casts
   - Add helper methods for formatting

3. **Phase 3: Service Layer**
   - Implement TimeFormatter service
   - Implement TimePreferenceService
   - Update scheduling services to use seconds

4. **Phase 4: Update Existing Code**
   - Update all controllers to use new column names
   - Update all service classes
   - Update factory files

5. **Phase 5: UI Components**
   - Deploy new TimeInput component
   - Update all forms to use new component
   - Update all display logic

### Benefits

1. **Consistency**: Single base unit (seconds) throughout the system
2. **Flexibility**: Support for both cycle time and throughput paradigms
3. **User Experience**: Intelligent display and input scaling
4. **Precision**: No loss of precision from unit conversions
5. **Extensibility**: Easy to add new time formats or display modes

### Testing Plan

1. **Unit Tests**
   - TimeFormatter service methods
   - Model accessors and mutators
   - Conversion accuracy

2. **Integration Tests**
   - Database migration rollback/forward
   - API endpoint validation
   - Scheduling calculations

3. **UI Tests**
   - TimeInput component behavior
   - Preference persistence
   - Display format switching

### Implementation Notes

Since we're modifying the original migrations:

1. **No Rollback Needed**: Clean start with new schema
2. **Data Migration**: Any existing data will need to be exported/imported with conversions
3. **Factory Updates**: All factory files must be updated to use new column names
4. **Seeder Updates**: Any seeders must use the new column names

## Implementation Timeline

- **Day 1**: Update all migration files and create user preferences migration
- **Day 2-3**: Update models, factories, and seeders
- **Day 4-5**: Implement TimeFormatter and TimePreferenceService
- **Day 6-7**: Update all controllers and services to use new column names  
- **Week 2**: Develop and test React TimeInput component
- **Week 3**: Update all UI forms and displays
- **Week 4**: Integration testing and final adjustments

## Files to Update

### Migration Files - Time Standardization
1. `database/migrations/2025_01_10_000006_create_work_cells_table.php`
2. `database/migrations/2025_01_10_000007_create_work_cell_item_rates_table.php`
3. `database/migrations/2025_01_10_000011_create_manufacturing_steps_table.php`
4. Create new: `database/migrations/2025_01_17_000001_create_user_time_preferences_table.php`

### Migration Files - Unit of Measure Standardization
1. `database/migrations/2025_01_10_000001_create_items_table.php` - Line 34: change to foreign key
2. `database/migrations/2025_01_10_000004_create_bom_items_table.php` - Line 25: change to foreign key
3. `database/migrations/2025_01_10_000009_create_manufacturing_orders_table.php` - Line 23: change to foreign key
4. `database/migrations/2025_01_10_000015_create_shipment_items_table.php` - Line 24: change to foreign key

### Model Files
1. `app/Models/Production/WorkCell.php` - Update fillable, add UOM relationship
2. `app/Models/Production/WorkCellItemRate.php` - Update fillable, add UOM relationship
3. `app/Models/Production/ManufacturingStep.php` - Update fillable
4. `app/Models/Production/Item.php` - Add UOM relationship
5. `app/Models/Production/BomItem.php` - Add UOM relationship
6. `app/Models/Production/ManufacturingOrder.php` - Add UOM relationship
7. `app/Models/Production/ShipmentItem.php` - Add UOM relationship
8. Create new: `app/Models/UserTimePreference.php`

### Service Files
1. Create new: `app/Services/Production/TimeFormatter.php`
2. Create new: `app/Services/Production/TimePreferenceService.php`
3. Update: `app/Services/Scheduling/FamilyCapacityBookingService.php`
4. Update: `app/Services/SchedulingService.php`
5. Update: All scheduler algorithm services in `app/Services/Scheduling/`

### Controller Files
1. `app/Http/Controllers/Production/WorkCellController.php` - Update validation rules for UOM
2. `app/Http/Controllers/Production/ManufacturingStepController.php` - Update time field handling
3. `app/Http/Controllers/Production/SchedulerController.php` - Update time calculations
4. `app/Http/Controllers/Production/ItemController.php` - Update validation to use UOM codes
5. `app/Http/Controllers/Production/ManufacturingOrderController.php` - Update validation to use UOM codes
6. `app/Http/Controllers/Production/BillOfMaterialController.php` - Update validation to use UOM codes

### Factory Files
1. `database/factories/Production/WorkCellFactory.php` - Update to use UOM codes
2. `database/factories/Production/WorkCellItemRateFactory.php` - Update to use UOM codes
3. `database/factories/Production/ManufacturingStepFactory.php` - Update time fields
4. `database/factories/Production/ItemFactory.php` - Update to use UOM codes
5. `database/factories/Production/BomItemFactory.php` - Update to use UOM codes
6. `database/factories/Production/ManufacturingOrderFactory.php` - Update to use UOM codes

### React Components
1. Create new: `resources/js/components/TimeInput.tsx`
2. Update: `resources/js/components/production/CreateWorkCellSheet.tsx`
3. Update: `resources/js/pages/production/work-cells/show.tsx`
4. Update: `resources/js/components/production/scheduler/TimeParameterForm.tsx`
5. Update: `resources/js/components/production/scheduler/TimeParameterStatus.tsx`

### Utility Files
1. Create new: `resources/js/utils/time-formatter.ts`
2. Update: `resources/js/utils/date.ts`

## Unit of Measure Consistency

### Current State
The system has a proper `units_of_measure` table and model, but many tables still use free-text string fields for UOM, leading to inconsistency.

### Tables Currently Using String UOM Fields
1. **items** - `unit_of_measure` (line 34)
2. **bom_items** - `unit_of_measure` (line 25)
3. **manufacturing_orders** - `unit_of_measure` (line 23)
4. **shipment_items** - `unit_of_measure` (line 24)
5. **work_cells** - `default_unit_of_measure` (line 23)
6. **work_cell_item_rates** - `unit_of_measure` (line 20)

### Recommended Approach

1. **Use Foreign Keys**: Instead of string fields, use foreign key references to the `units_of_measure` table
2. **Standardize Column Names**: Use `unit_of_measure_code` that references the `code` column
3. **Maintain Flexibility**: The `code` column allows for familiar abbreviations while ensuring consistency

### Migration Changes

For each table, replace the string field with a foreign key:

```php
// Example for items table
$table->string('unit_of_measure_code', 20)->default('PC');
$table->foreign('unit_of_measure_code')->references('code')->on('units_of_measure');
```

### Model Relationships

Add relationships to all affected models:

```php
public function unitOfMeasure(): BelongsTo
{
    return $this->belongsTo(UnitOfMeasure::class, 'unit_of_measure_code', 'code');
}
```

### Controller Validation

Update validation rules:

```php
'unit_of_measure_code' => 'required|exists:units_of_measure,code,is_active,1'
```

### Benefits
- **Data Integrity**: No typos or variations (kg vs KG vs Kg)
- **Conversion Support**: Built-in conversion between related units
- **Type Safety**: Can't mix incompatible unit types
- **UI Consistency**: Dropdown selection from valid units
- **Automatic Validation**: Database enforces valid UOM codes

### Implementation Notes
- The UOM table is already seeded with common units
- The UI can show code + name for clarity (e.g., "PC - Piece")
- The system can validate unit compatibility in calculations
- Consider adding UOM type validation (e.g., can't mix MASS with VOLUME)

## Future Enhancements

1. **Multi-timezone Support**: Display times in user's local timezone
2. **Historical Tracking**: Track actual vs planned times
3. **Advanced Analytics**: Time-based performance metrics
4. **AI Predictions**: ML-based cycle time predictions
5. **Industry Standards**: Support for APICS/ISA-95 time formats
6. **Custom UOM**: Allow users to define custom units for specific industries
