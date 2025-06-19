import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Trash } from 'lucide-react';
import React, { useState } from 'react';

interface EntityActionDropdownProps {
    onEdit?: () => void;
    onDelete?: () => void;
    additionalActions?: Array<{
        label: string;
        icon?: React.ReactNode;
        onClick: () => void;
    }>;
}

export function EntityActionDropdown({ onEdit, onDelete, additionalActions = [] }: EntityActionDropdownProps) {
    const [open, setOpen] = useState(false);

    const handleAction = (action: () => void) => {
        // Close the dropdown first
        setOpen(false);
        // Execute the action after a small delay to ensure dropdown is closed
        setTimeout(action, 100);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {onEdit && (
                    <DropdownMenuItem onClick={() => handleAction(onEdit)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                )}
                {additionalActions.map((action, index) => (
                    <DropdownMenuItem key={index} onClick={() => handleAction(action.onClick)}>
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                    </DropdownMenuItem>
                ))}
                {onDelete && (
                    <DropdownMenuItem onClick={() => handleAction(onDelete)} className="text-destructive focus:text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
