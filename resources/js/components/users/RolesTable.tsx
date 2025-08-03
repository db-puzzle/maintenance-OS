import React from 'react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { Button } from '@/components/ui/button';
import { Trash2, Shield } from 'lucide-react';
interface Role {
    id: number;
    name: string;
}
interface RolesTableProps {
    selectedRoles: Role[];
    isViewMode: boolean;
    onRemoveRole: (roleId: number) => void;
}
export default function RolesTable({
    selectedRoles,
    isViewMode,
    onRemoveRole
}: RolesTableProps) {
    // Define columns for the roles table
    const rolesColumns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Função',
            render: (value, row) => {
                const role = row as unknown as Role;
                return (
                    <span className="text-sm">{role.name}</span>
                );
            },
        },
    ];
    // Actions for each row (remove button)
    const rolesActions = !isViewMode ? (row: Record<string, unknown>) => {
        const role = row as unknown as Role;
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveRole(role.id)}
                className="h-8 w-8 p-0"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        );
    } : undefined;
    if (selectedRoles.length > 0) {
        return (
            <div className="[&_td]:py-1 [&_td]:text-sm [&_th]:py-1.5 [&_th]:text-sm">
                <EntityDataTable
                    data={selectedRoles as any[]}
                    columns={rolesColumns}
                    actions={rolesActions}
                    emptyMessage="Nenhuma função selecionada"
                />
            </div>
        );
    }
    return (
        <div className="text-center py-4 text-muted-foreground border rounded-lg min-h-[60px] flex flex-col justify-center">
            <Shield className="h-6 w-6 mx-auto mb-1" />
            <p className="text-sm">Nenhuma função atribuída</p>
        </div>
    );
} 