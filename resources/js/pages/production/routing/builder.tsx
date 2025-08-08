import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ManufacturingRoute, ManufacturingStep, WorkCell } from '@/types/production';
import { Form } from '@/types/work-order';
import RouteBuilderCore from '@/components/production/RouteBuilderCore';
interface Props {
    routing: ManufacturingRoute & {
        steps: ManufacturingStep[];
    };
    workCells: WorkCell[];
    stepTypes: Record<string, string>;
    forms: Form[];
    can: {
        manage_steps: boolean;
    };
}
export default function RouteBuilder({ routing, workCells, stepTypes, forms = [], can }: Props) {
    const breadcrumbs = [
        { title: 'Produção', href: '/production' },
        { title: 'Roteiros', href: route('production.routing.index') },
        { title: routing.name, href: route('production.routing.show', routing.id) },
        { title: 'Editor', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editor de Roteiro - ${routing.name}`} />
            <RouteBuilderCore
                routing={routing}
                workCells={workCells}
                stepTypes={stepTypes}
                forms={forms}
                can={can}
                embedded={false}
            />
        </AppLayout>
    );
}