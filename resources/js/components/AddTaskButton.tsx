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
import { Task, TaskType, TaskTypes } from '@/types/task';
import { LucideIcon } from 'lucide-react';
import ItemSelect from '@/components/ItemSelect';

interface AddTaskButtonProps {
    label: string;
    taskTypes: typeof TaskTypes;
    onTaskTypeChange: (type: TaskType) => void;
    onNewTask: () => void;
}

export default function AddTaskButton({ 
    label,
    taskTypes,
    onTaskTypeChange,
    onNewTask 
}: AddTaskButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-60">
                <DropdownMenuLabel>Tipo de Tarefa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {taskTypes.map((type) => (
                    <DropdownMenuItem
                        key={type.id}
                        onClick={() => {
                            onTaskTypeChange(type.value);
                            onNewTask();
                        }}
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