import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from '@/components/ui/sidebar';
import { type NavGroup, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const STORAGE_KEY = 'nav_open_items';

// Parâmetros que não devem afetar o estado ativo do item
const QUERY_PARAMS_TO_IGNORE = ['search', 'page', 'per_page', 'from', 'to', 'sort', 'direction'];

export function NavMain({ items = [] }: { items: (NavItem | NavGroup)[] }) {
    const page = usePage();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        }
        return {};
    });

    const isItemActive = (href: string, activePattern?: RegExp) => {
        if (activePattern) {
            return activePattern.test(page.url);
        }

        // Extrai o caminho e os parâmetros da URL atual
        const [currentPath, currentQuery] = page.url.split('?');
        const [itemPath] = href.split('?');

        // Se os caminhos são diferentes, verifica se é apenas uma questão de parâmetros de busca
        if (currentPath !== itemPath) {
            // Se o caminho atual é diferente do caminho do item (ignorando parâmetros),
            // então não é o item ativo
            return false;
        }

        // Se os caminhos são iguais, o item está ativo
        // Não importa quais parâmetros de busca, paginação ou filtros estão presentes
        return true;
    };

    const toggleItem = (title: string) => {
        setOpenItems((prev) => {
            const newState = {
                ...prev,
                [title]: !prev[title],
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            return newState;
        });
    };

    const renderNavItem = (item: NavItem) => {
        if (item.items && item.items.length > 0) {
            const isOpen = openItems[item.title] || false;

            return (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton onClick={() => toggleItem(item.title)}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                    {isOpen && (
                        <SidebarMenuSub>
                            {item.items.map((subItem: NavItem) => (
                                <SidebarMenuItem key={subItem.title}>
                                    <SidebarMenuButton asChild isActive={isItemActive(subItem.href, subItem.activePattern)}>
                                        <Link href={subItem.href} prefetch>
                                            <span>{subItem.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenuSub>
                    )}
                </SidebarMenuItem>
            );
        }

        return (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isItemActive(item.href, item.activePattern)}>
                    <Link href={item.href} prefetch>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    };

    return (
        <>
            {items.map((item) => {
                if ('items' in item && !('href' in item)) {
                    // É um NavGroup
                    const navGroup = item as NavGroup;
                    return (
                        <SidebarGroup key={navGroup.title} className="px-2 py-0">
                            <SidebarGroupLabel>{navGroup.title}</SidebarGroupLabel>
                            <SidebarMenu>{navGroup.items?.map((navItem: NavItem) => renderNavItem(navItem))}</SidebarMenu>
                        </SidebarGroup>
                    );
                }
                // É um NavItem
                return renderNavItem(item as NavItem);
            })}
        </>
    );
}
