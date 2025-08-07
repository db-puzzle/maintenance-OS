import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instruction, InstructionType, Task, TaskOperations } from '@/types/task';
import { useCallback, useEffect, useState } from 'react';
import { InstructionForm } from './InstructionForm';
interface AddInstructionModalProps {
    /** Indica se o modal está aberto */
    open: boolean;
    /** Callback para fechar o modal */
    onClose: () => void;
    /** Callback para adicionar a instrução */
    onAdd: (instruction: Instruction) => void;
    /** Tarefa atual */
    task: Task;
}
export function AddInstructionModal({ open, onClose, onAdd, task }: AddInstructionModalProps) {
    const [instructionType, setInstructionType] = useState<InstructionType>(InstructionType.Image);
    // Função para obter a instrução padrão baseada no tipo
    const getDefaultInstructionByType = useCallback((type: InstructionType): Instruction => {
        const instructionId = TaskOperations.generateInstructionId(task);
        switch (type) {
            case InstructionType.Text:
                return {
                    id: instructionId,
                    type: InstructionType.Text,
                    content: '',
                };
            case InstructionType.Image:
                return {
                    id: instructionId,
                    type: InstructionType.Image,
                    imageUrl: '',
                    caption: '',
                };
            case InstructionType.Video:
                return {
                    id: instructionId,
                    type: InstructionType.Video,
                    videoUrl: '',
                    caption: '',
                };
            default:
                return {
                    id: instructionId,
                    type: InstructionType.Text,
                    content: '',
                };
        }
    }, [task]);
    const [instruction, setInstruction] = useState<Instruction>(getDefaultInstructionByType(instructionType));
    // Reinicia o formulário quando o modal é aberto
    useEffect(() => {
        if (open) {
            // Define um tipo padrão
            const defaultType = InstructionType.Image;
            setInstructionType(defaultType);
            // Reinicia a instrução com os valores padrão
            setInstruction(getDefaultInstructionByType(defaultType));
        }
    }, [open, task, getDefaultInstructionByType]);
    // Atualiza a instrução quando o tipo muda
    const handleTypeChange = (type: InstructionType) => {
        setInstructionType(type);
        setInstruction(getDefaultInstructionByType(type));
    };
    const handleSave = () => {
        // Regenera o ID para garantir unicidade
        const newInstruction = {
            ...instruction,
            id: TaskOperations.generateInstructionId(task),
        };
        onAdd(newInstruction);
    };
    const handleFormChange = (updatedInstruction: Instruction) => {
        setInstruction(updatedInstruction);
    };
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Adicionar Instrução</DialogTitle>
                </DialogHeader>
                <InstructionForm instruction={instruction} onChange={handleFormChange} onTypeChange={handleTypeChange} />
                <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="w-full sm:w-auto">
                        Adicionar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
