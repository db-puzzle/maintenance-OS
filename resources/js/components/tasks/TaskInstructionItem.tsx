import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageInstruction, Instruction, InstructionType, TextInstruction, VideoInstruction } from '@/types/task';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EditInstructionModal } from './EditInstructionModal';

interface TaskInstructionItemProps {
    /** A instrução a ser renderizada */
    instruction: Instruction;
    /** Modo de exibição (edit, preview, respond) */
    mode: 'edit' | 'preview' | 'respond';
    /** Callback para atualizar a instrução */
    onUpdate: (updatedInstruction: Instruction) => void;
    /** Callback para remover a instrução */
    onRemove: () => void;
}

export function TaskInstructionItem({ instruction, mode, onUpdate, onRemove }: TaskInstructionItemProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const isEditing = mode === 'edit';

    const handleSaveEdit = (updatedInstruction: Instruction) => {
        onUpdate(updatedInstruction);
        setIsEditModalOpen(false);
    };

    const renderTextInstruction = (textInstruction: TextInstruction) => (
        <Card className="h-full overflow-hidden rounded-xl">
            <CardContent className="relative flex items-start justify-between gap-4">
                <p className="text-muted-foreground flex-1 text-sm">{textInstruction.content}</p>
                {/* Botões de edição */}
                {isEditing && <div className="flex flex-shrink-0 items-center gap-1">{renderEditButtons()}</div>}
            </CardContent>
        </Card>
    );

    const renderImageInstruction = (imageInstruction: ImageInstruction) => (
        <Card className="h-full overflow-hidden rounded-xl">
            <img
                src={imageInstruction.imageUrl}
                alt={imageInstruction.caption || 'Imagem de instrução'}
                className="h-full max-h-[280px] w-full object-cover"
            />
            <CardContent className="relative flex items-start justify-between gap-4">
                <p className="text-muted-foreground flex-1 text-sm">{imageInstruction.caption}</p>
                {/* Botões de edição */}
                {isEditing && <div className="flex flex-shrink-0 items-center gap-1">{renderEditButtons()}</div>}
            </CardContent>
        </Card>
    );

    const renderVideoInstruction = (videoInstruction: VideoInstruction) => (
        <Card className="h-full overflow-hidden rounded-xl">
            <video src={videoInstruction.videoUrl} controls className="h-full max-h-[280px] w-full object-cover" />
            <CardContent className="relative flex items-start justify-between gap-4">
                <p className="text-muted-foreground flex-1 text-sm">{videoInstruction.caption}</p>
                {/* Botões de edição */}
                {isEditing && <div className="flex flex-shrink-0 items-center gap-1">{renderEditButtons()}</div>}
            </CardContent>
        </Card>
    );

    const renderEditButtons = () => (
        <>
            <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)} className="h-7 w-7 opacity-70 hover:opacity-100">
                <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive h-7 w-7 opacity-70 hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </>
    );

    const renderInstructionContent = () => {
        switch (instruction.type) {
            case InstructionType.Text:
                return renderTextInstruction(instruction as TextInstruction);
            case InstructionType.Image:
                return renderImageInstruction(instruction as ImageInstruction);
            case InstructionType.Video:
                return renderVideoInstruction(instruction as VideoInstruction);
            default:
                return null;
        }
    };

    return (
        <>
            {renderInstructionContent()}

            {isEditModalOpen && (
                <EditInstructionModal
                    open={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    instruction={instruction}
                />
            )}
        </>
    );
}
