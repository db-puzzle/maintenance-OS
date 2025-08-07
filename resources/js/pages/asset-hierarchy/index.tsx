import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, ChevronRight, Clock, Factory, Layers, MapPin, Package } from 'lucide-react';
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Hierarquia de Ativos',
        href: '/asset-hierarchy',
    },
];
interface NavigationCard {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
}
const navigationCards: NavigationCard[] = [
    {
        title: 'Plantas',
        description: 'Gerencie as plantas do sistema',
        href: '/asset-hierarchy/plants',
        icon: Building2,
    },
    {
        title: 'Áreas',
        description: 'Gerencie as áreas do sistema',
        href: '/asset-hierarchy/areas',
        icon: MapPin,
    },
    {
        title: 'Setores',
        description: 'Gerencie os setores do sistema',
        href: '/asset-hierarchy/sectors',
        icon: Layers,
    },
    {
        title: 'Tipos de Ativo',
        description: 'Gerencie os tipos de ativo do sistema',
        href: '/asset-hierarchy/asset-types',
        icon: Package,
    },
    {
        title: 'Fabricantes',
        description: 'Gerencie os fabricantes de ativos',
        href: '/asset-hierarchy/manufacturers',
        icon: Factory,
    },
    {
        title: 'Turnos',
        description: 'Gerencie os turnos de trabalho',
        href: '/asset-hierarchy/shifts',
        icon: Clock,
    },
];
export default function AssetHierarchyIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hierarquia de Ativos" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header Section */}
                <div>
                    <h2 className="text-foreground mb-6 text-xl font-semibold">Hierarquia de Ativos</h2>
                    {/* Main Navigation Cards */}
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {navigationCards.map((card) => {
                            const IconComponent = card.icon;
                            return (
                                <button
                                    key={card.href}
                                    onClick={() => router.visit(card.href)}
                                    className="bg-card border-border group hover:bg-input-focus hover:ring-ring/10 hover:border-ring rounded-xl border p-6 text-left transition-all duration-200 hover:ring-[1px]"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="bg-muted text-muted-foreground rounded-lg p-3">
                                            <IconComponent size={24} />
                                        </div>
                                        <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors" size={20} />
                                    </div>
                                    <h3 className="text-foreground mb-2 font-semibold">{card.title}</h3>
                                    <p className="text-muted-foreground mb-3 text-sm">{card.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
