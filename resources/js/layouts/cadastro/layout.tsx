import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { Cog, Building2, Map, Factory, Wrench } from 'lucide-react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
        icon: Cog,
    },
    {
        title: 'Setores',
        href: '/cadastro/setores',
        icon: Building2,
    },
    {
        title: 'Áreas',
        href: '/cadastro/areas',
        icon: Map,
    },
    {
        title: 'Plantas',
        href: '/cadastro/plantas',
        icon: Factory,
    },
];

const separatedNavItem: NavItem = {
    title: 'Tipos de Equipamento',
    href: '/cadastro/tipos-equipamento',
    icon: Wrench,
};

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
                                    'bg-muted': currentPath === item.href,
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
                                'bg-muted': currentPath === separatedNavItem.href,
                            })}
                        >
                            <Link href={separatedNavItem.href} prefetch>
                                {separatedNavItem.icon && <separatedNavItem.icon className="mr-2 h-4 w-4" />}
                                {separatedNavItem.title}
                            </Link>
                        </Button>
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