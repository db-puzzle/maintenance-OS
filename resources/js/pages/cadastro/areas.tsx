import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Áreas',
        href: '/cadastro/areas',
    },
];

export default function Areas() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Áreas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <HeadingSmall 
                        title="Áreas" 
                        description="Gerencie as áreas do sistema" 
                    />

                    <div className="space-y-6">
                        {/* Conteúdo da página será adicionado aqui */}
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 