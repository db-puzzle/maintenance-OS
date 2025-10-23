import React from 'react';
import { cn } from '@/lib/utils';

export type StepStatus = 'not_ready' | 'ready' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export interface StepBoxProps {
    stepName: string;
    workcellName?: string;
    status: StepStatus;
    onClick?: () => void;
    className?: string;
    maxCharacters?: number;
}

// Status color mapping according to specification
const statusColors: Record<StepStatus, { bg: string; text: string }> = {
    not_ready: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' },
    ready: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-gray-800 dark:text-gray-200' },
    in_progress: { bg: 'bg-blue-300 dark:bg-blue-700/50', text: 'text-gray-800 dark:text-gray-200' },
    completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-gray-800 dark:text-gray-200' },
    on_hold: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-gray-800 dark:text-gray-200' },
    cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-gray-800 dark:text-gray-200' }
};

/**
 * MOViewerStepBox - Displays a single step in the MO Viewer
 * 
 * According to specification:
 * - Rounded rectangular box with two lines of text
 * - Top line: Step name
 * - Bottom line: Workcell name
 * - Background color indicates status
 * - Consistent size regardless of content
 * - Text truncation for long names
 */
export function MOViewerStepBox({
    stepName,
    workcellName,
    status,
    onClick,
    className,
    maxCharacters = 20
}: StepBoxProps) {
    // Truncate text if it exceeds max characters
    const truncateText = (text: string, maxChars: number) => {
        if (text.length <= maxChars) return text;
        return text.substring(0, maxChars - 3) + '...';
    };

    const colors = statusColors[status];

    return (
        <div
            className={cn(
                // Base styles - consistent size
                'w-40 h-16 px-3 py-2',
                // Rounded corners
                'rounded-md',
                // Border
                'border border-gray-300 dark:border-gray-600',
                // Status-based background color
                colors.bg,
                // Text color
                colors.text,
                // Cursor and hover effects
                onClick && 'cursor-pointer hover:shadow-md transition-shadow',
                // Custom className
                className
            )}
            onClick={onClick}
        >
            {/* Step name - top line */}
            <div className="text-sm font-medium leading-tight truncate" title={stepName}>
                {truncateText(stepName, maxCharacters)}
            </div>

            {/* Workcell name - bottom line */}
            <div className="text-xs mt-1 leading-tight truncate opacity-90" title={workcellName}>
                {workcellName ? truncateText(workcellName, maxCharacters) : '\u00A0'}
            </div>
        </div>
    );
}
