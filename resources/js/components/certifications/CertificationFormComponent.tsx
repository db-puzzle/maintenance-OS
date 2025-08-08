import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { User } from '@/types';
interface Certification {
    id: number;
    name: string;
    description: string | null;
    issuing_organization: string;
    validity_period_days: number | null;
    active: boolean;
    created_at: string;
    updated_at: string;
    users?: User[];
}
// Define a local form type with index signature
interface CertificationFormData {
    name: string;
    description: string;
    issuing_organization: string;
    validity_period_days: string;
    active: boolean;
    [key: string]: string | number | boolean | null | undefined;
}
interface CertificationFormComponentProps {
    certification?: Certification;
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
    canUpdate?: boolean;
    canDelete?: boolean;
}
export default function CertificationFormComponent({
    certification,
    initialMode = 'view',
    onCancel,
    onSuccess,
    canUpdate = false,
    canDelete = false
}: CertificationFormComponentProps) {
    const isEditing = !!certification;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<Record<string, unknown> | null>(null);
    const [dependenciesOpen, setDependenciesOpen] = useState(false);
    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<CertificationFormData>({
        name: certification?.name || '',
        description: certification?.description || '',
        issuing_organization: certification?.issuing_organization || '',
        validity_period_days: certification?.validity_period_days?.toString() || '',
        active: certification?.active ?? true,
    });
    const { delete: destroy, processing: deleting } = useForm();
    // Create a wrapper for setData to match the expected signature
    const handleSetData = (name: string, value: string | number | boolean | File | null | undefined) => {
        setData(name as keyof CertificationFormData, value as CertificationFormData[keyof CertificationFormData]);
    };
    const handleSave = () => {
        if (isEditing) {
            put(route('certifications.update', { certification: certification.id }), {
                onSuccess: () => {
                    toast.success(`A certificação ${data.name} foi atualizada com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar certificação', {
                        description: 'Verifique os campos e tente novamente.',
                    });
                },
            });
        }
    };
    const handleCancel = () => {
        if (isEditing && mode === 'edit') {
            // Reset form to original data
            reset();
            setMode('view');
        } else if (onCancel) {
            onCancel();
        }
    };
    const handleEdit = () => {
        setMode('edit');
    };
    const handleDelete = async () => {
        if (!certification) return;
        // Check dependencies first
        const response = await fetch(route('certifications.check-dependencies', certification.id));
        const data = await response.json();
        if (!data.canDelete) {
            setDependencies(data);
            setDependenciesOpen(true);
        } else {
            setDeleteDialogOpen(true);
        }
    };
    const confirmDelete = async () => {
        if (!certification) return;
        destroy(route('certifications.destroy', certification.id), {
            onSuccess: () => {
                toast.success('Certificação excluída com sucesso!');
                router.visit(route('certifications.index'));
            },
            onError: () => {
                toast.error('Erro ao excluir certificação');
            },
        });
    };
    // Calculate statistics for view mode
    const validUsers = certification?.users?.filter((u: unknown) => !u.is_expired).length || 0;
    const expiredUsers = certification?.users?.filter((u: unknown) => u.is_expired).length || 0;
    return (
        <>
            <div className="space-y-6">
                {/* Form Fields */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Nome */}
                    <TextInput
                        form={{
                            data,
                            setData: handleSetData,
                            errors,
                            clearErrors,
                        }}
                        name="name"
                        label="Nome"
                        placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome da certificação'}
                        required={!isViewMode}
                        view={isViewMode}
                    />
                    {/* Organização Emissora */}
                    <TextInput
                        form={{
                            data,
                            setData: handleSetData,
                            errors,
                            clearErrors,
                        }}
                        name="issuing_organization"
                        label="Organização Emissora"
                        placeholder={isViewMode ? 'Organização não informada' : 'Digite o nome da organização'}
                        required={!isViewMode}
                        view={isViewMode}
                    />
                    {/* Período de Validade */}
                    <TextInput
                        form={{
                            data,
                            setData: handleSetData,
                            errors,
                            clearErrors,
                        }}
                        name="validity_period_days"
                        label="Período de Validade (dias)"
                        placeholder={isViewMode ? 'Sem validade definida' : 'Digite o período em dias'}
                        view={isViewMode}
                    />
                    {/* Status */}
                    <div className="grid gap-2">
                        <Label htmlFor="active">Status</Label>
                        <div className="bg-background">
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {data.active ? 'Ativa' : 'Inativa'}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active"
                                        checked={data.active}
                                        onCheckedChange={(checked) => handleSetData('active', checked)}
                                    />
                                    <Label htmlFor="active" className="cursor-pointer">
                                        {data.active ? 'Ativa' : 'Inativa'}
                                    </Label>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Descrição */}
                    <div className="md:col-span-2">
                        <div className="grid gap-2">
                            <Label htmlFor="description">Descrição</Label>
                            <div className="bg-background">
                                {isViewMode ? (
                                    <div className="rounded-md border bg-muted/20 p-2 text-sm min-h-[80px]">
                                        {data.description || 'Descrição não informada'}
                                    </div>
                                ) : (
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => handleSetData('description', e.target.value)}
                                        placeholder="Digite a descrição da certificação"
                                        rows={3}
                                    />
                                )}
                            </div>
                            {errors.description && <span className="text-sm text-destructive">{errors.description}</span>}
                        </div>
                    </div>
                </div>
                {/* Statistics - Only show in view mode */}
                {isViewMode && certification && (
                    <div>
                        <Label>Estatísticas</Label>
                        <div className="mt-2 grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                                <p className="text-2xl font-semibold">{certification.users?.length || 0}</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">Certificados Válidos</p>
                                <p className="text-2xl font-semibold text-green-600">{validUsers}</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-sm text-muted-foreground">Certificados Expirados</p>
                                <p className="text-2xl font-semibold text-red-600">{expiredUsers}</p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Timestamps - Only show in view mode */}
                {isViewMode && certification && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Criado em</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {new Date(certification.created_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Atualizado em</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {new Date(certification.updated_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                    </div>
                )}
                {/* Action Buttons */}
                {isEditing && (
                    <div className="flex justify-end gap-2 pt-4">
                        {isViewMode ? (
                            <>
                                {canUpdate && (
                                    <Button onClick={handleEdit} variant="default">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button onClick={handleDelete} variant="outline" disabled={deleting}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button onClick={handleCancel} variant="outline" disabled={processing}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave} disabled={processing}>
                                    {processing ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
            {dependencies && (
                <EntityDependenciesDialog
                    open={dependenciesOpen}
                    onOpenChange={setDependenciesOpen}
                    entityName="certificação"
                    dependencies={dependencies}
                />
            )}
            <EntityDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                entityLabel={certification ? `a certificação "${certification.name}"` : ''}
            />
        </>
    );
} 