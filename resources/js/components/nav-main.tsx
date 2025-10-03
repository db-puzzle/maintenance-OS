import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, useSidebar } from '@/components/ui/sidebar';
import { type NavGroup, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
const STORAGE_KEY = 'nav_open_items';
export function NavMain({ items = [] }: { items: (NavItem | NavGroup)[] }) {
    const page = usePage();
    const { state } = useSidebar();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        }
        return {};
    });
    const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({});
    const isItemActive = (href: string, activePattern?: RegExp) => {
        if (activePattern) {
            return activePattern.test(page.url);
        }
        // Extrai o caminho e os parâmetros da URL atual
        const [currentPath] = page.url.split('?');
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

    const togglePopover = (title: string, open?: boolean) => {
        setPopoverOpen((prev) => ({
            ...prev,
            [title]: open !== undefined ? open : !prev[title],
        }));
    };
    const renderNavItem = (item: NavItem) => {
        if (item.items && item.items.length > 0) {
            const isOpen = openItems[item.title] || false;

            // When sidebar is collapsed, use a popover for sub-items
            if (state === 'collapsed') {
                return (
                    <SidebarMenuItem key={item.title}>
                        <Popover
                            open={popoverOpen[item.title] || false}
                            onOpenChange={(open) => togglePopover(item.title, open)}
                        >
                            <PopoverTrigger asChild>
                                <div
                                    onMouseEnter={() => togglePopover(item.title, true)}
                                    onMouseLeave={() => togglePopover(item.title, false)}
                                >
                                    <SidebarMenuButton
                                        onClick={(e) => {
                                            e.preventDefault();
                                            // Still allow click to toggle for accessibility
                                            togglePopover(item.title);
                                        }}
                                    >
                                        {item.icon && <item.icon />}
                                        <span className="sr-only">{item.title}</span>
                                    </SidebarMenuButton>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent
                                side="right"
                                align="start"
                                sideOffset={12}
                                className="w-56 p-0 bg-sidebar border-sidebar-border"
                                onMouseEnter={() => togglePopover(item.title, true)}
                                onMouseLeave={() => togglePopover(item.title, false)}
                            >
                                <div className="flex flex-col gap-2 p-2">
                                    <div className="flex h-8 shrink-0 items-center rounded-md -mb-2 px-2 text-sm font-medium text-sidebar-foreground/70">
                                        {item.title}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {item.items.map((subItem: NavItem) => (
                                            <Link
                                                key={subItem.title}
                                                href={subItem.href}
                                                prefetch
                                                onClick={() => togglePopover(item.title, false)}
                                                className={`
                                                    flex items-center gap-2 rounded-md px-2 py-1.5 text-sm 
                                                    text-sidebar-foreground hover:bg-sidebar-accent 
                                                    hover:text-sidebar-accent-foreground transition-colors
                                                    ${isItemActive(subItem.href, subItem.activePattern)
                                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                                        : ''}
                                                `}
                                            >
                                                {subItem.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </SidebarMenuItem>
                );
            }

            // Normal expanded sidebar behavior
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
