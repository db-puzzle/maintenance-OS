import React, { useState } from 'react';
import { Calendar, Settings, Building, Play, Plus, RotateCcw, AlertTriangle, Edit, Building2, Factory, MapPin, Layers, Clock, ChevronRight, ClipboardList } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

interface ActionItem {
    name: string;
    icon: any;
    isDefault?: boolean;
    description: string;
    href?: string;
}

interface PathItem {
    title: string;
    icon: any;
    description: string;
    actions: ActionItem[];
}

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
                    isDefault: true,
                    description: 'Agendar e organizar execuções de manutenção'
                },
                { 
                    name: 'Executar Tarefa', 
                    icon: Play,
                    description: 'Executar tarefas de manutenção programadas'
                },
                { 
                    name: 'Criar Novo Plano', 
                    icon: Plus,
                    description: 'Configurar novos planos de manutenção preventiva'
                }
            ]
        },
        equipment: {
            title: 'Equipamentos',
            icon: Settings,
            description: 'Gestão de ativos',
            actions: [
                { 
                    name: 'Executar Rotina', 
                    icon: RotateCcw, 
                    isDefault: true,
                    description: 'Executar rotinas de manutenção'
                },
                { 
                    name: 'Reportar Problema', 
                    icon: AlertTriangle,
                    description: 'Relatar problemas e falhas em equipamentos'
                },
                { 
                    name: 'Editar Equipamento', 
                    icon: Edit,
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
                    isDefault: true,
                    description: 'Gerenciar informações das empresas'
                },
                { 
                    name: 'Plantas', 
                    icon: Factory,
                    description: 'Configurar e organizar plantas industriais'
                },
                { 
                    name: 'Áreas', 
                    icon: MapPin,
                    description: 'Definir e gerenciar áreas operacionais'
                },
                { 
                    name: 'Setores', 
                    icon: Layers,
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

    const handleQuickStart = (pathKey: keyof typeof paths) => {
        const defaultAction = paths[pathKey].actions.find(action => action.isDefault);
        if (defaultAction) {
            handleActionClick(pathKey, defaultAction.name);
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
                        {/* Chart 1 - Equipamentos por Status */}
                        <div className="bg-card border-border border rounded-xl p-6">
                            <div className="mb-4">
                                <h3 className="font-semibold text-foreground mb-2">Equipamentos por Status</h3>
                                <p className="text-sm text-muted-foreground">Distribuição dos equipamentos por status operacional</p>
                            </div>
                            <div className="bg-muted rounded-lg h-48 flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Gráfico de Donut - Status dos Equipamentos</p>
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

                {/* Detailed Actions Section */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Atalhos</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {Object.entries(paths).map(([key, path]) => {
                            const IconComponent = path.icon;
                            return (
                                <div key={key} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                                    {/* Path Header */}
                                    <div className="bg-muted p-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-background p-2 rounded-lg">
                                                <IconComponent size={28} className="text-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-semibold text-foreground">{path.title}</h3>
                                                <p className="text-muted-foreground text-sm">{path.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions List */}
                                    <div className="p-6">
                                        <div className="space-y-3">
                                            {path.actions.map((action, index) => {
                                                const ActionIcon = action.icon;
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleActionClick(key, action.name)}
                                                        className="w-full flex items-start space-x-3 p-4 rounded-lg hover:bg-input-focus hover:ring-ring/10 hover:ring-[1px] hover:border-ring transition-colors text-left group"
                                                    >
                                                        <div className="text-muted-foreground group-hover:text-foreground mt-0.5">
                                                            <ActionIcon size={20} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2">
                                                                <h4 className="font-medium text-foreground group-hover:text-foreground">
                                                                    {action.name}
                                                                </h4>
                                                                {action.isDefault && (
                                                                    <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                                                        Padrão
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                                                        </div>
                                                        <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors mt-1" size={16} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center text-muted-foreground text-sm">
                    <p>Sistema de Gestão de Manutenção - Para suporte técnico, entre em contato com a equipe de TI.</p>
                </div>
            </div>
        </AppLayout>
    );
}
