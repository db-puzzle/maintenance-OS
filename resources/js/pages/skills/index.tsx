import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityPagination } from '@/components/shared/EntityPagination';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import SkillSheet from '@/components/skills/SkillSheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnConfig } from '@/types/shared';
import { Plus, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Skill {
    id: number;
    name: string;
    description: string | null;
    category: string;
    active: boolean;
    users_count: number;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    skills: {
        data: Skill[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        active?: string;
    };
    can: {
        create: boolean;
    };
}

export default function SkillsIndex({ skills, filters, can }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [activeFilter, setActiveFilter] = useState(filters.active || '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const [deleteSkill, setDeleteSkill] = useState<Skill | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<any>(null);
    const [dependenciesOpen, setDependenciesOpen] = useState(false);

    const { delete: destroy } = useForm();

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(route('skills.index'), { search: value, active: activeFilter }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleActiveFilter = (value: string) => {
        setActiveFilter(value);
        router.get(route('skills.index'), { search, active: value }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleEdit = (skill: Skill) => {
        setEditingSkill(skill);
        setCreateOpen(true);
    };

    const handleDelete = async (skill: Skill) => {
        setDeleteSkill(skill);
        
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
        if (deleteSkill) {
            destroy(route('skills.destroy', deleteSkill.id), {
                onFinish: () => {
                    setDeleteDialogOpen(false);
                    setDeleteSkill(null);
                },
            });
        }
    };

    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            render: (value, row) => {
                const skill = row as Skill;
                return (
                    <div className="font-medium">
                        {skill.name}
                        {skill.active ? (
                            <Badge variant="success" className="ml-2">Ativa</Badge>
                        ) : (
                            <Badge variant="secondary" className="ml-2">Inativa</Badge>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'category',
            label: 'Categoria',
            sortable: true,
            render: (value) => (
                <Badge variant="outline">{value}</Badge>
            ),
        },
        {
            key: 'description',
            label: 'Descrição',
            render: (value) => value || '-',
        },
        {
            key: 'users_count',
            label: 'Usuários',
            width: 'w-24',
            headerAlign: 'center',
            render: (value) => (
                <div className="text-center">{value}</div>
            ),
        },
        {
            key: 'created_at',
            label: 'Criado em',
            width: 'w-40',
            sortable: true,
        },
    ];

    const actions = (row: Record<string, unknown>) => {
        const skill = row as Skill;
        return (
            <EntityActionDropdown
                viewUrl={route('skills.show', skill.id)}
                onEdit={() => handleEdit(skill)}
                onDelete={() => handleDelete(skill)}
                canView={true}
                canEdit={can.create}
                canDelete={can.create}
            />
        );
    };

    return (
        <AppLayout title="Habilidades">
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Habilidades</CardTitle>
                                    <CardDescription>
                                        Gerencie as habilidades disponíveis no sistema
                                    </CardDescription>
                                </div>
                                {can.create && (
                                    <Button onClick={() => setCreateOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nova Habilidade
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar habilidades..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={activeFilter} onValueChange={handleActiveFilter}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Todos</SelectItem>
                                        <SelectItem value="1">Ativas</SelectItem>
                                        <SelectItem value="0">Inativas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <EntityDataTable
                                data={skills.data}
                                columns={columns}
                                actions={actions}
                                emptyMessage="Nenhuma habilidade encontrada"
                            />

                            <div className="mt-4">
                                <EntityPagination
                                    pagination={skills}
                                    onPageChange={(page) => {
                                        router.get(route('skills.index'), { ...filters, page }, {
                                            preserveState: true,
                                            preserveScroll: true,
                                        });
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <SkillSheet
                open={createOpen}
                onOpenChange={setCreateOpen}
                skill={editingSkill}
                onClose={() => {
                    setCreateOpen(false);
                    setEditingSkill(null);
                }}
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
                description={`Tem certeza que deseja excluir a habilidade "${deleteSkill?.name}"? Esta ação não pode ser desfeita.`}
            />
        </AppLayout>
    );
}