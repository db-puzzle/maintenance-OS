import React, { useState } from 'react';
import { Package, Shield, Wrench, Calendar, FileText, BarChart3, ClipboardList, Eye, Plus, Settings, Building, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
];

export default function Dashboard() {
    const [selectedPath, setSelectedPath] = useState(null);

    const paths = {
        production: {
            title: 'Produção',
            icon: Package,
            description: 'Gerenciar cronogramas de produção e BOMs',
            actions: [
                { 
                    name: 'Criar Novo Cronograma de Produção', 
                    icon: Calendar, 
                    isDefault: true,
                    description: 'Agendar novas execuções de produção e alocar recursos'
                },
                { 
                    name: 'Configurar BOM', 
                    icon: FileText,
                    description: 'Configurar Lista de Materiais para produtos'
                },
                { 
                    name: 'Atualizar Cronograma Existente', 
                    icon: BarChart3,
                    description: 'Modificar cronogramas de produção atuais'
                }
            ]
        },
        quality: {
            title: 'Qualidade',
            icon: Shield,
            description: 'Controle de qualidade e gestão de inspeções',
            actions: [
                { 
                    name: 'Executar Inspeção', 
                    icon: ClipboardList, 
                    isDefault: true,
                    description: 'Realizar inspeções de qualidade e registrar resultados'
                },
                { 
                    name: 'Revisar Resultados de Inspeção', 
                    icon: Eye,
                    description: 'Analisar dados e tendências de inspeção'
                },
                { 
                    name: 'Criar Novo Formulário de Inspeção', 
                    icon: Plus,
                    description: 'Projetar templates de inspeção personalizados'
                }
            ]
        },
        maintenance: {
            title: 'Manutenção',
            icon: Wrench,
            description: 'Manutenção de equipamentos e gestão de ativos',
            actions: [
                { 
                    name: 'Gerenciar Planos de Manutenção', 
                    icon: Settings, 
                    isDefault: true,
                    description: 'Visualizar e atualizar cronogramas de manutenção'
                },
                { 
                    name: 'Criar Novo Plano de Manutenção', 
                    icon: Plus,
                    description: 'Configurar cronogramas de manutenção preventiva'
                },
                { 
                    name: 'Configurar Hierarquia de Ativos', 
                    icon: Building,
                    description: 'Organizar estrutura de equipamentos e ativos'
                }
            ]
        }
    };

    const handleActionClick = (pathKey: string, actionName: string) => {
        console.log(`Navegando para: ${pathKey} - ${actionName}`);
        
        // Navegação específica para manutenção
        if (pathKey === 'maintenance') {
            router.visit('/maintenance/dashboard');
            return;
        }
        
        // Aqui você normalmente navegaria para a página específica
    };

    const handleQuickStart = (pathKey: keyof typeof paths) => {
        // Para manutenção, vá direto para o dashboard
        if (pathKey === 'maintenance') {
            router.visit('/maintenance/dashboard');
            return;
        }
        
        const defaultAction = paths[pathKey].actions.find(action => action.isDefault);
        if (defaultAction) {
            handleActionClick(pathKey, defaultAction.name);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">

                {/* Quick Start Section */}
                <div>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Home</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.entries(paths).map(([key, path]) => {
                            const IconComponent = path.icon;
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleQuickStart(key as keyof typeof paths)}
                                    className="bg-card border-border border rounded-xl p-6 text-left hover:bg-input-focus hover:ring-ring/10 hover:ring-[1px] hover:border-ring transition-all duration-200 group"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                                            <IconComponent size={24} />
                                        </div>
                                        <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors" size={20} />
                                    </div>
                                    <h3 className="font-semibold text-foreground mb-2">{path.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-3">{path.description}</p>
                                </button>
                            );
                        })}
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
                    <p>Precisa de ajuda? Entre em contato com o administrador do sistema ou consulte a documentação.</p>
                </div>
            </div>
        </AppLayout>
    );
}
