import React from 'react';
import { router, Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { Badge } from '@/components/ui/badge';
import { EntityDataTable } from '@/components/shared/EntityDataTable';
import SkillFormComponent from '@/components/skills/SkillFormComponent';
import { ColumnConfig } from '@/types/shared';
import { User, Tag, Users } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
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
    activeTab?: string;
}
export default function SkillShow({ skill, can, activeTab = 'informacoes' }: PageProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Habilidades',
            href: '/skills',
        },
        {
            title: skill.name,
            href: '#',
        },
    ];
    const handleEditSuccess = () => {
        // Reload the page to refresh the data
        router.reload();
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
                const user = row as unknown as SkillUser;
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
    const subtitle = (
        <span className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>{skill.category}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{skill.users.length} {skill.users.length === 1 ? 'usuário' : 'usuários'}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
                {skill.active ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ativa</Badge>
                ) : (
                    <Badge variant="secondary">Inativa</Badge>
                )}
            </span>
        </span>
    );
    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="py-8">
                    <SkillFormComponent
                        skill={skill}
                        initialMode="view"
                        onSuccess={handleEditSuccess}
                        canUpdate={can.update}
                        canDelete={can.delete}
                    />
                </div>
            ),
        },
        {
            id: 'usuarios',
            label: 'Usuários',
            content: (
                <div className="mt-4 space-y-4">
                    {skill.users.length > 0 ? (
                        <EntityDataTable
                            data={skill.users as unknown as Record<string, unknown>[]}
                            columns={userColumns}
                            emptyMessage="Nenhum usuário possui esta habilidade"
                            onRowClick={(row) => router.get(route('users.show', (row as unknown as SkillUser).id))}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <User className="mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-lg font-medium">Nenhum usuário possui esta habilidade</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Os usuários podem adicionar esta habilidade em seus perfis
                            </p>
                        </div>
                    )}
                </div>
            ),
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Habilidade ${skill.name}`} />
            <ShowLayout
                title={skill.name}
                subtitle={subtitle}
                editRoute=""
                tabs={tabs}
                defaultActiveTab={activeTab}
            />
        </AppLayout>
    );
}