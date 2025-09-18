import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PriorityEditorProps {
    priority: number;
    onChange: (newPriority: number) => void;
    disabled?: boolean;
    compact?: boolean;
}

export function PriorityEditor({
    priority,
    onChange,
    disabled = false,
    compact = false
}: PriorityEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(priority.toString());
    const [isHovered, setIsHovered] = useState(false);
    const [localPriority, setLocalPriority] = useState(priority);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setValue(priority.toString());
        setLocalPriority(priority);
        // Clear any pending debounce when priority changes (e.g., after successful update or on error)
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, [priority]);

    const handleSave = () => {
        const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
        onChange(numValue);
        setValue(numValue.toString());
        setLocalPriority(numValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setValue(localPriority.toString());
        setIsEditing(false);
    };

    // Debounced onChange callback
    const debouncedOnChange = useCallback((newValue: number) => {
        // Clear any existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set a new timer
        debounceTimerRef.current = setTimeout(() => {
            onChange(newValue);
        }, 800); // 500ms delay
    }, [onChange]);

    const handleIncrement = (amount: number) => {
        const newValue = Math.max(0, Math.min(100, localPriority + amount));
        setLocalPriority(newValue);
        setValue(newValue.toString());
        debouncedOnChange(newValue);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const getPriorityColor = (value: number) => {
        if (value >= 80) return 'text-red-600 dark:text-red-400';
        if (value <= 20) return 'text-blue-600 dark:text-blue-400';
        return 'text-muted-foreground';
    };

    const getPriorityLabel = (value: number) => {
        if (value >= 80) return 'High';
        if (value <= 20) return 'Low';
        return 'Normal';
    };

    if (disabled) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={cn(
                            "text-xs font-medium select-none",
                            getPriorityColor(localPriority)
                        )}>
                            P: {localPriority}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <span className="text-xs">Priority: {getPriorityLabel(localPriority)} ({localPriority}/100)</span>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Decrement button */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-6 w-6 p-0 transition-all duration-200",
                    (!isHovered || isEditing) && "opacity-0 scale-0 w-0",
                    isHovered && !isEditing && "opacity-100 scale-100"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    handleIncrement(-5);
                }}
                disabled={localPriority <= 0}
            >
                <ChevronDown className="h-4 w-4" />
            </Button>

            {/* Priority display/input */}
            {isEditing ? (
                <Input
                    ref={inputRef}
                    type="number"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "h-7 w-14 px-1 text-center font-medium",
                        compact ? "h-5 w-10 text-[11px]" : "text-sm"
                    )}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                />
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className={cn(
                                    "px-2 py-1 rounded font-medium transition-colors",
                                    "hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring",
                                    getPriorityColor(localPriority),
                                    compact ? "text-[11px] px-1 py-0" : "text-sm",
                                    localPriority !== priority && "ring-1 ring-orange-500/50"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                    setTimeout(() => inputRef.current?.select(), 0);
                                }}
                            >
                                P:{localPriority}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-xs">
                                <div>Priority: {getPriorityLabel(localPriority)} ({localPriority}/100)</div>
                                <div className="text-muted-foreground mt-1">Click to edit</div>
                                {localPriority !== priority && (
                                    <div className="text-orange-500 mt-1">Unsaved changes</div>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Increment button */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-6 w-6 p-0 transition-all duration-200",
                    (!isHovered || isEditing) && "opacity-0 scale-0 w-0",
                    isHovered && !isEditing && "opacity-100 scale-100"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    handleIncrement(5);
                }}
                disabled={localPriority >= 100}
            >
                <ChevronUp className="h-4 w-4" />
            </Button>
        </div>
    );
}
