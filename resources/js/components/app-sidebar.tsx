import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { LayoutGrid, ClipboardList, Building2, Map, Factory, Wrench, FileDown, FileUp, Cog, ChartGantt } from 'lucide-react';
import AppLogo from './app-logo';

interface NavGroup {
    title: string;
    items: NavItem[];
}

const gerenciamentoNavItems: NavGroup = {
    title: '',
    items: [
        {
            title: 'Home',
            href: '/home',
            icon: LayoutGrid,
        },
        {
            title: 'Produção',
            href: '#',
            icon: Cog,
            items: [
                {
                    title: 'Dashboard',
                    href: '#',
                },
                {
                    title: 'Programação',
                    href: '#',
                },
                {
                    title: 'BOMs',
                    href: '/items/bom-config',
                },
                {
                    title: 'Rotas',
                    href: '/scheduler/route-editor',
                },
            ],
        },
        {
            title: 'Qualidade',
            href: '#',
            icon: Wrench,
            items: [
                {
                    title: 'Dashboard',
                    href: '#',
                },
                {
                    title: 'Realizar Inspeção',
                    href: '#',
                },
                {
                    title: 'Inspeções',
                    href: '/routines/routine-editor',
                },
                {
                    title: 'RNCs',
                    href: '#',
                },
                {
                    title: 'Desvios',
                    href: '#',
                },
                {
                    title: 'Metrologia',
                    href: '#',
                },
            ],
        },
        {
            title: 'Manutenção',
            href: '#',
            icon: ChartGantt,
            items: [
                {
                    title: 'Dashboard',
                    href: '/maintenance/dashboard',
                },
                {
                    title: 'Programação',
                    href: '#',
                },
                {
                    title: 'Execução de OS',
                    href: '#',
                },
                {
                    title: 'Solicitações',
                    href: '#',
                },
                {
                    title: 'Rotinas',
                    href: '#',
                },
                {
                    title: 'Ativos',
                    href: '/asset-hierarchy/assets',
                },
            ],
        },
    ],
};

const sistemaNavItems: NavGroup = {
    title: 'Configurações',
    items: [
        {
            title: 'Hierarquia de Ativos',
            href: '#',
            icon: ClipboardList,
            items: [
                {
                    title: 'Ativos',
                    href: '/asset-hierarchy/assets',
                },
                {
                    title: 'Setores',
                    href: '/asset-hierarchy/setores',
                },
                {
                    title: 'Áreas',
                    href: '/asset-hierarchy/areas',
                },
                {
                    title: 'Plantas',
                    href: '/asset-hierarchy/plantas',
                },
                {
                    title: 'Turnos',
                    href: '/asset-hierarchy/shifts',
                },
                {
                    title: 'Tipos de Ativo',
                    href: '/asset-hierarchy/tipos-ativo',
                },
                {
                    title: 'Exportar Ativos',
                    href: '/asset-hierarchy/assets/exportar',
                },
                {
                    title: 'Importar Ativos',
                    href: '/asset-hierarchy/assets/importar',
                },
            ],
        },
    ],
};

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/home" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={[gerenciamentoNavItems, sistemaNavItems]} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
