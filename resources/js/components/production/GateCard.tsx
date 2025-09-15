import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowBigDownDash } from 'lucide-react';
import { formatNumber } from '@/utils/number';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export interface GateConfiguration {
    dependency_type: 'none' | 'all_children_completed' | 'children_quantity';
    minimum_quantity?: number;
    maximum_quantity?: number;
}

interface GateCardProps {
    gate: GateConfiguration;
    isSelected: boolean;
    onClick: () => void;
    disabled?: boolean;
    isFinalGate?: boolean;
}

export function GateCard({
    gate,
    isSelected,
    onClick,
    disabled = false,
    isFinalGate = false
}: GateCardProps) {
    // Get display text for the gate
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

    return (
        <div className="relative my-4">
            {/* Connection lines */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full h-4 w-0.5 bg-border" />
            {!isFinalGate && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full h-4 w-0.5 bg-border" />
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Card
                            variant="compact"
                            className={cn(
                                "relative mx-auto transition-all duration-200 overflow-hidden",
                                "min-w-[120px] max-w-[200px] w-fit",
                                "!py-0 !gap-0", // Override compact variant's padding
                                !disabled && "cursor-pointer hover:shadow-lg hover:scale-105",
                                isSelected && "border-ring ring-ring/10 ring-[2px] bg-input-focus shadow-md",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => !disabled && onClick()}
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
                        </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{getGateDisplayText()}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
