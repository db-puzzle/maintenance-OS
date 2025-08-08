import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Grip } from 'lucide-react';
import { ManufacturingStep } from '@/types/production';
import { StepCard } from '@/components/production/StepCard';
import { cn } from '@/lib/utils';

interface ExtendedManufacturingStep extends ManufacturingStep {
    isNew?: boolean;
}
interface Props {
    steps: ExtendedManufacturingStep[];
    selectedStep: ExtendedManufacturingStep | null;
    zoom: number;
    can: {
        manage_steps: boolean;
    };
    onStepSelect: (step: ExtendedManufacturingStep | null) => void;
    onStepAdd: () => void;
    onStepReorder: (updatedSteps: ExtendedManufacturingStep[]) => void;
    onStepDelete: (step: ExtendedManufacturingStep) => void;
    isDragging: boolean;
    onDragStart: (isDragging: boolean) => void;
    draggedStep: ExtendedManufacturingStep | null;
    onDraggedStepChange: (step: ExtendedManufacturingStep | null) => void;
    isPanelOpen: boolean;
    viewMode?: boolean;
}
export default function RouteBuilderCanvas({
    steps,
    selectedStep,
    zoom,
    can,
    onStepSelect,
    onStepAdd,
    onStepReorder,
    onStepDelete,
    isDragging,
    onDragStart,
    draggedStep,
    onDraggedStepChange,
    viewMode = false
}: Props) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const handleDragStart = (e: React.DragEvent, step: ExtendedManufacturingStep) => {
        onDragStart(true);
        onDraggedStepChange(step);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };
    const handleDragLeave = () => {
        setDragOverIndex(null);
    };
    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (!draggedStep) return;
        const draggedIndex = steps.findIndex(s => s.id === draggedStep.id);
        if (draggedIndex === targetIndex) return;
        const newSteps = [...steps];
        newSteps.splice(draggedIndex, 1);
        newSteps.splice(targetIndex, 0, draggedStep);
        // Update step numbers and reconstruct dependencies
        const updatedSteps = newSteps.map((step, index) => {
            const updatedStep = {
                ...step,
                step_number: index + 1,
            };
            // Reconstruct dependencies based on new order
            if (index === 0) {
                // First step has no dependency
                updatedStep.depends_on_step_id = undefined;
            } else {
                // Each step depends on the previous one in the new order
                const previousStep = newSteps[index - 1];
                updatedStep.depends_on_step_id = previousStep.id;
                // Preserve the can_start_when_dependency setting if it exists
                if (!updatedStep.can_start_when_dependency) {
                    updatedStep.can_start_when_dependency = 'completed';
                }
            }
            return updatedStep;
        });
        onStepReorder(updatedSteps);
        onDragStart(false);
        onDraggedStepChange(null);
        setDragOverIndex(null);
    };
    const handleCanvasClick = () => {
        // Deselect step when clicking on canvas area
        // The stopPropagation() on interactive elements will prevent this from firing
        onStepSelect(null);
    };
    return (
        <ScrollArea className="flex-1 h-full">
            <div
                ref={canvasRef}
                className="min-h-full p-8 cursor-default bg-grid-pattern"
                style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    minHeight: '100vh'
                }}
                onClick={handleCanvasClick}
            >
                {/* Steps */}
                <div className="space-y-4 max-w-3xl mx-auto">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            draggable={can.manage_steps && !viewMode}
                            onDragStart={(e) => handleDragStart(e, step)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            className={cn(
                                "relative transition-all duration-200",
                                isDragging && draggedStep?.id !== step.id && "opacity-50",
                                dragOverIndex === index && draggedStep?.id !== step.id && "transform scale-95"
                            )}
                        >
                            {/* Drop Zone Indicator */}
                            {dragOverIndex === index && draggedStep && draggedStep.id !== step.id && (
                                <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full animate-pulse" />
                            )}
                            {/* Dependency Line */}
                            {index > 0 && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <div className={cn(
                                        "w-0.5 h-4 transition-colors",
                                        dragOverIndex !== null && draggedStep ? "bg-primary" : "bg-border"
                                    )} />
                                </div>
                            )}
                            <div
                                className="flex items-center justify-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {can.manage_steps && !viewMode && (
                                    <Grip className="h-5 w-5 text-muted-foreground cursor-move" />
                                )}
                                <StepCard
                                    step={step}
                                    selected={selectedStep?.id === step.id}
                                    onClick={() => onStepSelect(step)}
                                    onDelete={() => onStepDelete(step)}
                                    canDelete={can.manage_steps && !viewMode}
                                    showStatus={false}
                                />
                            </div>
                            {/* Add Step Button */}
                            {can.manage_steps && !viewMode && index === steps.length - 1 && (
                                <div
                                    className="flex justify-center mt-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onStepAdd}
                                        className="rounded-full"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {/* Empty State */}
                    {steps.length === 0 && (
                        <div
                            className="text-center py-12"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-muted-foreground mb-4">
                                Nenhuma etapa definida ainda
                            </p>
                            {can.manage_steps && !viewMode && (
                                <Button onClick={onStepAdd}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar Primeira Etapa
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .bg-grid-pattern {
                    background-image: 
                        linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}            </style>
        </ScrollArea>
    );
}