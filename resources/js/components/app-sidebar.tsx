import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChartGantt, ClipboardList, LayoutGrid, Shield, Award, Factory } from 'lucide-react';
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
            title: 'Manutenção',
            href: '#',
            icon: ChartGantt,
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
        {
            title: 'Produção',
            href: '#',
            icon: Factory,
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
                    title: 'Ordens de Manufatura',
                    href: '/production/orders',
                },
                {
                    title: 'Roteiros',
                    href: '/production/routing',
                },
                {
                    title: 'Células de Trabalho',
                    href: '/production/work-cells',
                },
                {
                    title: 'Categorias de Itens',
                    href: '/production/categories',
                },
                {
                    title: 'Planejamento',
                    href: '/production/planning',
                },
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
            title: 'Segurança',
            href: '#',
            icon: Shield,
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
