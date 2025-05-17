import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Task, TaskType, TaskTypes, TaskTypeGroups, TaskOperations } from '@/types/task';
import { LucideIcon } from 'lucide-react';
import ItemSelect from '@/components/ItemSelect';

interface AddTaskButtonProps {
    label: string;
    taskTypes: typeof TaskTypes;
    tasks?: Task[];
    currentIndex?: number;
    onTaskAdded?: (newTask: Task) => void;
}

export default function AddTaskButton({ 
    label,
    taskTypes,
    tasks,
    currentIndex = -1,
    onTaskAdded = () => {}
}: AddTaskButtonProps) {
    const handleAddTask = (type: TaskType) => {
        const newTask = TaskOperations.createAtIndex(tasks, currentIndex + 1, type);
        if (onTaskAdded) {
            onTaskAdded(newTask);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 whitespace-nowrap text-sm w-full justify-center"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>{label}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 max-w-[90vw]">
                <DropdownMenuLabel>Tipo de Tarefa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Grupo de Medições */}
                {TaskTypeGroups.measurementGroup.map((type) => (
                    <DropdownMenuItem
                        key={type.id}
                        onClick={() => handleAddTask(type.value)}
                        className="flex items-center gap-2"
                    >
                        <type.icon className="h-4 w-4" />
                        <span>{type.name}</span>
                    </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                
                {/* Grupo de Questões */}
                {TaskTypeGroups.questionGroup.map((type) => (
                    <DropdownMenuItem
                        key={type.id}
                        onClick={() => handleAddTask(type.value)}
                        className="flex items-center gap-2"
                    >
                        <type.icon className="h-4 w-4" />
                        <span>{type.name}</span>
                    </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                
                {/* Grupo de Coleta de Dados */}
                {TaskTypeGroups.dataCollectionGroup.map((type) => (
                    <DropdownMenuItem
                        key={type.id}
                        onClick={() => handleAddTask(type.value)}
                        className="flex items-center gap-2"
                    >
                        <type.icon className="h-4 w-4" />
                        <span>{type.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 