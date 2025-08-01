import React from 'react';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { ColumnConfig } from '@/types/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Wrench } from 'lucide-react';

interface Skill {
    id: number;
    name: string;
    description?: string | null;
    category: string;
}

interface SkillsTableProps {
    selectedSkills: Skill[];
    isViewMode: boolean;
    onRemoveSkill: (skillId: number) => void;
}

export function SkillsTable({
    selectedSkills,
    isViewMode,
    onRemoveSkill
}: SkillsTableProps) {



    // Define columns for the skills table
    const skillsColumns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Habilidade',
            render: (value, row) => {
                const skill = row as unknown as Skill;
                return (
                    <span className="text-sm font-medium">{skill.name}</span>
                );
            },
        },
        {
            key: 'category',
            label: 'Categoria',
            width: 'w-[200px]',
            render: (value, row) => {
                const skill = row as unknown as Skill;
                return (
                    <Badge variant="outline" className="text-xs">
                        {skill.category}
                    </Badge>
                );
            },
        },
    ];

    // Actions for each row (remove button)
    const skillsActions = !isViewMode ? (row: Record<string, unknown>) => {
        const skill = row as unknown as Skill;
        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSkill(skill.id)}
                className="h-8 w-8 p-0"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        );
    } : undefined;

    if (selectedSkills.length > 0) {
        return (
            <div className="[&_td]:py-1 [&_td]:text-sm [&_th]:py-1.5 [&_th]:text-sm">
                <EntityDataTable
                    data={selectedSkills as any[]}
                    columns={skillsColumns}
                    actions={skillsActions}
                    emptyMessage="Nenhuma habilidade selecionada"
                />
            </div>
        );
    }

    return (
        <div className="text-center py-4 text-muted-foreground border rounded-lg min-h-[60px] flex flex-col justify-center">
            <Wrench className="h-6 w-6 mx-auto mb-1" />
            <p className="text-sm">Nenhuma habilidade adicionada</p>
        </div>
    );
} 