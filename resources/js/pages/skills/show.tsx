import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import ShowLayout from '@/layouts/show-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import SkillSheet from '@/components/skills/SkillSheet';
import { ColumnConfig } from '@/types/shared';
import { Edit, Trash2, User, Calendar, Tag } from 'lucide-react';

interface SkillUser {
    id: number;
    name: string;
    email: string;
    proficiency_level: string | null;
}

interface Skill {
    id: number;
    name: string;
    description: string | null;
    category: string;
    active: boolean;
    created_at: string;
    updated_at: string;
    users: SkillUser[];
}

interface PageProps {
    skill: Skill;
    can: {
        update: boolean;
        delete: boolean;
    };
}

export default function SkillShow({ skill, can }: PageProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<any>(null);
    const [dependenciesOpen, setDependenciesOpen] = useState(false);

    const { delete: destroy } = useForm();

    const handleDelete = async () => {
        // Check dependencies first
        const response = await fetch(route('skills.check-dependencies', skill.id));
        const data = await response.json();
        
        if (!data.canDelete) {
            setDependencies(data);
            setDependenciesOpen(true);
        } else {
            setDeleteDialogOpen(true);
        }
    };

    const confirmDelete = () => {
        destroy(route('skills.destroy', skill.id));
    };

    const proficiencyLabels: Record<string, string> = {
        'beginner': 'Iniciante',
        'intermediate': 'Intermediário',
        'advanced': 'Avançado',
        'expert': 'Especialista',
    };

    const proficiencyVariants: Record<string, 'secondary' | 'default' | 'success' | 'warning'> = {
        'beginner': 'secondary',
        'intermediate': 'default',
        'advanced': 'warning',
        'expert': 'success',
    };

    const userColumns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            render: (value, row) => {
                const user = row as SkillUser;
                return (
                    <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                );
            },
        },
        {
            key: 'proficiency_level',
            label: 'Nível de Proficiência',
            width: 'w-48',
            render: (value) => {
                const level = value as string | null;
                if (!level) return '-';
                return (
                    <Badge variant={proficiencyVariants[level] || 'default'}>
                        {proficiencyLabels[level] || level}
                    </Badge>
                );
            },
        },
    ];

    const detailItems = [
        {
            label: 'Categoria',
            value: <Badge variant="outline">{skill.category}</Badge>,
            icon: Tag,
        },
        {
            label: 'Status',
            value: skill.active ? (
                <Badge variant="success">Ativa</Badge>
            ) : (
                <Badge variant="secondary">Inativa</Badge>
            ),
        },
        {
            label: 'Criado em',
            value: skill.created_at,
            icon: Calendar,
        },
        {
            label: 'Atualizado em',
            value: skill.updated_at,
            icon: Calendar,
        },
    ];

    const breadcrumbs = [
        { label: 'Habilidades', href: route('skills.index') },
        { label: skill.name },
    ];

    const actions = (
        <>
            {can.update && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Button>
            )}
            {can.delete && (
                <Button variant="outline" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </Button>
            )}
        </>
    );

    return (
        <ShowLayout
            title={skill.name}
            subtitle={skill.description || 'Sem descrição'}
            breadcrumbs={breadcrumbs}
            actions={actions}
            detailItems={detailItems}
        >
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Usuários com esta habilidade</CardTitle>
                            <CardDescription>
                                {skill.users.length} {skill.users.length === 1 ? 'usuário' : 'usuários'} possuem esta habilidade
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {skill.users.length > 0 ? (
                        <EntityDataTable
                            data={skill.users}
                            columns={userColumns}
                            emptyMessage="Nenhum usuário possui esta habilidade"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <User className="mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-lg font-medium">Nenhum usuário possui esta habilidade</p>
                            <p className="text-sm text-muted-foreground">
                                Os usuários podem adicionar esta habilidade em seus perfis
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <SkillSheet
                open={editOpen}
                onOpenChange={setEditOpen}
                skill={skill}
                onClose={() => setEditOpen(false)}
            />

            {dependencies && (
                <EntityDependenciesDialog
                    open={dependenciesOpen}
                    onOpenChange={setDependenciesOpen}
                    entityName="habilidade"
                    dependencies={dependencies}
                />
            )}

            <EntityDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                title="Excluir Habilidade"
                description={`Tem certeza que deseja excluir a habilidade "${skill.name}"? Esta ação não pode ser desfeita.`}
            />
        </ShowLayout>
    );
}