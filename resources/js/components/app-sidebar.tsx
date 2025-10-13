import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { ChartGantt, LayoutGrid, Factory, UsersRound, Building2, SquarePen } from 'lucide-react';
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
            title: 'Cadastro',
            href: '#',
            icon: SquarePen,
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
                {
                    title: 'Fabricantes',
                    href: '/asset-hierarchy/manufacturers',
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
                    title: 'Planejamento de Ordens',
                    href: '/production/planning',
                },
                {
                    title: 'Templates de Rotas',
                    href: '/production/routing',
                },
                {
                    title: 'Células de Trabalho',
                    href: '/production/work-cells',
                },
                {
                    title: 'Programação',
                    href: '/production/scheduler',
                },
            ],
        },
        {
            title: 'Produção',
            href: '',
            icon: Factory,
            items: [
                {
                    title: 'Apontamento',
                    href: '/production/reporting',
                },
            ],
        },
        /*{
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
        },*/
        /*{
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
                {
                    title: 'Tipos de Ativo',
                    href: '/asset-hierarchy/asset-types',
                },
            ],
        },*/
    ],
};
const sistemaNavItems: NavGroup = {
    title: 'Configurações',
    items: [
        {
            title: 'Organização',
            href: '',
            icon: Building2,
            items: [
                {
                    title: 'Plantas',
                    href: '/asset-hierarchy/plants',
                },
                {
                    title: 'Áreas',
                    href: '/asset-hierarchy/areas',
                },
                {
                    title: 'Setores',
                    href: '/asset-hierarchy/sectors',
                },
                {
                    title: 'Células de Trabalho',
                    href: '/production/work-cells',
                },
                {
                    title: 'Turnos',
                    href: '/asset-hierarchy/shifts',
                },
            ],
        },
        {
            title: 'Usuários & Permissões',
            href: '#',
            icon: UsersRound,
            items: [
                {
                    title: 'Usuários',
                    href: '/users',
                },
                {
                    title: 'Convites',
                    href: '/invitations',
                },
                {
                    title: 'Funções',
                    href: '/settings/roles',
                },
                {
                    title: 'Logs de Auditoria',
                    href: '/audit-logs',
                },
            ],
        },
        /*{
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
        },*/
        /*{
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
        },*/
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
