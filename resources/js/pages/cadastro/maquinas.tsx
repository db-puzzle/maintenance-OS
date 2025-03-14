import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Máquinas',
        href: '/cadastro/maquinas',
    },
];

export default function Maquinas() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Máquinas" />

            <CadastroLayout>
                <div className="space-y-6">
                    <HeadingSmall 
                        title="Máquinas" 
                        description="Gerencie o cadastro de máquinas do sistema" 
                    />

                    <div className="space-y-6">
                        {/* Conteúdo da página será adicionado aqui */}
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 