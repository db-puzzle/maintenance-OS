import { router } from '@inertiajs/react';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Save, X } from 'lucide-react';
import { Routine } from './RoutineList';

interface RoutineForm {
    [key: string]: any;
    name: string;
    trigger_hours: number;
    type: 1 | 2 | 3;
    status: 'Active' | 'Inactive';
    description: string;
}

interface EditRoutineSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: (routine: Routine) => void;
    routine?: Routine;
    isNew?: boolean;
    assetId?: number;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    triggerIcon?: React.ReactNode;
}

const routineTypes = [
    { value: '1', label: 'Inspeção' },
    { value: '2', label: 'Rotina de Manutenção' },
    { value: '3', label: 'Relatório de Manutenção' },
];

const routineStatuses = [
    { value: 'Active', label: 'Ativo' },
    { value: 'Inactive', label: 'Inativo' },
];

const EditRoutineSheet: React.FC<EditRoutineSheetProps> = ({
    isOpen,
    onOpenChange,
    onSuccess,
    routine,
    isNew = false,
    assetId,
    triggerText = 'Editar Rotina',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    triggerIcon,
}) => {
    const [data, setData] = React.useState<RoutineForm>({
        name: routine?.name || '',
        trigger_hours: routine?.trigger_hours || 0,
        type: routine?.type || 2,
        status: routine?.status || 'Active',
        description: routine?.description || '',
    });

    const [processing, setProcessing] = React.useState(false);
    const [errors, setErrors] = React.useState<Partial<Record<keyof RoutineForm, string>>>({});

    const [internalSheetOpen, setInternalSheetOpen] = React.useState(false);

    // Determina se deve usar controle interno ou externo
    const sheetOpen = isOpen !== undefined ? isOpen : internalSheetOpen;
    const setSheetOpen = isOpen !== undefined && onOpenChange ? onOpenChange : setInternalSheetOpen;

    // Atualiza os dados quando a routine muda
    React.useEffect(() => {
        if (routine) {
            setData({
                name: routine.name || '',
                trigger_hours: routine.trigger_hours || 0,
                type: routine.type || 2,
                status: routine.status || 'Active',
                description: routine.description || '',
            });
        }
    }, [routine]);

    const formatTriggerHours = (hours: number) => {
        if (hours < 24) {
            return `${hours} hora${hours !== 1 ? 's' : ''}`;
        } else if (hours % 24 === 0) {
            const days = hours / 24;
            return `${days} dia${days !== 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days} dia${days !== 1 ? 's' : ''} e ${remainingHours} hora${remainingHours !== 1 ? 's' : ''}`;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validação básica
        const newErrors: Partial<Record<keyof RoutineForm, string>> = {};

        if (!data.name.trim()) {
            newErrors.name = 'Nome da rotina é obrigatório';
        }

        if (data.trigger_hours <= 0) {
            newErrors.trigger_hours = 'Intervalo deve ser maior que 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setProcessing(true);
        setErrors({});

        if (isNew) {
            // Criar nova rotina usando RoutineController
            if (!assetId) {
                toast.error('ID do ativo não fornecido');
                setProcessing(false);
                return;
            }

            router.post(route('maintenance.assets.routines.store', assetId), data, {
                onSuccess: () => {
                    toast.success('Rotina criada com sucesso!');
                    setProcessing(false);
                    setSheetOpen(false);
                    // Recarregar a página para mostrar a nova rotina com o ID correto
                    window.location.reload();
                },
                onError: (errors: any) => {
                    console.error('Erro ao criar rotina:', errors);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: errors.name }));
                    if (errors.trigger_hours) setErrors((prev) => ({ ...prev, trigger_hours: errors.trigger_hours }));
                    toast.error('Erro ao criar rotina. Verifique os campos e tente novamente.');
                    setProcessing(false);
                },
            });
        } else {
            // Atualizar rotina existente usando RoutineController
            if (!routine?.id) {
                toast.error('ID da rotina não encontrado');
                setProcessing(false);
                return;
            }

            if (!assetId) {
                toast.error('ID do ativo não fornecido');
                setProcessing(false);
                return;
            }

            router.put(route('maintenance.assets.routines.update', { asset: assetId, routine: routine.id }), data, {
                onSuccess: (response: any) => {
                    const savedRoutine: Routine = response.props?.routine || { ...routine, ...data };
                    toast.success('Rotina atualizada com sucesso!');
                    setProcessing(false);
                    setSheetOpen(false);
                    onSuccess?.(savedRoutine);
                },
                onError: (errors: any) => {
                    console.error('Erro ao atualizar rotina:', errors);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: errors.name }));
                    if (errors.trigger_hours) setErrors((prev) => ({ ...prev, trigger_hours: errors.trigger_hours }));
                    toast.error('Erro ao atualizar rotina. Verifique os campos e tente novamente.');
                    setProcessing(false);
                },
            });
        }
    };

    const handleCancel = () => {
        // Resetar dados para o estado original
        if (routine) {
            setData({
                name: routine.name || '',
                trigger_hours: routine.trigger_hours || 0,
                type: routine.type || 2,
                status: routine.status || 'Active',
                description: routine.description || '',
            });
        } else {
            setData({
                name: '',
                trigger_hours: 0,
                type: 2,
                status: 'Active',
                description: '',
            });
        }
        setErrors({});
        setSheetOpen(false);
    };

    const updateData = (key: keyof RoutineForm, value: any) => {
        setData((prev) => ({ ...prev, [key]: value }));
        // Limpar erro do campo quando ele é alterado
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }));
        }
    };

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {showTrigger && (
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerIcon}
                        {triggerText}
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent className="sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {isNew ? 'Nova Rotina de Manutenção' : 'Editar Rotina'}
                    </SheetTitle>
                    <SheetDescription>{isNew ? 'Configure uma nova rotina de manutenção' : 'Atualize os dados da rotina'}</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="m-4 space-y-6">
                    <div className="space-y-4">
                        {/* Nome da Rotina */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Rotina *</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => updateData('name', e.target.value)}
                                placeholder="Ex: Verificação mensal de óleo"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>

                        {/* Intervalo de Acionamento */}
                        <div className="space-y-2">
                            <Label htmlFor="trigger_hours">Intervalo de Acionamento (horas) *</Label>
                            <Input
                                id="trigger_hours"
                                type="number"
                                min="1"
                                value={data.trigger_hours}
                                onChange={(e) => updateData('trigger_hours', parseInt(e.target.value) || 0)}
                                placeholder="Ex: 720 (30 dias)"
                                className={errors.trigger_hours ? 'border-red-500' : ''}
                            />
                            {data.trigger_hours > 0 && (
                                <p className="text-muted-foreground text-sm">Equivale a: {formatTriggerHours(data.trigger_hours)}</p>
                            )}
                            {errors.trigger_hours && <p className="text-sm text-red-500">{errors.trigger_hours}</p>}
                        </div>

                        {/* Tipo de Rotina */}
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Rotina</Label>
                            <Select value={data.type.toString()} onValueChange={(value) => updateData('type', parseInt(value) as 1 | 2 | 3)}>
                                <SelectTrigger id="type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {routineTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={data.status} onValueChange={(value) => updateData('status', value as 'Active' | 'Inactive')}>
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {routineStatuses.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => updateData('description', e.target.value)}
                                placeholder="Descreva os detalhes desta rotina de manutenção..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <SheetFooter className="flex justify-end gap-2">
                        <Button type="submit" disabled={processing || !data.name || data.trigger_hours <= 0}>
                            <Save className="mr-1 h-4 w-4" />
                            {processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={processing}>
                            <X className="mr-1 h-4 w-4" />
                            Cancelar
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
};

export default EditRoutineSheet;
