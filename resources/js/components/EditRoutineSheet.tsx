import { router } from '@inertiajs/react';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Save, X, Clock, Hand, Calendar, AlertTriangle, Lock, Info } from 'lucide-react';

// Updated Routine interface to match the specifications
interface Routine {
    id?: number;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours?: number;
    trigger_calendar_days?: number;
    execution_mode: 'automatic' | 'manual';
    description?: string;
    form_id?: number;
    asset_id?: number;
    advance_generation_hours: number;
    auto_approve_work_orders: boolean;
    default_priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
    priority_score: number;
    last_execution_runtime_hours?: number;
    last_execution_completed_at?: string;
    last_execution_form_version_id?: number;
    [key: string]: unknown;
}

interface RoutineForm {
    [key: string]: string | number | boolean | null | undefined;
    name: string;
    trigger_type: 'runtime_hours' | 'calendar_days';
    trigger_runtime_hours: number | null;
    trigger_calendar_days: number | null;
    execution_mode: 'automatic' | 'manual';
    description: string;
    advance_generation_hours: number;
    auto_approve_work_orders: boolean;
    default_priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
    priority_score: number;
}

interface EditRoutineSheetProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    routine?: Routine;
    isNew?: boolean;
    assetId?: number;
    onSuccess?: (routine: Routine) => void;
    // Props para SheetTrigger
    triggerText?: string;
    triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    showTrigger?: boolean;
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    triggerIcon?: React.ReactNode;
    // User permissions
    userPermissions?: string[];
}

const PRIORITY_OPTIONS = [
    { value: 'emergency', label: 'Emergência', score: 90 },
    { value: 'urgent', label: 'Urgente', score: 75 },
    { value: 'high', label: 'Alta', score: 60 },
    { value: 'normal', label: 'Normal', score: 50 },
    { value: 'low', label: 'Baixa', score: 25 },
];

