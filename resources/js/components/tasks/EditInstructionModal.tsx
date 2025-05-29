import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instruction, InstructionType } from '@/types/task';
import { useState } from 'react';
import { InstructionForm } from './InstructionForm';

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

                <InstructionForm instruction={instruction} onChange={handleFormChange} onTypeChange={handleTypeChange} disableTypeChange />

                <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row">
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
