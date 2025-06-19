import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Boxes,
    ChevronRight,
    Route,
    History,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
];

export default function Dashboard() {
    // Cards para a seção Quick Start (parte superior)
    const quickStartCards = {
        assets: {
            title: 'Ativos',
            icon: Boxes,
            description: 'Cadastro e gestão de ativos',
            href: '/asset-hierarchy/assets',
        },
        hierarchy: {
            title: 'Hierarquia de Ativos',
            icon: Route,
            description: 'Estrutura e organização de ativos',
            href: '/asset-hierarchy',
        },
        executionHistory: {
            title: 'Histórico de Execuções',
            icon: History,
            description: 'Visualize e analise execuções de rotinas',
            href: '/maintenance/executions/history',
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
                                    onClick={() => card.href && router.visit(card.href)}
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
                {/* <ActionShortcuts paths={paths} /> */}

                {/* Footer Info */}
                {/* <div className="text-muted-foreground mt-12 text-center text-sm">
                    <p>Precisa de ajuda? Entre em contato com o administrador do sistema ou consulte a documentação.</p>
                </div> */}
            </div>
        </AppLayout>
    );
}
