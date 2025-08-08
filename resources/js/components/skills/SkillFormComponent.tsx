import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EntityDeleteDialog } from '@/components/shared/EntityDeleteDialog';
import { EntityDependenciesDialog } from '@/components/shared/EntityDependenciesDialog';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
interface Skill {
    id: number;
    name: string;
    description: string | null;
    category: string;
    created_at: string;
    updated_at: string;
}
// Define a local form type with index signature
interface SkillFormData {
    name: string;
    description: string;
    category: string;
    [key: string]: string | number | boolean | null | undefined;
}
interface SkillFormComponentProps {
    skill?: Skill;
    initialMode?: 'view' | 'edit';
    onCancel?: () => void;
    onSuccess?: () => void;
    canUpdate?: boolean;
    canDelete?: boolean;
}
export default function SkillFormComponent({
    skill,
    initialMode = 'view',
    onCancel,
    onSuccess,
    canUpdate = false,
    canDelete = false
}: SkillFormComponentProps) {
    const isEditing = !!skill;
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view' && isEditing;
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dependencies, setDependencies] = useState<Record<string, unknown>>(null);
    const [dependenciesOpen, setDependenciesOpen] = useState(false);
    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm<SkillFormData>({
        name: skill?.name || '',
        description: skill?.description || '',
        category: skill?.category || 'technical',
    });
    const { delete: destroy, processing: deleting } = useForm();
    // Create a wrapper for setData to match the expected signature
    const handleSetData = (name: string, value: string | number | boolean | File | null | undefined) => {
        setData(name as keyof SkillFormData, value as SkillFormData[keyof SkillFormData]);
    };
    const handleSave = () => {
        if (isEditing) {
            put(route('skills.update', { skill: skill.id }), {
                onSuccess: () => {
                    toast.success(`A habilidade ${data.name} foi atualizada com sucesso!`);
                    setMode('view');
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.reload();
                    }
                },
                onError: () => {
                    toast.error('Erro ao atualizar habilidade', {
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
        if (!skill) return;
        // Check dependencies first
        const response = await fetch(route('skills.check-dependencies', skill.id));
        const data = await response.json();
        if (!data.canDelete) {
            setDependencies(data);
            setDependenciesOpen(true);
        } else {
            setDeleteDialogOpen(true);
        }
    };
    const confirmDelete = async () => {
        if (!skill) return;
        destroy(route('skills.destroy', skill.id), {
            onSuccess: () => {
                toast.success('Habilidade excluída com sucesso!');
                router.visit(route('skills.index'));
            },
            onError: () => {
                toast.error('Erro ao excluir habilidade');
            },
        });
    };
    const categoryOptions = [
        { value: 'technical', label: 'Técnica' },
        { value: 'safety', label: 'Segurança' },
        { value: 'operational', label: 'Operacional' },
        { value: 'administrative', label: 'Administrativa' },
        { value: 'other', label: 'Outra' },
    ];
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
                        placeholder={isViewMode ? 'Nome não informado' : 'Digite o nome da habilidade'}
                        required={!isViewMode}
                        view={isViewMode}
                    />
                    {/* Categoria */}
                    <div className="grid gap-2">
                        <Label htmlFor="category">
                            Categoria
                            {!isViewMode && <span className="text-destructive"> *</span>}
                        </Label>
                        <div className="bg-background">
                            {isViewMode ? (
                                <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                    {categoryOptions.find(opt => opt.value === data.category)?.label || data.category}
                                </div>
                            ) : (
                                <Select value={data.category} onValueChange={(value) => handleSetData('category', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        {errors.category && <span className="text-sm text-destructive">{errors.category}</span>}
                    </div>
                    {/* Users Count - Only show in view mode */}
                    {isViewMode && skill && (
                        <div className="grid gap-2">
                            <Label>Usuários com esta habilidade</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {(skill as unknown).users?.length || 0}
                            </div>
                        </div>
                    )}
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
                                        placeholder="Digite a descrição da habilidade"
                                        rows={3}
                                    />
                                )}
                            </div>
                            {errors.description && <span className="text-sm text-destructive">{errors.description}</span>}
                        </div>
                    </div>
                </div>
                {/* Timestamps - Only show in view mode */}
                {isViewMode && skill && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Criado em</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {new Date(skill.created_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Atualizado em</Label>
                            <div className="rounded-md border bg-muted/20 p-2 text-sm">
                                {new Date(skill.updated_at).toLocaleString('pt-BR')}
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
                    entityName="habilidade"
                    dependencies={dependencies}
                />
            )}
            <EntityDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                entityLabel={skill ? `a habilidade "${skill.name}"` : ''}
            />
        </>
    );
} 