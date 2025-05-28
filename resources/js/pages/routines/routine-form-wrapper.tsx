import { type BreadcrumbItem } from '@/types';
import FormEditor from '@/pages/forms/form-editor';
import FormViewer from '@/pages/forms/form-viewer';

interface RoutineFormData {
    id: number;
    name: string;
    form?: {
        id: number;
        tasks: any[];
    };
}

interface AssetData {
    id: number;
    tag: string;
}

interface RoutineFormEditorProps {
    routine: RoutineFormData;
    asset: AssetData;
}

interface RoutineFormViewerProps {
    routine: RoutineFormData;
    asset: AssetData;
    mode?: 'view' | 'fill';
}

export function RoutineFormEditor({ routine, asset }: RoutineFormEditorProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: asset.tag,
            href: route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'rotinas' }),
        },
        {
            title: 'Formulário da Rotina',
            href: '#',
        },
    ];

    return (
        <FormEditor
            form={routine.form}
            entity={{ id: routine.id, name: routine.name }}
            entityType="routine"
            breadcrumbs={breadcrumbs}
            backRoute={route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'rotinas' })}
            saveRoute={route('maintenance.assets.routines.forms.store', { asset: asset.id, routine: routine.id })}
            title="Formulário da Rotina"
            subtitle={routine.name}
        />
    );
}

export function RoutineFormViewer({ routine, asset, mode = 'view' }: RoutineFormViewerProps) {
    if (!routine.form) {
        throw new Error('Routine must have a form to be viewed');
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: asset.tag,
            href: route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'rotinas' }),
        },
        {
            title: mode === 'fill' ? 'Preencher Formulário' : 'Visualizar Formulário',
            href: '#',
        },
    ];

    return (
        <FormViewer
            form={routine.form}
            entity={{ id: asset.id, tag: asset.tag }}
            entityType="routine"
            mode={mode}
            breadcrumbs={breadcrumbs}
            backRoute={route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'rotinas' })}
            submitRoute={route('maintenance.assets.routines.executions.store', {
                asset: asset.id,
                routine: routine.id
            })}
        />
    );
} 