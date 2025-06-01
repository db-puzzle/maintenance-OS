import ActionShortcuts, { type PathItem } from '@/components/ActionShortcuts';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Boxes,
    CalendarDays,
    ChevronRight,
    ClipboardCheck,
    ClipboardList,
    Clock,
    List,
    MessageSquare,
    Package,
    Play,
    RotateCcw,
    Route,
    Shield,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
];

export default function Dashboard() {
    const [selectedPath, setSelectedPath] = useState(null);

    // Cards para a seção Quick Start (parte superior)
    const quickStartCards = {
        production: {
            title: 'Produção',
            icon: Package,
            description: 'Gerenciar cronogramas de produção e BOMs',
            href: undefined, // Sem link direto
        },
        quality: {
            title: 'Qualidade',
            icon: Shield,
            description: 'Controle de qualidade e gestão de inspeções',
            href: undefined, // Sem link direto
        },
        maintenance: {
            title: 'Manutenção',
            icon: Wrench,
            description: 'Manutenção e gestão de ativos',
            href: '/maintenance/dashboard', // Link para o dashboard
        },
    };

    // Paths para os Action Shortcuts (parte inferior)
    const paths: Record<string, PathItem> = {
        production: {
            title: 'Produção',
            icon: Package,
            description: 'Gerenciar cronogramas de produção e BOMs',
            actions: [
                {
                    name: 'Programar Produção',
                    icon: CalendarDays,
                    comingSoon: true,
                    description: 'Scheduler de produção e alocação de recursos',
                },
                {
                    name: 'Configurar BOM',
                    icon: List,
                    comingSoon: true,
                    description: 'Lista de Materiais para produtos',
                },
                {
                    name: 'Configurar Rotas',
                    icon: Route,
                    comingSoon: true,
                    description: 'Sequencia de produção por produto',
                },
            ],
        },
        quality: {
            title: 'Qualidade',
            icon: Shield,
            description: 'Controle de qualidade e gestão de inspeções',
            actions: [
                {
                    name: 'Realizar Inspeção',
                    icon: ClipboardList,
                    comingSoon: true,
                    description: 'Registro de resultados',
                },
                {
                    name: 'Configurar Inspeção',
                    icon: ClipboardCheck,
                    comingSoon: true,
                    description: 'Criação de formulários e instruções',
                },
                {
                    name: 'Criar RNC',
                    icon: AlertTriangle,
                    comingSoon: true,
                    description: 'Relatórios de Não-Conformidade',
                },
                {
                    name: 'Criar Desvio',
                    icon: AlertCircle,
                    comingSoon: true,
                    description: 'Registro de desvios de qualidade',
                },
            ],
        },
        maintenance: {
            title: 'Manutenção',
            icon: Wrench,
            description: 'Manutenção e gestão de ativos',
            actions: [
                {
                    name: 'Configurar Ativos',
                    icon: Boxes,
                    description: 'Cadastro de ativos e ativos',
                    href: '/asset-hierarchy/assets',
                    newFeature: true,
                },
                {
                    name: 'Programar Manutenção',
                    icon: Clock,
                    comingSoon: true,
                    description: 'Cronogramas de manutenção',
                },
                {
                    name: 'Executar Ordem de Serviço',
                    icon: Play,
                    comingSoon: true,
                    description: 'Execução de manutenção',
                },
                {
                    name: 'Solicitar Manutenção',
                    icon: MessageSquare,
                    comingSoon: true,
                    description: 'Solicitação sobre ativos e ativos',
                },
            ],
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Quick Start Section */}
                <div>
                    <h2 className="text-foreground mb-6 text-xl font-semibold">Home</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {Object.entries(quickStartCards).map(([key, card]) => {
                            const IconComponent = card.icon;
                            const hasLink = !!card.href;

                            return (
                                <button
                                    key={key}
                                    onClick={() => (card.href ? router.visit(card.href) : console.log(`${key} não tem href`))}
                                    className={`bg-card border-border group rounded-xl border p-6 text-left transition-all duration-200 ${hasLink ? 'hover:bg-input-focus hover:ring-ring/10 hover:border-ring hover:ring-[1px]' : ''
                                        }`}
                                    disabled={!hasLink}
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="bg-muted text-muted-foreground rounded-lg p-3">
                                            <IconComponent size={24} />
                                        </div>
                                        {hasLink && (
                                            <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors" size={20} />
                                        )}
                                    </div>
                                    <h3 className="text-foreground mb-2 font-semibold">{card.title}</h3>
                                    <p className="text-muted-foreground mb-3 text-sm">{card.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ActionShortcuts Component */}
                <ActionShortcuts paths={paths} />

                {/* Footer Info */}
                <div className="text-muted-foreground mt-12 text-center text-sm">
                    <p>Precisa de ajuda? Entre em contato com o administrador do sistema ou consulte a documentação.</p>
                </div>
            </div>
        </AppLayout>
    );
}
