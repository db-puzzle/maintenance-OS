import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InstructionForm } from './InstructionForm';
import { Instruction, InstructionType } from '@/types/task';

interface EditInstructionModalProps {
    /** Indica se o modal está aberto */
    open: boolean;
    /** Callback para fechar o modal */
    onClose: () => void;
    /** Callback para salvar a instrução */
    onSave: (instruction: Instruction) => void;
    /** Instrução a ser editada */
    instruction: Instruction;
}

export function EditInstructionModal({ open, onClose, onSave, instruction: initialInstruction }: EditInstructionModalProps) {
    const [instruction, setInstruction] = useState<Instruction>(initialInstruction);
    
    const handleFormChange = (updatedInstruction: Instruction) => {
        setInstruction(updatedInstruction);
    };

    const handleTypeChange = (_: InstructionType) => {
        // Não implementamos troca de tipo na edição, pois exigiria
        // recriar a instrução com novos campos
    };

    const handleSave = () => {
        onSave(instruction);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Editar Instrução</DialogTitle>
                </DialogHeader>

                <InstructionForm
                    instruction={instruction}
                    onChange={handleFormChange}
                    onTypeChange={handleTypeChange}
                    disableTypeChange
                />

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="w-full sm:w-auto">
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
