import React, { useState } from 'react';
import { Calendar, Settings, Building, Play, Plus, RotateCcw, AlertTriangle, Edit, Building2, Factory, MapPin, Layers, Clock, ClipboardList } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import ActionShortcuts, { type ActionItem, type PathItem } from '@/components/ActionShortcuts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Manutenção',
        href: '/maintenance/dashboard',
    },
];

export default function DashboardMaintenance() {
    const [selectedPath, setSelectedPath] = useState(null);

    const paths: Record<string, PathItem> = {
        maintenance_plans: {
            title: 'Planos de Manutenção',
            icon: ClipboardList,
            description: 'Gestão da manutenção preventiva',
            actions: [
                { 
                    name: 'Planejar Execução', 
                    icon: Calendar, 
                    comingSoon: true,
                    description: 'Agendar e organizar execuções de manutenção'
                },
                { 
                    name: 'Executar Tarefa', 
                    icon: Play,
                    comingSoon: true,
                    description: 'Executar tarefas de manutenção programadas'
                },
                { 
                    name: 'Criar Novo Plano', 
                    icon: Plus,
                    comingSoon: true,
                    description: 'Configurar novos planos de manutenção preventiva'
                }
            ]
        },
        asset: {
            title: 'Ativos',
            icon: Settings,
            description: 'Gestão de ativos',
            actions: [
                { 
                    name: 'Executar Rotina', 
                    icon: RotateCcw, 
                    comingSoon: true,
                    description: 'Executar rotinas de manutenção'
                },
                { 
                    name: 'Reportar Problema', 
                    icon: AlertTriangle,
                    comingSoon: true,
                    description: 'Relatar problemas e falhas em ativos'
                },
                { 
                    name: 'Editar Ativo', 
                    icon: Edit,
                    comingSoon: true,
                    description: 'Atualizar informações e configurações'
                },
                { 
                    name: 'Turnos', 
                    icon: Clock,
                    description: 'Configurar turnos de trabalho',
                    href: '/asset-hierarchy/shifts'
                }
            ]
        },
        asset_hierarchy: {
            title: 'Hierarquia de Ativos',
            icon: Building,
            description: 'Organizar estrutura dos ativos',
            actions: [
                { 
                    name: 'Empresas', 
                    icon: Building2, 
                    comingSoon: true,
                    description: 'Gerenciar informações das empresas'
                },
                { 
                    name: 'Plantas', 
                    icon: Factory,
                    comingSoon: true,
                    description: 'Configurar e organizar plantas industriais'
                },
                { 
                    name: 'Áreas', 
                    icon: MapPin,
                    comingSoon: true,
                    description: 'Definir e gerenciar áreas operacionais'
                },
                { 
                    name: 'Setores', 
                    icon: Layers,
                    comingSoon: true,
                    description: 'Organizar setores dentro das áreas'
                },
            ]
        }
    };

    const handleActionClick = (pathKey: string, actionName: string) => {
        const path = paths[pathKey as keyof typeof paths];
        const action = path.actions.find(a => a.name === actionName);
        
        if (action && action.href) {
            router.visit(action.href);
        } else {
            console.log(`Navegando para: ${pathKey} - ${actionName}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard - Manutenção" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">

                {/* Charts Section */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Dashboard de Manutenção</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Chart 1 - Ativos por Status */}
                        <div className="bg-card border-border border rounded-xl p-6">
                            <div className="mb-4">
                                <h3 className="font-semibold text-foreground mb-2">Ativos por Status</h3>
                                <p className="text-sm text-muted-foreground">Distribuição dos ativos por status operacional</p>
                            </div>
                            <div className="bg-muted rounded-lg h-48 flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Gráfico de Donut - Status dos Ativos</p>
                            </div>
                        </div>

                        {/* Chart 2 - Manutenções Mensais */}
                        <div className="bg-card border-border border rounded-xl p-6">
                            <div className="mb-4">
                                <h3 className="font-semibold text-foreground mb-2">Manutenções Mensais</h3>
                                <p className="text-sm text-muted-foreground">Histórico de manutenções realizadas nos últimos 12 meses</p>
                            </div>
                            <div className="bg-muted rounded-lg h-48 flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Gráfico de Barras - Manutenções por Mês</p>
                            </div>
                        </div>

                        {/* Chart 3 - Eficiência por Área */}
                        <div className="bg-card border-border border rounded-xl p-6">
                            <div className="mb-4">
                                <h3 className="font-semibold text-foreground mb-2">Eficiência por Área</h3>
                                <p className="text-sm text-muted-foreground">Indicadores de eficiência das diferentes áreas produtivas</p>
                            </div>
                            <div className="bg-muted rounded-lg h-48 flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Gráfico de Linha - Eficiência por Área</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ActionShortcuts Component */}
                <ActionShortcuts 
                    paths={paths}
                    onActionClick={handleActionClick}
                />

                {/* Footer Info */}
                <div className="mt-12 text-center text-muted-foreground text-sm">
                    <p>Sistema de Gestão de Manutenção - Para suporte técnico, entre em contato com a equipe de TI.</p>
                </div>
            </div>
        </AppLayout>
    );
}
