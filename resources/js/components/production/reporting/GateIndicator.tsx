import React from 'react';
import { cn } from '@/lib/utils';
import { Package, Hash, ArrowDown, Check, X } from 'lucide-react';
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
}

/**
 * Visual representation of a gate between route steps
 * Shows gate type, status (met/not met), and progress for quantity-based gates
 */
export function GateIndicator({
    gate,
    gateStatus,
    className
}: GateIndicatorProps) {
    // Get gate type configuration
    const getGateConfig = () => {
        switch (gate.dependency_type) {
            case 'all_children_completed':
                return {
                    icon: Package,
                    label: 'Todas as Peças',
                    shortLabel: '100%',
                    color: 'blue',
                };
            case 'children_quantity':
                return {
                    icon: Hash,
                    label: 'Quantidade Mínima',
                    shortLabel: `${formatNumber(gate.minimum_quantity || 0)}`,
                    color: 'purple',
                };
            case 'none':
            default:
                return {
                    icon: ArrowDown,
                    label: 'Continuar',
                    shortLabel: 'Próximo',
                    color: 'gray',
                };
        }
    };

    const gateConfig = getGateConfig();
    const GateIcon = gateConfig.icon;

    // Get status-based styling
    const getStatusStyles = () => {
        if (gate.dependency_type === 'none') {
            return 'bg-gray-100 dark:bg-gray-950/30 border-gray-400';
        }
        
        if (gateStatus.isMet) {
            return 'bg-green-100 dark:bg-green-950/30 border-green-500';
        }
        
        return 'bg-red-100 dark:bg-red-950/30 border-red-500';
    };

    return (
        <div className={cn("flex flex-col items-center my-2", className)}>
            {/* Top connector line */}
            <div className="w-0.5 h-6 border-l-2 border-dashed border-border" />

            {/* Gate box */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={cn(
                                "relative w-32 border-2 rounded-md p-2 transition-all duration-200",
                                getStatusStyles()
                            )}
                        >
                            {/* Gate type and status */}
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <GateIcon className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold uppercase tracking-wide">
                                    {gateConfig.shortLabel}
                                </span>
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center justify-center gap-1">
                                {gate.dependency_type !== 'none' && (
                                    <>
                                        {gateStatus.isMet ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <X className="h-4 w-4 text-red-600" />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Quantity progress for children_quantity gates */}
                            {gate.dependency_type === 'children_quantity' && 
                             gateStatus.currentProgress !== undefined && 
                             gateStatus.requiredProgress !== undefined && (
                                <div className="mt-1 text-center">
                                    <p className="text-[10px] font-medium">
                                        {formatNumber(gateStatus.currentProgress)} / {formatNumber(gateStatus.requiredProgress)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1">
                            <p className="font-semibold">{gateConfig.label}</p>
                            <p className="text-xs">{gateStatus.message}</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Bottom connector line */}
            <div className="w-0.5 h-6 border-l-2 border-dashed border-border" />
        </div>
    );
}