const EditRoutineSheet: React.FC<EditRoutineSheetProps> = ({
    isOpen,
    onOpenChange,
    routine,
    isNew = false,
    assetId,
    onSuccess,
    triggerText = 'Editar Rotina',
    triggerVariant = 'outline',
    showTrigger = false,
    triggerRef,
    triggerIcon,
    userPermissions = [],
}) => {
    const [data, setData] = React.useState<RoutineForm>({
        name: routine?.name || '',
        trigger_type: routine?.trigger_type || 'runtime_hours',
        trigger_runtime_hours: routine?.trigger_runtime_hours || null,
        trigger_calendar_days: routine?.trigger_calendar_days || null,
        execution_mode: routine?.execution_mode || 'automatic',
        description: routine?.description || '',
        advance_generation_hours: routine?.advance_generation_hours || 24,
        auto_approve_work_orders: routine?.auto_approve_work_orders || false,
        default_priority: routine?.default_priority || 'normal',
        priority_score: routine?.priority_score || 50,
    });

    const [processing, setProcessing] = React.useState(false);
    const [errors, setErrors] = React.useState<Partial<Record<keyof RoutineForm, string>>>({});

    const [internalSheetOpen, setInternalSheetOpen] = React.useState(false);

    // Check if user has work order approval permission
    const canApproveWorkOrders = userPermissions.includes('work-orders.approve');

    // Determina se deve usar controle interno ou externo
    const sheetOpen = isOpen !== undefined ? isOpen : internalSheetOpen;
    const setSheetOpen = isOpen !== undefined && onOpenChange ? onOpenChange : setInternalSheetOpen;

    // Atualiza os dados quando a routine muda
    React.useEffect(() => {
        if (routine && routine.id) {
            setData(prevData => {
                const newData = {
                    name: routine.name || '',
                    trigger_type: routine.trigger_type || 'runtime_hours',
                    trigger_runtime_hours: routine.trigger_runtime_hours || null,
                    trigger_calendar_days: routine.trigger_calendar_days || null,
                    execution_mode: routine.execution_mode || 'automatic',
                    description: routine.description || '',
                    advance_generation_hours: routine.advance_generation_hours || 24,
                    auto_approve_work_orders: routine.auto_approve_work_orders || false,
                    default_priority: routine.default_priority || 'normal',
                    priority_score: routine.priority_score || 50,
                };

                // Check if data actually changed to prevent unnecessary updates
                if (JSON.stringify(prevData) === JSON.stringify(newData)) {
                    return prevData;
                }

                return newData;
            });
        }
    }, [routine?.id, routine?.name, routine?.trigger_type, routine?.trigger_runtime_hours, routine?.trigger_calendar_days, routine?.execution_mode, routine?.description, routine?.advance_generation_hours, routine?.auto_approve_work_orders, routine?.default_priority, routine?.priority_score]);

    // Update priority score when priority changes
    React.useEffect(() => {
        const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === data.default_priority);
        if (selectedPriority && data.priority_score !== selectedPriority.score) {
            setData(prev => ({ ...prev, priority_score: selectedPriority.score }));
        }
    }, [data.default_priority]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validação básica
        const newErrors: Partial<Record<keyof RoutineForm, string>> = {};

        if (!data.name) newErrors.name = 'Nome é obrigatório';

        if (!data.trigger_type) newErrors.trigger_type = 'Tipo de gatilho é obrigatório';

        if (data.trigger_type === 'runtime_hours') {
            if (!data.trigger_runtime_hours || data.trigger_runtime_hours <= 0) {
                newErrors.trigger_runtime_hours = 'Intervalo de horas deve ser maior que zero';
            } else if (data.trigger_runtime_hours > 10000) {
                newErrors.trigger_runtime_hours = 'Intervalo de horas deve ser menor que 10.000';
            }
        }

        if (data.trigger_type === 'calendar_days') {
            if (!data.trigger_calendar_days || data.trigger_calendar_days <= 0) {
                newErrors.trigger_calendar_days = 'Intervalo de dias deve ser maior que zero';
            } else if (data.trigger_calendar_days > 365) {
                newErrors.trigger_calendar_days = 'Intervalo de dias deve ser menor que 365';
            }
        }

        if (data.advance_generation_hours < 1 || data.advance_generation_hours > 168) {
            newErrors.advance_generation_hours = 'Horas de antecedência deve estar entre 1 e 168 horas';
        }

        if (data.priority_score < 0 || data.priority_score > 100) {
            newErrors.priority_score = 'Pontuação de prioridade deve estar entre 0 e 100';
        }

        if (data.auto_approve_work_orders && !canApproveWorkOrders) {
            newErrors.auto_approve_work_orders = 'Você não tem permissão para habilitar aprovação automática';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setProcessing(true);

        const url = isNew
            ? route('maintenance.routines.store')
            : route('maintenance.routines.update', { routine: routine?.id });

        const method = isNew ? 'post' : 'put';

        const payload = {
            ...data,
            asset_id: assetId || routine?.asset_id,
            // Clear unused trigger field based on type
            trigger_runtime_hours: data.trigger_type === 'runtime_hours' ? data.trigger_runtime_hours : null,
            trigger_calendar_days: data.trigger_type === 'calendar_days' ? data.trigger_calendar_days : null,
        };

        router[method](url, payload, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                toast.success(isNew ? 'Rotina criada com sucesso!' : 'Rotina atualizada com sucesso!');
                setSheetOpen(false);

                // Reset form if creating new
                if (isNew) {
                    setData({
                        name: '',
                        trigger_type: 'runtime_hours',
                        trigger_runtime_hours: null,
                        trigger_calendar_days: null,
                        execution_mode: 'automatic',
                        description: '',
                        advance_generation_hours: 24,
                        auto_approve_work_orders: false,
                        default_priority: 'normal',
                        priority_score: 50,
                    });
                }

                // Call onSuccess callback if provided
                if (onSuccess) {
                    const routineData = (page.props as any).routine || routine;
                    onSuccess(routineData);
                }
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error(firstError || 'Erro ao salvar rotina');
                setErrors(errors as any);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const handleCancel = () => {
        // Reset form to original values
        if (routine) {
            setData({
                name: routine.name || '',
                trigger_type: routine.trigger_type || 'runtime_hours',
                trigger_runtime_hours: routine.trigger_runtime_hours || null,
                trigger_calendar_days: routine.trigger_calendar_days || null,
                execution_mode: routine.execution_mode || 'automatic',
                description: routine.description || '',
                advance_generation_hours: routine.advance_generation_hours || 24,
                auto_approve_work_orders: routine.auto_approve_work_orders || false,
                default_priority: routine.default_priority || 'normal',
                priority_score: routine.priority_score || 50,
            });
        } else {
            setData({
                name: '',
                trigger_type: 'runtime_hours',
                trigger_runtime_hours: null,
                trigger_calendar_days: null,
                execution_mode: 'automatic',
                description: '',
                advance_generation_hours: 24,
                auto_approve_work_orders: false,
                default_priority: 'normal',
                priority_score: 50,
            });
        }
        setErrors({});
        setSheetOpen(false);
    };

    const updateData = (key: keyof RoutineForm, value: string | number | boolean | null | undefined) => {
        setData(prev => ({ ...prev, [key]: value }));
        // Clear error for this field when user starts typing
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: undefined }));
        }
    };

    const sheetContent = (
        <SheetContent className="w-full overflow-y-auto sm:max-w-[650px]">
            <form onSubmit={handleSubmit}>
                <SheetHeader>
                    <SheetTitle>{isNew ? 'Nova Rotina' : 'Editar Rotina'}</SheetTitle>
                    <SheetDescription>
                        {isNew ? 'Preencha os dados para criar uma nova rotina de manutenção.' : 'Atualize os dados da rotina de manutenção.'}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-4 px-4">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Informações Básicas</h3>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Rotina*</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => updateData('name', e.target.value)}
                                placeholder="Ex: Lubrificação Semanal"
                                disabled={processing}
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => updateData('description', e.target.value)}
                                placeholder="Descreva os procedimentos desta rotina..."
                                rows={3}
                                disabled={processing}
                            />
                        </div>
                    </div>

                    {/* Trigger Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Configuração do Trigger</h3>

                        <div className="space-y-3">
                            <Label>Tipo de Trigger*</Label>
                            <RadioGroup
                                value={data.trigger_type}
                                onValueChange={(value: 'runtime_hours' | 'calendar_days') => updateData('trigger_type', value)}
                                disabled={processing}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="runtime_hours" id="runtime_hours" />
                                    <Label htmlFor="runtime_hours" className="flex items-center gap-2 cursor-pointer">
                                        <Clock className="h-4 w-4" />
                                        <div>
                                            <div className="font-medium">Horas de Operação ⏱️</div>
                                            <div className="text-sm text-muted-foreground">
                                                Baseado nas horas de funcionamento do ativo
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="calendar_days" id="calendar_days" />
                                    <Label htmlFor="calendar_days" className="flex items-center gap-2 cursor-pointer">
                                        <Calendar className="h-4 w-4" />
                                        <div>
                                            <div className="font-medium">Dias Calendário 📅</div>
                                            <div className="text-sm text-muted-foreground">
                                                Baseado em dias corridos (calendário)
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                            {errors.trigger_type && <p className="text-sm text-destructive">{errors.trigger_type}</p>}
                        </div>

                        {data.trigger_type === 'runtime_hours' && (
                            <div className="space-y-2">
                                <Label htmlFor="trigger_runtime_hours">Intervalo de Horas*</Label>
                                <Input
                                    id="trigger_runtime_hours"
                                    type="number"
                                    min={1}
                                    max={10000}
                                    value={data.trigger_runtime_hours || ''}
                                    onChange={(e) => updateData('trigger_runtime_hours', parseInt(e.target.value) || null)}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="Ex: 500"
                                    disabled={processing}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Manutenção será devido após essa quantidade de horas de operação (1-10.000 horas)
                                </p>
                                {errors.trigger_runtime_hours && <p className="text-sm text-destructive">{errors.trigger_runtime_hours}</p>}
                            </div>
                        )}

                        {data.trigger_type === 'calendar_days' && (
                            <div className="space-y-2">
                                <Label htmlFor="trigger_calendar_days">Intervalo de Dias*</Label>
                                <Input
                                    id="trigger_calendar_days"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.trigger_calendar_days || ''}
                                    onChange={(e) => updateData('trigger_calendar_days', parseInt(e.target.value) || null)}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="Ex: 30"
                                    disabled={processing}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Manutenção será devido após essa quantidade de dias (1-365 dias)
                                </p>
                                {errors.trigger_calendar_days && <p className="text-sm text-destructive">{errors.trigger_calendar_days}</p>}
                            </div>
                        )}
                    </div>

                    {/* Execution Mode */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Modo de Execução</h3>

                        <div className="space-y-3">
                            <Label>Modo de Execução*</Label>
                            <RadioGroup
                                value={data.execution_mode}
                                onValueChange={(value: 'automatic' | 'manual') => updateData('execution_mode', value)}
                                disabled={processing}
                            >
                                <div className="flex items-start space-x-2">
                                    <RadioGroupItem value="automatic" id="automatic" className="mt-1" />
                                    <Label htmlFor="automatic" className="flex items-start gap-3 cursor-pointer">
                                        <Clock className="h-5 w-5 mt-0.5 shrink-0" />
                                        <div>
                                            <div className="font-medium">Automático</div>
                                            <div className="text-sm text-muted-foreground">
                                                Sistema gera ordens automaticamente baseado no gatilho configurado
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <RadioGroupItem value="manual" id="manual" className="mt-1" />
                                    <Label htmlFor="manual" className="flex items-start gap-3 cursor-pointer">
                                        <Hand className="h-5 w-5 mt-0.5 shrink-0" />
                                        <div>
                                            <div className="font-medium">Manual</div>
                                            <div className="text-sm text-muted-foreground">
                                                Usuário cria ordens quando necessário
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Work Order Generation Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Configurações de Geração de Ordens</h3>

                        {data.execution_mode === 'automatic' && (
                            <div className="space-y-2">
                                <Label htmlFor="advance_generation_hours">Horas de Antecedência*</Label>
                                <Input
                                    id="advance_generation_hours"
                                    type="number"
                                    min={1}
                                    max={168}
                                    value={data.advance_generation_hours}
                                    onChange={(e) => updateData('advance_generation_hours', parseInt(e.target.value) || 24)}
                                    disabled={processing}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Gerar ordem de serviço essa quantidade de horas antes do vencimento (1-168 horas)
                                </p>
                                {errors.advance_generation_hours && <p className="text-sm text-destructive">{errors.advance_generation_hours}</p>}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="auto_approve_work_orders"
                                    checked={data.auto_approve_work_orders}
                                    onCheckedChange={(checked) => {
                                        if (canApproveWorkOrders) {
                                            updateData('auto_approve_work_orders', checked);
                                        }
                                    }}
                                    disabled={!canApproveWorkOrders || processing}
                                    className={!canApproveWorkOrders ? 'opacity-50 cursor-not-allowed' : ''}
                                />
                                <div className="space-y-1 flex-1">
                                    <Label
                                        htmlFor="auto_approve_work_orders"
                                        className={`cursor-pointer ${!canApproveWorkOrders ? 'opacity-50' : ''}`}
                                    >
                                        Aprovar automaticamente as ordens geradas
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {canApproveWorkOrders
                                            ? 'Ordens criadas desta rotina pularão o processo de aprovação'
                                            : 'Requer permissão de aprovação de ordens de serviço'}
                                    </p>
                                    {!canApproveWorkOrders && (
                                        <div className="flex items-center gap-1 text-sm text-amber-600">
                                            <Lock className="h-3 w-3" />
                                            <span>Você precisa da permissão 'work-orders.approve' para habilitar esta opção</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {data.auto_approve_work_orders && canApproveWorkOrders && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        As ordens serão automaticamente aprovadas e prontas para planejamento.
                                        Certifique-se de que esta rotina foi devidamente revisada antes de habilitar esta opção.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {errors.auto_approve_work_orders && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        {errors.auto_approve_work_orders}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>

                    {/* Priority Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Configuração de Prioridade</h3>

                        <div className="space-y-2">
                            <Label htmlFor="default_priority">Prioridade Padrão*</Label>
                            <Select
                                value={data.default_priority}
                                onValueChange={(value: 'emergency' | 'urgent' | 'high' | 'normal' | 'low') => updateData('default_priority', value)}
                                disabled={processing}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_OPTIONS.map((priority) => (
                                        <SelectItem key={priority.value} value={priority.value}>
                                            {priority.label} (Score: {priority.score})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority_score">Pontuação de Prioridade (0-100)*</Label>
                            <Input
                                id="priority_score"
                                type="number"
                                min={0}
                                max={100}
                                value={data.priority_score}
                                onChange={(e) => updateData('priority_score', parseInt(e.target.value) || 0)}
                                disabled={processing}
                            />
                            <p className="text-sm text-muted-foreground">
                                Pontuação numérica para ordenação automática de prioridades
                            </p>
                            {errors.priority_score && <p className="text-sm text-destructive">{errors.priority_score}</p>}
                        </div>
                    </div>

                    {/* Execution History */}
                    {routine && !isNew && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Histórico de Execução</h3>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                {routine.last_execution_completed_at ? (
                                    <div className="space-y-1 text-sm">
                                        <div><strong>Última Execução:</strong> {new Date(routine.last_execution_completed_at).toLocaleString('pt-BR')}</div>
                                        {routine.trigger_type === 'runtime_hours' && routine.last_execution_runtime_hours && (
                                            <div><strong>Horas na Última Execução:</strong> {routine.last_execution_runtime_hours}h</div>
                                        )}
                                        {routine.trigger_type === 'calendar_days' && (
                                            <div><strong>Dias Desde a Última:</strong> {Math.floor((Date.now() - new Date(routine.last_execution_completed_at).getTime()) / (1000 * 60 * 60 * 24))} dias</div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter className="px-6">
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={processing}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing}>
                        <Save className="mr-2 h-4 w-4" />
                        {processing ? 'Salvando...' : 'Salvar'}
                    </Button>
                </SheetFooter>
            </form>
        </SheetContent>
    );

    if (showTrigger) {
        return (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant={triggerVariant} ref={triggerRef}>
                        {triggerIcon || <FileText className="mr-2 h-4 w-4" />}
                        {triggerText}
                    </Button>
                </SheetTrigger>
                {sheetContent}
            </Sheet>
        );
    }

    return (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            {sheetContent}
        </Sheet>
    );
};

export default EditRoutineSheet;
