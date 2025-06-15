import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task, TaskOperations, TaskType, TaskTypeGroups } from '@/types/task';
import { PlusCircle } from 'lucide-react';

interface AddTaskButtonProps {
    label: string;
    tasks?: Task[];
    currentIndex?: number;
    onTaskAdded?: (newTask: Task) => void;
}

export default function AddTaskButton({ label, tasks, currentIndex = -1, onTaskAdded = () => { } }: AddTaskButtonProps) {
    const handleAddTask = (type: TaskType) => {
        const newTask = TaskOperations.createAtIndex(tasks, currentIndex + 1, type);
        if (onTaskAdded) {
            onTaskAdded(newTask);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="flex w-full items-center justify-center gap-2 text-sm whitespace-nowrap">
                    <PlusCircle className="h-4 w-4" />
                    <span>{label}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 max-w-[90vw]">
                <DropdownMenuLabel>Tipo de Tarefa</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Grupo de Medições */}
                {TaskTypeGroups.measurementGroup.map((type) => (
                    <DropdownMenuItem key={type.id} onClick={() => handleAddTask(type.value)} className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.name}</span>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                {/* Grupo de Questões */}
                {TaskTypeGroups.questionGroup.map((type) => (
                    <DropdownMenuItem key={type.id} onClick={() => handleAddTask(type.value)} className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.name}</span>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                {/* Grupo de Coleta de Dados */}
                {TaskTypeGroups.dataCollectionGroup.map((type) => (
                    <DropdownMenuItem key={type.id} onClick={() => handleAddTask(type.value)} className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
