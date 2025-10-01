import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    SquarePen,
    ChartGantt,
    Factory,
    Building2,
    UsersRound,
    FileText,
    Package,
    BarChart3,
    Route,
    Wrench,
    Calendar,
    Target,
    Users,
    Shield,
    FileSearch,
    Settings,
    Building,
    MapPin,
    Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
];

interface SectionCard {
    title: string;
    description: string;
    href: string;
    icon?: React.ElementType;
}

interface Section {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    cards: SectionCard[];
}

export default function Dashboard() {
    // Define sections based on non-commented items from app-sidebar
    const sections: Section[] = [
        {
            title: 'Cadastro',
            subtitle: 'Gerencie todos os cadastros do sistema',
            icon: SquarePen,
            cards: [
                {
                    title: 'Itens',
                    description: 'Cadastre e gerencie itens de produção',
                    href: '/production/items',
                    icon: Package,
                },
                {
                    title: 'BOMs',
                    description: 'Estruturas de produtos e listas de materiais',
                    href: '/production/bom',
                    icon: FileText,
                },
                {
                    title: 'Categorias de Itens',
                    description: 'Organize itens em categorias',
                    href: '/production/categories',
                    icon: BarChart3,
                },
                {
                    title: 'Fabricantes',
                    description: 'Cadastro de fabricantes e fornecedores',
                    href: '/asset-hierarchy/manufacturers',
                    icon: Building,
                },
            ],
        },
        {
            title: 'Planejamento',
            subtitle: 'Planeje e organize a produção',
            icon: ChartGantt,
            cards: [
                {
                    title: 'Ordens de Manufatura',
                    description: 'Crie e gerencie ordens de produção',
                    href: '/production/orders',
                    icon: FileText,
                },
                {
                    title: 'Planejamento de Ordens',
                    description: 'Planeje e sequencie ordens',
                    href: '/production/planning',
                    icon: Target,
                },
                {
                    title: 'Templates de Rotas',
                    description: 'Defina rotas de produção padrão',
                    href: '/production/routing',
                    icon: Route,
                },
                {
                    title: 'Células de Trabalho',
                    description: 'Configure células produtivas',
                    href: '/production/work-cells',
                    icon: Wrench,
                },
                {
                    title: 'Programação',
                    description: 'Agende e visualize a produção',
                    href: '/production/scheduler',
                    icon: Calendar,
                },
                {
                    title: 'Programação 2',
                    description: 'Nova interface de programação',
                    href: '/production/scheduler/v2',
                    icon: Calendar,
                },
            ],
        },
        {
            title: 'Produção',
            subtitle: 'Acompanhe a produção em tempo real',
            icon: Factory,
            cards: [
                {
                    title: 'Apontamento',
                    description: 'Registre apontamentos de produção',
                    href: '/production/reporting',
                    icon: FileSearch,
                },
            ],
        },
        {
            title: 'Organização',
            subtitle: 'Estruture sua empresa',
            icon: Building2,
            cards: [
                {
                    title: 'Plantas',
                    description: 'Gerencie unidades fabris',
                    href: '/asset-hierarchy/plants',
                    icon: Building,
                },
                {
                    title: 'Áreas',
                    description: 'Defina áreas operacionais',
                    href: '/asset-hierarchy/areas',
                    icon: MapPin,
                },
                {
                    title: 'Setores',
                    description: 'Configure setores produtivos',
                    href: '/asset-hierarchy/sectors',
                    icon: Settings,
                },
                {
                    title: 'Células de Trabalho',
                    description: 'Organize células de produção',
                    href: '/production/work-cells',
                    icon: Wrench,
                },
                {
                    title: 'Turnos',
                    description: 'Configure turnos de trabalho',
                    href: '/asset-hierarchy/shifts',
                    icon: Clock,
                },
            ],
        },
        {
            title: 'Usuários & Permissões',
            subtitle: 'Controle de acesso e segurança',
            icon: UsersRound,
            cards: [
                {
                    title: 'Usuários',
                    description: 'Gerencie usuários do sistema',
                    href: '/users',
                    icon: Users,
                },
                {
                    title: 'Convites',
                    description: 'Envie convites para novos usuários',
                    href: '/invitations',
                    icon: Users,
                },
                {
                    title: 'Funções',
                    description: 'Configure perfis de acesso',
                    href: '/settings/roles',
                    icon: Shield,
                },
                {
                    title: 'Logs de Auditoria',
                    description: 'Acompanhe atividades do sistema',
                    href: '/audit-logs',
                    icon: FileSearch,
                },
            ],
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Home" />
            <ScrollArea className="h-full bg-sidebar-accent/30">
                <div className="flex flex-col gap-8 p-8">

                    {/* Sections */}
                    <div className="pt-4 pb-20 space-y-18">
                        {sections.map((section, sectionIndex) => {
                            const SectionIcon = section.icon;
                            return (
                                <div key={sectionIndex} className="flex justify-center">
                                    <div className="flex flex-col md:flex-row gap-8 items-start">
                                        {/* Section Header - Anchored to left of cards */}
                                        <div className="flex-shrink-0 md:w-64">
                                            <div className="flex flex-col items-start">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 mb-4">
                                                    <SectionIcon className="h-7 w-7 text-primary" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                                                <p className="text-sm text-muted-foreground mt-1">{section.subtitle}</p>

                                                {/* CTA Buttons for Cadastro section */}
                                                {section.title === 'Cadastro' && (
                                                    <div className="flex gap-2 mt-4">
                                                        <Button asChild size="sm" variant='default' className="w-28">
                                                            <Link href="/production/items/create">
                                                                Criar Itens
                                                            </Link>
                                                        </Button>
                                                        <Button asChild size="sm" variant="outline" className="w-28">
                                                            <Link href="/production/bom/create">
                                                                Criar BOM's
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* CTA Buttons for Planejamento section */}
                                                {section.title === 'Planejamento' && (
                                                    <div className="flex gap-2 mt-4">
                                                        <Button asChild size="sm" className="w-28">
                                                            <Link href={`${route('production.orders.index')}?create=1`}>
                                                                Criar OM
                                                            </Link>
                                                        </Button>
                                                        <Button asChild size="sm" variant="outline" className="w-28">
                                                            <Link href={route('production.planning.index')}>
                                                                Planejar OM
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cards Grid */}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            {section.cards.map((card, cardIndex) => {
                                                const CardIcon = card.icon;
                                                return (
                                                    <Link
                                                        key={cardIndex}
                                                        href={card.href}
                                                        className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 w-64"
                                                    >
                                                        {/* Icon at top left */}
                                                        <div className="mb-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">
                                                                {CardIcon && <CardIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                                                            </div>
                                                        </div>

                                                        {/* Title left-aligned */}
                                                        <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors mb-1">
                                                            {card.title}
                                                        </h3>

                                                        {/* Description left-aligned */}
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {card.description}
                                                        </p>

                                                        {/* Subtle gradient overlay on hover */}
                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </ScrollArea>
        </AppLayout>
    );
}
