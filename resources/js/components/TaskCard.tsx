import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, FileText, List, MessageSquare, Pencil, GripVertical, QrCode, Barcode, Upload, ScanBarcode, CheckSquare, ListChecks, Ruler, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/task';
import TextInput from '@/components/TextInput';
import AddTaskButton from '@/components/AddTaskButton';
import { TaskTypes } from '@/types/task';

interface TaskCardProps {
    task: Task;
    index: number;
    onEdit: () => void;
    onTypeChange: (type: Task['type']) => void;
    onNewTask?: () => void;
}

const getTaskTypeIcon = (type: Task['type'], codeReaderType?: 'qr_code' | 'barcode') => {
    const taskType = TaskTypes.find(t => t.value === type);
    return taskType ? <taskType.icon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
};

export default function TaskCard({ task, index, onEdit, onTypeChange, onNewTask }: TaskCardProps) {
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
        >
            <CardHeader>
                <div className="flex items-center gap-2">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab hover:cursor-grabbing touch-none"
                    >
                        <GripVertical className="h-4 w-4 text-gray-500" />
                    </button>
                    <div className="flex items-center gap-2">
                        {getTaskTypeIcon(task.type, task.codeReaderType)}
                        <Label className={`text-lg font-semibold flex-1 ${!task.description ? 'text-muted-foreground' : ''}`}>
                            {task.description || 'Clique em Editar para configurar a tarefa'}
                        </Label>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${task.isRequired ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                        {task.isRequired ? 'Obrigatório' : 'Opcional'}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onEdit}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {onNewTask && (
                <CardContent className="pt-0">
                    <AddTaskButton
                        label="Nova Tarefa Abaixo"
                        taskTypes={TaskTypes}
                        onTaskTypeChange={onTypeChange}
                        onNewTask={onNewTask}
                    />
                </CardContent>
            )}
        </Card>
    );
} 