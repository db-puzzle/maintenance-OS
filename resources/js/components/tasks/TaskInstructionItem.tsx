import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Instruction, InstructionType, TextInstruction, ImageInstruction, VideoInstruction } from '@/types/task';
import { Edit, Trash2 } from 'lucide-react';
import { EditInstructionModal } from './EditInstructionModal';
import { cn } from '@/lib/utils';

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

    // Cores para cada tipo de instrução
    const instructionStyles = {
        [InstructionType.Text]: {
            textColor: 'text-blue-700',
        },
        [InstructionType.Image]: {
            textColor: 'text-indigo-700',
        },
        [InstructionType.Video]: {
            textColor: 'text-purple-700',
        },
    };

    const currentStyle = instructionStyles[instruction.type];

    const handleSaveEdit = (updatedInstruction: Instruction) => {
        onUpdate(updatedInstruction);
        setIsEditModalOpen(false);
    };

    const renderTextInstruction = (textInstruction: TextInstruction) => (
        <Card className="rounded-xl overflow-hidden h-full">
            <CardContent className="relative flex justify-between items-start gap-4">
                <p className="text-sm text-muted-foreground flex-1">
                    {textInstruction.content}
                </p>
                {/* Botões de edição */}
                {isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {renderEditButtons()}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderImageInstruction = (imageInstruction: ImageInstruction) => (
        <Card className="rounded-xl overflow-hidden h-full">
            <img
                src={imageInstruction.imageUrl}
                alt={imageInstruction.caption || "Imagem de instrução"}
                className="w-full h-full object-cover max-h-[280px]"
            />
            <CardContent className="relative flex justify-between items-start gap-4">
                <p className="text-sm text-muted-foreground flex-1">
                    {imageInstruction.caption}
                </p>
                {/* Botões de edição */}
                {isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {renderEditButtons()}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderVideoInstruction = (videoInstruction: VideoInstruction) => (
        <Card className="rounded-xl overflow-hidden h-full">
            <video 
                src={videoInstruction.videoUrl} 
                controls
                className="w-full h-full object-cover max-h-[280px]"
            />
            <CardContent className="relative flex justify-between items-start gap-4">
                <p className="text-sm text-muted-foreground flex-1">
                    {videoInstruction.caption}
                </p>
                {/* Botões de edição */}
                {isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {renderEditButtons()}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderEditButtons = () => (
        <>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditModalOpen(true)}
                className="h-7 w-7 opacity-70 hover:opacity-100"
            >
                <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={onRemove}
                className="h-7 w-7 text-destructive opacity-70 hover:opacity-100"
            >
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