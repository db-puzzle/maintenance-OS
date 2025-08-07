import { ColumnVisibility } from '@/components/data-table';
import { EntityActionDropdown } from '@/components/shared/EntityActionDropdown';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { EntityPagination } from '@/components/shared/EntityPagination';
import SkillSheet from '@/components/skills/SkillSheet';
import { Badge } from '@/components/ui/badge';
import { useEntityOperations } from '@/hooks/useEntityOperations';
import { useSorting } from '@/hooks/useSorting';
import AppLayout from '@/layouts/app-layout';
import { ListLayout } from '@/layouts/asset-hierarchy/list-layout';
import { type BreadcrumbItem } from '@/types';
import { ColumnConfig } from '@/types/shared';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;
interface Skill {
    id: number;
    name: string;
    description: string | null;
    category: string;
    users_count: number;
    created_at: string;
    updated_at: string;
}
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Habilidades',
        href: '/skills',
    },
];
interface Props {
    skills: {
        data: Skill[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search: string;
        sort: string;
        direction: 'asc' | 'desc';
        per_page: number;
    };
    can: {
        create: boolean;
    };
}
export default function SkillsIndex({ skills: initialSkills, filters, can }: Props) {
    const entityOps = useEntityOperations<Skill>({
        entityName: 'skill',
        entityLabel: 'Habilidade',
        routes: {
            index: 'skills.index',
            show: 'skills.show',
            destroy: 'skills.destroy',
            checkDependencies: 'skills.check-dependencies',
        },
    });
    const [search, setSearch] = useState(filters.search);
    // Use centralized sorting hook
    const sortingResult = useSorting({
        routeName: 'skills.index',
        initialSort: filters.sort || 'name',
        initialDirection: filters.direction || 'asc',
        additionalParams: {
            search,
            per_page: filters.per_page,
        },
    });
    const sortColumn = sortingResult.sort;
    const sortDirection = sortingResult.direction;
    const handleSort = sortingResult.handleSort;
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('skillsColumnsVisibility');
            if (savedVisibility) {
                return JSON.parse(savedVisibility);
            }
        }
        return {
            name: true,
            category: true,
            users_count: true,
        };
    });
    // Use data from server - cast to Record<string, unknown>[] for EntityDataTable
    const data = initialSkills.data as unknown as Record<string, unknown>[];
    const pagination = {
        current_page: initialSkills.current_page,
        last_page: initialSkills.last_page,
        per_page: initialSkills.per_page,
        total: initialSkills.total,
        from: initialSkills.from,
        to: initialSkills.to,
    };
    const columns: ColumnConfig[] = [
        {
            key: 'name',
            label: 'Nome',
            sortable: true,
            width: 'w-[300px]',
            render: (value, row) => {
                const skill = row as unknown as Skill;
                return (
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            {skill.name}
                        </div>
                        {skill.description && <div className="text-muted-foreground text-sm">{skill.description}</div>}
                    </div>
                );
            },
        },
        {
            key: 'category',
            label: 'Categoria',
            sortable: true,
            width: 'w-[150px]',
            render: (value) => (
                <Badge variant="outline">{value as string}</Badge>
            ),
        },
        {
            key: 'users_count',
            label: 'Usuários',
            sortable: true,
            width: 'w-[100px]',
            headerAlign: 'center',
            render: (value) => (
                <div className="text-center">{value as number}</div>
            ),
        },
    ];
    const handleColumnVisibilityChange = (columnId: string, value: boolean) => {
        const newVisibility = {
            ...columnVisibility,
            [columnId]: value,
        };
        setColumnVisibility(newVisibility);
        localStorage.setItem('skillsColumnsVisibility', JSON.stringify(newVisibility));
    };
    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            route('skills.index'),
            { search: value, sort: sortColumn, direction: sortDirection, per_page: filters.per_page || 10 },
            { preserveState: true, preserveScroll: true },
        );
    };
    const handlePageChange = (page: number) => {
        router.get(
            route('skills.index'),
            { ...filters, search, sort: sortColumn, direction: sortDirection, page },
            { preserveState: true, preserveScroll: true }
        );
    };
    const handlePerPageChange = (perPage: number) => {
        router.get(
            route('skills.index'),
            { ...filters, search, sort: sortColumn, direction: sortDirection, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Habilidades" />
            <ListLayout
                title="Habilidades"
                description="Gerencie as habilidades disponíveis no sistema"
                searchValue={search}
                onSearchChange={handleSearch}
                onCreateClick={can.create ? () => entityOps.setEditSheetOpen(true) : undefined}
                createButtonText="Nova Habilidade"
                actions={
                    <div className="flex items-center gap-2">
                        <ColumnVisibility
                            columns={columns.map((col) => ({
                                id: col.key,
                                header: col.label,
                                cell: () => null,
                                width: 'w-auto',
                            }))}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={handleColumnVisibilityChange}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <EntityDataTable
                        data={data}
                        columns={columns}
                        loading={false}
                        onRowClick={(skill) => router.visit(route('skills.show', { id: (skill as unknown as Skill).id }))}
                        columnVisibility={columnVisibility}
                        onSort={handleSort}
                        actions={(skill) => (
                            <EntityActionDropdown
                                onEdit={can.create ? () => entityOps.handleEdit(skill as unknown as Skill) : undefined}
                                onDelete={can.create ? () => entityOps.handleDelete(skill as unknown as Skill) : undefined}
                            />
                        )}
                        emptyMessage="Nenhuma habilidade encontrada"
                    />
                    <EntityPagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onPerPageChange={handlePerPageChange}
                    />
                </div>
            </ListLayout>
            <SkillSheet
                open={entityOps.isEditSheetOpen}
                onOpenChange={entityOps.setEditSheetOpen}
                skill={entityOps.editingItem || undefined}
                onClose={() => {
                    entityOps.setEditSheetOpen(false);
                }}
            />
            <EntityDeleteDialog
                open={entityOps.isDeleteDialogOpen}
                onOpenChange={entityOps.setDeleteDialogOpen}
                entityLabel={entityOps.deletingItem?.name || ''}
                onConfirm={entityOps.confirmDelete}
            />
            <EntityDependenciesDialog
                open={entityOps.isDependenciesDialogOpen}
                onOpenChange={entityOps.setDependenciesDialogOpen}
                entityName="habilidade"
                dependencies={entityOps.dependencies}
            />
        </AppLayout>
    );
}