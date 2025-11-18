import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowBigDownDash } from 'lucide-react';
import { formatNumber } from '@/utils/number';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface GateConfiguration {
    dependency_type: 'none' | 'all_children_completed' | 'children_quantity';
    minimum_quantity?: number;
}

interface GateStatus {
    isMet: boolean;
    currentProgress?: number;
    requiredProgress?: number;
    message?: string;
}

interface GateIndicatorProps {
    gate: GateConfiguration;
    gateStatus: GateStatus;
    className?: string;
    nextStepReady?: boolean;
    isFinalGate?: boolean;
}

/**
 * Visual representation of a gate between route steps
 * Shows gate type, status (met/not met), and progress for quantity-based gates
 */
export function GateIndicator({
    gate,
    gateStatus,
    className,
    nextStepReady = false,
    isFinalGate = false,
}: GateIndicatorProps) {
    // Get gate display text matching GateCard
    const getGateDisplayText = () => {
        if (isFinalGate) {
            switch (gate.dependency_type) {
                case 'none':
                    return 'Ordem pai pode iniciar imediatamente';
                case 'all_children_completed':
                    return 'Ordem pai aguarda conclusão';
                case 'children_quantity':
                    return `Ordem pai aguarda ${formatNumber(gate.minimum_quantity || 0)} unid.`;
                default:
                    return 'Aguarda todas as ordens filhas';
            }
        } else {
            switch (gate.dependency_type) {
                case 'none':
                    return 'Próxima etapa inicia imediatamente';
                case 'all_children_completed':
                    return 'Aguarda todas as ordens filhas';
                case 'children_quantity':
                    return `Aguarda ${formatNumber(gate.minimum_quantity || 0)} unid. das ordens filhas`;
                default:
                    return 'Aguarda todas as ordens filhas';
            }
        }
    };

    // Get simple text for the gate type
    const getGateSimpleText = () => {
        switch (gate.dependency_type) {
            case 'none':
                return 'Simultâneo';
            case 'all_children_completed':
                return '100% das peças';
            case 'children_quantity':
                return `${formatNumber(gate.minimum_quantity || 0)} peças`;
            default:
                return '100% das peças';
        }
    };

    // Get status-based styling
    // Green when: gate is met AND next step is ready
    // Gray when: dependency_type === 'none'
    // White when: gate is not met yet
    const getStatusStyles = () => {
        if (gate.dependency_type === 'none') {
            return 'bg-gray-100 dark:bg-gray-950/30 border-gray-400';
        }

        if (gateStatus.isMet && nextStepReady) {
            return 'bg-green-100 dark:bg-green-950/30 border-green-500';
        }

        return 'bg-background border-border';
    };

    return (
        <div className={cn("flex flex-col items-center my-4", className)}>
            {/* Top connector line */}
            <div className="w-0.5 h-4 bg-border" />

            {/* Gate card */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={cn(
                                "relative transition-all duration-200 overflow-hidden",
                                "min-w-[120px] max-w-[200px] w-fit",
                                "border rounded-md",
                                getStatusStyles()
                            )}
                        >
                            <div className="flex items-center h-7">
                                {/* Icon with fixed position from left */}
                                <div className="absolute left-0 h-full w-8 flex items-center justify-center bg-muted/30 border-r border-border/50">
                                    <ArrowBigDownDash className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {/* Centered text with padding to account for icon */}
                                <div className="flex-1 pl-10 pr-4 flex items-center justify-center">
                                    <span className="text-xs font-medium tracking-wide">
                                        {getGateSimpleText()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{getGateDisplayText()}</p>
                        {gateStatus.message && (
                            <p className="text-xs text-muted-foreground mt-1">{gateStatus.message}</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Bottom connector line */}
            <div className="w-0.5 h-4 bg-border" />
        </div>
    );
}

