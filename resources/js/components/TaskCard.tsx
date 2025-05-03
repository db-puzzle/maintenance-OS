import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, FileText, List, MessageSquare, Pencil, GripVertical, QrCode, Barcode, Upload, ScanBarcode, CheckSquare, ListChecks, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/task';

interface TaskCardProps {
    task: Task;
    index: number;
    onEdit: () => void;
    onTypeChange: (type: Task['type']) => void;
}

const getTaskTypeIcon = (type: Task['type'], codeReaderType?: 'qr_code' | 'barcode') => {
    switch(type) {
        case 'question':
            return <FileText />;
        case 'multiple_choice':
            return <CheckSquare />;
        case 'multiple_select':
            return <ListChecks />;
        case 'measurement':
            return <Ruler />;
        case 'photo':
            return <Camera />;
        case 'code_reader':
            if (!codeReaderType) {
                return <ScanBarcode />;
            }
            return codeReaderType === 'barcode' 
                ? <Barcode />
                : <QrCode />;
        case 'file_upload':
            return <Upload />;
        default:
            return <FileText />;
    }
};

export default function TaskCard({ task, index, onEdit, onTypeChange }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `task-${task.id}`,
        animateLayoutChanges: () => false
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition && 'transform 150ms ease',
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 1 : undefined
    };

    return (
        <Card 
            ref={setNodeRef}
            style={style}
            className={`bg-muted/30 ${isDragging ? 'shadow-lg' : ''}`}
            {...attributes}
            {...listeners}
        >
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="cursor-grab hover:cursor-grabbing touch-none">
                        {getTaskTypeIcon(task.type, task.codeReaderType)}
                    </div>
                    <Label className="text-lg font-semibold flex-1 text-muted-foreground">
                        {task.description || 'Clique em Editar para configurar a tarefa'}
                    </Label>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${task.required ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                        {task.required ? 'Obrigatório' : 'Opcional'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                    
                </div>

                {(task.type === 'multiple_choice' || task.type === 'multiple_select') && task.options && (
                    <div className="space-y-0.5 pl-4">
                        
                    </div>
                )}

                {task.type === 'measurement' && task.measurementPoints && (
                    <div className="space-y-0.5 pl-4">
                        
                    </div>
                )}

                {task.type === 'photo' && task.photoInstructions && (
                    <div className="space-y-0.5 pl-4">
                        
                    </div>
                )}

                {task.type === 'code_reader' && task.codeReaderInstructions && (
                    <div className="space-y-0.5 pl-4">
                        
                    </div>
                )}

                {task.type === 'file_upload' && task.fileUploadInstructions && (
                    <div className="space-y-0.5 pl-4">
                        
                    </div>
                )}
                <div className="flex justify-end items-center mt-4">
                    <Button
                        type="button"
                        onClick={onEdit}
                        className="flex items-center gap-2"
                    >
                        Editar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 