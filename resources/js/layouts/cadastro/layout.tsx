import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { Cog, Building2, Map, Factory, Wrench, FileSpreadsheet, ArrowUp, ArrowDown } from 'lucide-react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
        icon: Cog,
        activePattern: /^\/cadastro\/equipamentos/,
    },
    {
        title: 'Setores',
        href: '/cadastro/setores',
        icon: Building2,
        activePattern: /^\/cadastro\/setores/,
    },
    {
        title: 'Áreas',
        href: '/cadastro/areas',
        icon: Map,
        activePattern: /^\/cadastro\/areas/,
    },
    {
        title: 'Plantas',
        href: '/cadastro/plantas',
        icon: Factory,
        activePattern: /^\/cadastro\/plantas/,
    },
];

const separatedNavItem: NavItem = {
    title: 'Tipos de Equipamento',
    href: '/cadastro/tipos-equipamento',
    icon: Wrench,
    activePattern: /^\/cadastro\/tipos-equipamento/,
};

const importExportNavItems: NavItem[] = [
    {
        title: 'Importar Equipamentos',
        href: '/cadastro/equipamentos/importar',
        icon: () => (
            <div className="relative">
                <FileSpreadsheet className="h-4 w-4" />
                <ArrowUp className="h-3 w-3 absolute -top-1 -right-1" />
            </div>
        ),
        activePattern: /^\/cadastro\/equipamentos\/importar/,
    },
    {
        title: 'Exportar Equipamentos',
        href: '/cadastro/equipamentos/exportar',
        icon: () => (
            <div className="relative">
                <FileSpreadsheet className="h-4 w-4" />
                <ArrowDown className="h-3 w-3 absolute -bottom-1 -right-1" />
            </div>
        ),
        activePattern: /^\/cadastro\/equipamentos\/exportar/,
    },
];

export default function CadastroLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="px-4 py-6">
            <Heading title="Cadastro" description="Gerencie seus cadastros de máquinas, tipos e áreas" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={item.href}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': item.activePattern?.test(currentPath),
                                })}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                        <Separator className="my-4 mb-5" />
                        <Button
                            key={separatedNavItem.href}
                            size="sm"
                            variant="ghost"
                            asChild
                            className={cn('w-full justify-start', {
                                'bg-muted': separatedNavItem.activePattern?.test(currentPath),
                            })}
                        >
                            <Link href={separatedNavItem.href} prefetch>
                                {separatedNavItem.icon && <separatedNavItem.icon className="mr-2 h-4 w-4" />}
                                {separatedNavItem.title}
                            </Link>
                        </Button>
                        <Separator className="my-4 mb-5" />
                        {importExportNavItems.map((item) => (
                            <Button
                                key={item.href}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': item.activePattern?.test(currentPath),
                                })}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1">
                    <section className="space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
} 