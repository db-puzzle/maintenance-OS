import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Máquina',
        href: '/cadastro/tipos-maquina',
    },
];

export default function TiposMaquina() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tipos de Máquina" />

            <CadastroLayout>
                <div className="space-y-6">
                    <HeadingSmall 
                        title="Tipos de Máquina" 
                        description="Gerencie os tipos de máquinas disponíveis no sistema" 
                    />

                    <div className="space-y-6">
                        {/* Conteúdo da página será adicionado aqui */}
                    </div>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 