import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InstructionForm } from './InstructionForm';
import { Instruction, InstructionType, Task, TaskOperations, TextInstruction, ImageInstruction, VideoInstruction } from '@/types/task';

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
    
    // Valores padrão para cada tipo de instrução
    const defaultTextInstruction: TextInstruction = {
        id: TaskOperations.generateInstructionId(task),
        type: InstructionType.Text,
        content: ''
    };

    const defaultImageInstruction: ImageInstruction = {
        id: TaskOperations.generateInstructionId(task),
        type: InstructionType.Image,
        imageUrl: '',
        caption: ''
    };

    const defaultVideoInstruction: VideoInstruction = {
        id: TaskOperations.generateInstructionId(task),
        type: InstructionType.Video,
        videoUrl: '',
        caption: ''
    };

    // Função para obter a instrução padrão baseada no tipo
    const getDefaultInstructionByType = (type: InstructionType): Instruction => {
        switch (type) {
            case InstructionType.Text:
                return defaultTextInstruction;
            case InstructionType.Image:
                return defaultImageInstruction;
            case InstructionType.Video:
                return defaultVideoInstruction;
            default:
                return defaultTextInstruction;
        }
    };

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
    }, [open, task]);

    // Atualiza a instrução quando o tipo muda
    const handleTypeChange = (type: InstructionType) => {
        setInstructionType(type);
        setInstruction(getDefaultInstructionByType(type));
    };

    const handleSave = () => {
        // Regenera o ID para garantir unicidade
        const newInstruction = {
            ...instruction,
            id: TaskOperations.generateInstructionId(task)
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

                <InstructionForm
                    instruction={instruction}
                    onChange={handleFormChange}
                    onTypeChange={handleTypeChange}
                />

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
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