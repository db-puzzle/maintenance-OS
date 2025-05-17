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
    title: 'Gerenciamento',
    items: [
        {
            title: 'Dashboard',
            href: '/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Ativos',
            href: '/asset-hierarchy/equipamentos',
            icon: Cog,
        },
        {
            title: 'Manutenção',
            href: '#',
            icon: Wrench,
            items: [
                {
                    title: 'Rotinas',
                    href: '/routines/routine-editor',
                },
            ],
        },
        {
            title: 'Programação',
            href: '#',
            icon: ChartGantt,
            items: [
                {
                    title: 'Scheduler',
                    href: '/routines/routine-editor',
                },
                {
                    title: 'Rotas',
                    href: '/scheduler/route-editor',
                },
                {
                    title: 'Produtos',
                    href: '/routines/routine-editor',
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
                    title: 'Turnos',
                    href: '/asset-hierarchy/shifts',
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
                    title: 'Tipos de Equipamento',
                    href: '/asset-hierarchy/tipos-equipamento',
                },
            ],
        },
        {
            title: 'Import/Export',
            href: '#',
            icon: FileDown,
            items: [
                {
                    title: 'Exportar Equipamentos',
                    href: '/asset-hierarchy/equipamentos/exportar',
                },
                {
                    title: 'Importar Equipamentos',
                    href: '/asset-hierarchy/equipamentos/importar',
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
                            <Link href="/dashboard" prefetch>
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
