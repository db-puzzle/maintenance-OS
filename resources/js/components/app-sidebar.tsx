import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChartGantt, ClipboardList, LayoutGrid, Shield, Settings } from 'lucide-react';
import AppLogo from './app-logo';
import PermissionGuard from './PermissionGuard';

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
            title: 'Manutenção',
            href: '#',
            icon: ChartGantt,
            items: [
                {
                    title: 'Ativos',
                    href: '/asset-hierarchy/assets',
                },
                {
                    title: 'Dashboard de Rotinas',
                    href: '/maintenance/routines/dashboard',
                },
                {
                    title: 'Hierarchia de Ativos',
                    href: '/asset-hierarchy',
                },
            ],
        },
    ],
};

const sistemaNavItems: NavGroup = {
    title: 'Configurações',
    items: [
        {
            title: 'Utilidades',
            href: '#',
            icon: ClipboardList,
            items: [
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
        {
            title: 'Segurança',
            href: '#',
            icon: Shield,
            items: [
                {
                    title: 'Permissões',
                    href: '/permissions',
                },
                {
                    title: 'Funções',
                    href: '/roles',
                },
                {
                    title: 'Convites',
                    href: '/invitations',
                },
                {
                    title: 'Logs de Auditoria',
                    href: '/audit-logs',
                },
            ],
        },
    ],
};

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
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
