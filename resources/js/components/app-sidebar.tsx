import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChartGantt, ClipboardList, LayoutGrid, Award, Factory, FileBox, Truck, Wrench, UsersRound } from 'lucide-react';
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
            title: 'Engenharia',
            href: '#',
            icon: FileBox,
            items: [
                {
                    title: 'Itens',
                    href: '/production/items',
                },
                {
                    title: 'BOMs',
                    href: '/production/bom',
                },
                {
                    title: 'Categorias de Itens',
                    href: '/production/categories',
                },
            ],
        },
        {
            title: 'Planejamento',
            href: '#',
            icon: ChartGantt,
            items: [
                {
                    title: 'Ordens de Manufatura',
                    href: '/production/orders',
                },
                {
                    title: 'Planejar',
                    href: '/production/planning',
                },
                {
                    title: 'Turnos',
                    href: '/asset-hierarchy/shifts',
                },
                {
                    title: 'Células de Trabalho',
                    href: '/production/work-cells',
                },
                {
                    title: 'Roteiros',
                    href: '/production/routing',
                },
                {
                    title: 'Programação',
                    href: '/production/schedules',
                },
            ],
        },
        {
            title: 'Produção',
            href: '#',
            icon: Factory,
            items: [
                {
                    title: 'Apontamento',
                    href: '/production/reporting',
                },
            ],
        },
        {
            title: 'Expedição',
            href: '#',
            icon: Truck,
            items: [
                {
                    title: 'Remessas',
                    href: '/production/shipments',
                },
                {
                    title: 'Rastreamento',
                    href: '/production/tracking',
                },
            ],
        },
        {
            title: 'Manutenção',
            href: '#',
            icon: Wrench,
            items: [
                {
                    title: 'Ativos',
                    href: '/asset-hierarchy/assets',
                },
                {
                    title: 'Ordens de Serviço',
                    href: '/maintenance/work-orders',
                },
                {
                    title: 'Hierarchia de Ativos',
                    href: '/asset-hierarchy',
                },
                {
                    title: 'Peças',
                    href: '/parts',
                },
            ],
        },
    ],
};
const sistemaNavItems: NavGroup = {
    title: 'Configurações',
    items: [
        {
            title: 'Usuários',
            href: '#',
            icon: UsersRound,
            items: [
                {
                    title: 'Usuários',
                    href: '/users',
                },
                {
                    title: 'Permissões',
                    href: '/permissions',
                },
                {
                    title: 'Convites',
                    href: '/invitations',
                },
            ],
        },
        {
            title: 'Qualificações',
            href: '#',
            icon: Award,
            items: [
                {
                    title: 'Habilidades',
                    href: '/skills',
                },
                {
                    title: 'Certificações',
                    href: '/certifications',
                },
            ],
        },
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
