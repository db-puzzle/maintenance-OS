import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, ToggleLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
    className?: string;
    error?: string;
    form?: {
        data: Record<string, unknown>;
        setData: (key: string, value: unknown) => void;
        errors: Record<string, string>;
        clearErrors: (key: string) => void;
    }; // Form adapter
    name?: string; // Field name for form
}

export const TimeInput: React.FC<TimeInputProps> = ({
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
    className,
    error,
    form,
    name,
}) => {
    const [localScale, setLocalScale] = useState(scale);
    const [localDisplayMode, setLocalDisplayMode] = useState(displayMode);
    const [inputValue, setInputValue] = useState('');

    // Determine actual scale
    const getActualScale = useCallback((seconds: number): 'seconds' | 'minutes' | 'hours' => {
        if (localScale !== 'auto') return localScale;

        if (seconds >= 3600) return 'hours';
        if (seconds >= 60) return 'minutes';
        return 'seconds';
    }, [localScale]);

    // Convert from seconds to display value
    const convertFromSeconds = useCallback((seconds: number): number => {
        const actualScale = getActualScale(seconds);

        if (mode === 'throughput' || (mode === 'cycle_time' && localDisplayMode === 'throughput')) {
            // Convert cycle time to throughput
            if (seconds <= 0) return 0;
            const divisor = actualScale === 'hours' ? 3600 : actualScale === 'minutes' ? 60 : 1;
            return divisor / seconds;
        } else {
            // Convert seconds to display unit
            const divisor = actualScale === 'hours' ? 3600 : actualScale === 'minutes' ? 60 : 1;
            return seconds / divisor;
        }
    }, [getActualScale, mode, localDisplayMode]);

    // Convert from display value to seconds
    const convertToSeconds = (displayValue: number): number => {
        const actualScale = getActualScale(value);

        if (mode === 'throughput' || (mode === 'cycle_time' && localDisplayMode === 'throughput')) {
            // Convert throughput to cycle time (seconds)
            if (displayValue <= 0) return 0;
            const multiplier = actualScale === 'hours' ? 3600 : actualScale === 'minutes' ? 60 : 1;
            return multiplier / displayValue;
        } else {
            // Convert duration or cycle time to seconds
            const multiplier = actualScale === 'hours' ? 3600 : actualScale === 'minutes' ? 60 : 1;
            return displayValue * multiplier;
        }
    };

    // Update input value when value prop changes
    useEffect(() => {
        const displayValue = convertFromSeconds(value);
        setInputValue(displayValue.toFixed(2));
    }, [value, localScale, localDisplayMode, convertFromSeconds]);

    // Get unit label
    const getUnitLabel = (): string => {
        const actualScale = getActualScale(value);

        if (mode === 'throughput' || (mode === 'cycle_time' && localDisplayMode === 'throughput')) {
            const timeUnit = actualScale === 'hours' ? 'hour' : actualScale === 'minutes' ? 'minute' : 'second';
            return `${unitOfMeasure}/${timeUnit}`;
        } else if (mode === 'cycle_time' && localDisplayMode === 'cycle_time') {
            const timeUnit = actualScale === 'hours' ? 'hours' : actualScale === 'minutes' ? 'minutes' : 'seconds';
            return `${timeUnit}/${unitOfMeasure}`;
        } else {
            return actualScale === 'hours' ? 'hours' : actualScale === 'minutes' ? 'minutes' : 'seconds';
        }
    };

    // Handle scale change
    const handleScaleChange = (newScale: string) => {
        setLocalScale(newScale as 'seconds' | 'minutes' | 'hours' | 'auto');
        onPreferenceChange?.(localDisplayMode, newScale);
    };

    // Handle mode toggle
    const handleModeToggle = () => {
        if (mode === 'cycle_time') {
            const newMode = localDisplayMode === 'cycle_time' ? 'throughput' : 'cycle_time';
            setLocalDisplayMode(newMode);
            onPreferenceChange?.(newMode, localScale);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        const numValue = parseFloat(value) || 0;
        const seconds = convertToSeconds(numValue);

        // Validate min/max
        if (min !== undefined && seconds < min) return;
        if (max !== undefined && seconds > max) return;

        onChange(seconds);

        // Update form if provided
        if (form && name) {
            form.setData(name, seconds);
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                {label && <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>}
                <div className="flex items-center gap-2">
                    {mode === 'cycle_time' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleModeToggle}
                            disabled={disabled}
                        >
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            {localDisplayMode === 'cycle_time' ? 'Cycle Time' : 'Throughput'}
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" disabled={disabled}>
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
                <TextInput
                    type="number"
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={disabled}
                    required={required}
                    min={min ? convertFromSeconds(min).toString() : undefined}
                    max={max ? convertFromSeconds(max).toString() : undefined}
                    step="0.01"
                    className="flex-1"
                    error={error}
                    form={form}
                    name={name}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {getUnitLabel()}
                </span>
            </div>
        </div>
    );
};
