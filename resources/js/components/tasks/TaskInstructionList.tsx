import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Instruction, Task, TaskOperations } from '@/types/task';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { AddInstructionModal } from './AddInstructionModal';
import { TaskInstructionItem } from './TaskInstructionItem';
interface TaskInstructionListProps {
    /** Tarefa atual */
    task: Task;
    /** Modo de exibição (edit, preview, respond) */
    mode: 'edit' | 'preview' | 'respond';
    /** Callback chamado quando as instruções são atualizadas */
    onInstructionsUpdate: (updatedTask: Task) => void;
}
export function TaskInstructionList({ task, mode, onInstructionsUpdate }: TaskInstructionListProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const isEditing = mode === 'edit';
    const isPreviewOrRespond = mode === 'preview' || mode === 'respond';
    const instructions = task.instructions || [];
    const MAX_INSTRUCTIONS = 20;
    const hasInstructions = instructions.length > 0;
    const handleAddInstruction = (instruction: Instruction) => {
        const updatedTask = TaskOperations.addInstruction(task, instruction);
        onInstructionsUpdate(updatedTask);
        setIsAddModalOpen(false);
    };
    const handleRemoveInstruction = (instructionId: string) => {
        const updatedTask = TaskOperations.removeInstruction(task, instructionId);
        onInstructionsUpdate(updatedTask);
    };
    const handleUpdateInstruction = (updatedInstruction: Instruction) => {
        const updatedTask = TaskOperations.updateInstruction(task, updatedInstruction);
        onInstructionsUpdate(updatedTask);
    };
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {hasInstructions && isPreviewOrRespond && (
                    <div className="flex items-center gap-2">
                        <Switch id="show-instructions" checked={showInstructions} onCheckedChange={setShowInstructions} />
                        <Label htmlFor="show-instructions" className="cursor-pointer text-base font-semibold">
                            Instruções
                        </Label>
                    </div>
                )}
                {isEditing && instructions.length < MAX_INSTRUCTIONS && (
                    <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)} className="ml-auto flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Adicionar Instrução
                    </Button>
                )}
            </div>
            {hasInstructions && showInstructions && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {instructions.map((instruction, index) => {
                        // Calcular o número de itens na linha atual
                        const totalItems = instructions.length;
                        let itemClass = '';
                        if (totalItems === 1) {
                            // 1 item: ocupa toda a largura
                            itemClass = 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4';
                        } else if (totalItems === 2) {
                            // 2 itens: cada um ocupa metade
                            itemClass = 'col-span-1 sm:col-span-1 md:col-span-3 lg:col-span-2';
                        } else if (totalItems === 3) {
                            // 3 itens: distribuir uniformemente
                            if (index === 0) {
                                // Primeiro item ocupa mais espaço em layouts maiores
                                itemClass = 'col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-2';
                            } else {
                                itemClass = 'col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1';
                            }
                        } else {
                            // 4+ itens
                            const itemsPerRow = 4; // máximo de itens por linha
                            const itemsInLastRow = totalItems % itemsPerRow || itemsPerRow;
                            const isLastRow = Math.floor(index / itemsPerRow) === Math.floor((totalItems - 1) / itemsPerRow);
                            if (isLastRow && itemsInLastRow < 4) {
                                // Última linha com menos de 4 itens
                                if (itemsInLastRow === 1) {
                                    itemClass = 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4';
                                } else if (itemsInLastRow === 2) {
                                    itemClass = 'col-span-1 sm:col-span-1 md:col-span-3 lg:col-span-2';
                                } else if (itemsInLastRow === 3) {
                                    // Para 3 itens na última linha
                                    const posInLastRow = index % itemsPerRow;
                                    if (posInLastRow === 0) {
                                        itemClass = 'col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-2';
                                    } else {
                                        itemClass = 'col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1';
                                    }
                                }
                            }
                        }
                        return (
                            <div key={instruction.id} className={itemClass}>
                                <TaskInstructionItem
                                    instruction={instruction}
                                    mode={mode}
                                    onUpdate={handleUpdateInstruction}
                                    onRemove={() => handleRemoveInstruction(instruction.id)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
            <AddInstructionModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddInstruction} task={task} />
        </div>
    );
}
