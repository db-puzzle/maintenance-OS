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

#### 1. New Migration: Standardize Time Fields

```sql
-- Update work_cells table
ALTER TABLE work_cells 
  ADD COLUMN default_setup_time_seconds INTEGER DEFAULT 0,
  ADD COLUMN default_cycle_time_seconds DECIMAL(10,3) DEFAULT NULL,
  ADD COLUMN time_display_preference ENUM('cycle_time', 'throughput') DEFAULT 'cycle_time',
  ADD COLUMN time_scale_preference ENUM('seconds', 'minutes', 'hours', 'auto') DEFAULT 'auto';

-- Migrate existing data
UPDATE work_cells 
SET 
  default_setup_time_seconds = default_setup_time_minutes * 60,
  default_cycle_time_seconds = CASE 
    WHEN default_production_rate_per_hour > 0 THEN 3600.0 / default_production_rate_per_hour
    ELSE NULL
  END;

-- Drop old columns after migration
ALTER TABLE work_cells 
  DROP COLUMN default_setup_time_minutes,
  DROP COLUMN default_production_rate_per_hour;

-- Update work_cell_item_rates table
ALTER TABLE work_cell_item_rates
  ADD COLUMN setup_time_seconds INTEGER DEFAULT 0,
  ADD COLUMN cycle_time_seconds DECIMAL(10,3) NOT NULL;

-- Migrate existing data
UPDATE work_cell_item_rates
SET 
  setup_time_seconds = setup_time_minutes * 60,
  cycle_time_seconds = CASE 
    WHEN production_rate_per_hour > 0 THEN 3600.0 / production_rate_per_hour
    ELSE 60 -- Default 1 minute if no rate
  END;

-- Drop old columns
ALTER TABLE work_cell_item_rates
  DROP COLUMN setup_time_minutes,
  DROP COLUMN production_rate_per_hour;

-- Update manufacturing_steps table
ALTER TABLE manufacturing_steps
  ADD COLUMN setup_time_seconds INTEGER DEFAULT 0,
  ADD COLUMN cycle_time_seconds DECIMAL(10,3) DEFAULT NULL;

-- Migrate existing data
UPDATE manufacturing_steps
SET 
  setup_time_seconds = setup_time_minutes * 60,
  cycle_time_seconds = cycle_time_minutes * 60;

-- Drop old columns
ALTER TABLE manufacturing_steps
  DROP COLUMN setup_time_minutes,
  DROP COLUMN cycle_time_minutes;
```

#### 2. User Preferences Table

```sql
CREATE TABLE user_time_preferences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  entity_type ENUM('work_cell', 'global') NOT NULL,
  entity_id BIGINT NULL,
  display_mode ENUM('cycle_time', 'throughput') DEFAULT 'cycle_time',
  time_scale ENUM('seconds', 'minutes', 'hours', 'auto') DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_entity (user_id, entity_type, entity_id)
);
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

    // Accessor for backward compatibility
    public function getDefaultSetupTimeMinutesAttribute(): float
    {
        return $this->default_setup_time_seconds / 60;
    }

    // Accessor for throughput calculation
    public function getDefaultProductionRatePerHourAttribute(): ?float
    {
        if (!$this->default_cycle_time_seconds || $this->default_cycle_time_seconds <= 0) {
            return null;
        }
        return 3600 / $this->default_cycle_time_seconds;
    }

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

1. **Phase 1: Database Migration**
   - Create new columns with _seconds suffix
   - Run data migration to convert existing values
   - Keep old columns temporarily for rollback

2. **Phase 2: Model Updates**
   - Update models to use new columns
   - Add accessors for backward compatibility
   - Update relationships and scopes

3. **Phase 3: Service Layer**
   - Implement TimeFormatter service
   - Implement TimePreferenceService
   - Update scheduling services to use seconds

4. **Phase 4: UI Components**
   - Deploy new TimeInput component
   - Update existing forms to use new component
   - Implement preference persistence

5. **Phase 5: Cleanup**
   - Remove old columns from database
   - Remove backward compatibility code
   - Update all references

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

### Rollback Plan

1. Keep old columns for 2 release cycles
2. Maintain backward compatibility accessors
3. Feature flag for new UI components
4. Database triggers to sync old/new columns during transition

## Implementation Timeline

- **Week 1-2**: Database schema changes and migrations
- **Week 3-4**: Model and service layer updates
- **Week 5-6**: React component development
- **Week 7**: Integration and testing
- **Week 8**: Deployment and monitoring

## Future Enhancements

1. **Multi-timezone Support**: Display times in user's local timezone
2. **Historical Tracking**: Track actual vs planned times
3. **Advanced Analytics**: Time-based performance metrics
4. **AI Predictions**: ML-based cycle time predictions
5. **Industry Standards**: Support for APICS/ISA-95 time formats
