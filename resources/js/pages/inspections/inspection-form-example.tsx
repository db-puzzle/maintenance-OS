import FormEditor from '@/pages/forms/form-editor';
import FormViewer from '@/pages/forms/form-viewer';
import { type BreadcrumbItem } from '@/types';

interface InspectionFormData {
    id: number;
    name: string;
    form?: {
        id: number;
        name: string;
        tasks: any[];
    };
}

interface AssetData {
    id: number;
    tag: string;
}

interface InspectionFormEditorProps {
    inspection: InspectionFormData;
    asset: AssetData;
}

interface InspectionFormViewerProps {
    inspection: InspectionFormData;
    asset: AssetData;
    mode?: 'view' | 'fill';
}

export function InspectionFormEditor({ inspection, asset }: InspectionFormEditorProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: asset.tag,
            href: route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'inspections' }),
        },
        {
            title: 'Formulário de Inspeção',
            href: '#',
        },
    ];

    return (
        <FormEditor
            form={inspection.form}
            entity={{ id: inspection.id, name: inspection.name }}
            entityType="inspection"
            breadcrumbs={breadcrumbs}
            backRoute={route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'inspections' })}
            saveRoute={route('asset-hierarchy.assets.inspections.forms.store', { asset: asset.id, inspection: inspection.id })}
            title="Formulário de Inspeção"
            subtitle={inspection.name}
        />
    );
}

export function InspectionFormViewer({ inspection, asset, mode = 'view' }: InspectionFormViewerProps) {
    if (!inspection.form) {
        throw new Error('Inspection must have a form to be viewed');
    }

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Ativos',
            href: '/asset-hierarchy/assets',
        },
        {
            title: asset.tag,
            href: route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'inspections' }),
        },
        {
            title: mode === 'fill' ? 'Preencher Formulário' : 'Visualizar Formulário',
            href: '#',
        },
    ];

    return (
        <FormViewer
            form={inspection.form}
            entity={{ id: asset.id, tag: asset.tag }}
            entityType="inspection"
            mode={mode}
            breadcrumbs={breadcrumbs}
            backRoute={route('asset-hierarchy.assets.show', { asset: asset.id, tab: 'inspections' })}
            submitRoute={route('asset-hierarchy.assets.inspections.executions.store', {
                asset: asset.id,
                inspection: inspection.id,
            })}
        />
    );
}
