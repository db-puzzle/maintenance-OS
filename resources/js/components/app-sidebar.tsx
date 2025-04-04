import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { LayoutGrid, ClipboardList, Building2, Map, Factory, Wrench, FileDown, FileUp } from 'lucide-react';
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
    ],
};

const sistemaNavItems: NavGroup = {
    title: 'Sistema',
    items: [
        {
            title: 'Cadastro',
            href: '#',
            icon: ClipboardList,
            items: [
                {
                    title: 'Equipamentos',
                    href: '/cadastro/equipamentos',
                },
                {
                    title: 'Setores',
                    href: '/cadastro/setores',
                },
                {
                    title: 'Áreas',
                    href: '/cadastro/areas',
                },
                {
                    title: 'Plantas',
                    href: '/cadastro/plantas',
                },
                {
                    title: 'Tipos de Equipamento',
                    href: '/cadastro/tipos-equipamento',
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
                    href: '/cadastro/equipamentos/exportar',
                },
                {
                    title: 'Importar Equipamentos',
                    href: '/cadastro/equipamentos/importar',
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
