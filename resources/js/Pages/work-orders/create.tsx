import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import ItemSelect from '@/components/ItemSelect';
import { toast } from 'sonner';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Save, Send, Clock, Activity, Droplet, AlertTriangle, Wrench, RefreshCw, Eye, Thermometer, Package, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

// Icon mapping for work order types
const iconMap = {
    'clock': Clock,
    'activity': Activity,
    'droplet': Droplet,
    'alert-triangle': AlertTriangle,
    'tool': Wrench,
    'refresh-cw': RefreshCw,
    'eye': Eye,
    'thermometer': Thermometer,
    'package': Package,
    'trending-up': TrendingUp,
    'zap': Zap,
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/home',
    },
    {
        title: 'Ordens de Serviço',
        href: '/maintenance/work-orders',
    },
    {
        title: 'Nova Ordem',
        href: '/maintenance/work-orders/create',
    },
];

interface Props {
    workOrderTypes: Array<{ id: number; name: string; category: string; icon?: string }>;
    plants: Array<{ id: number; name: string }>;
    areas: Array<{ id: number; name: string; plant_id: number }>;
    sectors: Array<{ id: number; name: string; area_id: number }>;
    assets: Array<{ id: number; tag: string; name: string; plant_id: number; area_id: number; sector_id?: number }>;
    forms: Array<{ id: number; name: string }>;
}

export default function CreateWorkOrder({
    workOrderTypes,
    plants,
    areas,
    sectors,
    assets,
    forms
}: Props) {
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    // Transform workOrderTypes to include actual icon components
    const workOrderTypesWithIcons = workOrderTypes.map(type => ({
        ...type,
        icon: type.icon && iconMap[type.icon as keyof typeof iconMap] ? iconMap[type.icon as keyof typeof iconMap] : undefined
    }));

    const { data, setData, post, processing, errors } = useForm({
        // Step 1: Basic Information
        work_order_type_id: '',
        work_order_category: 'corrective' as 'corrective' | 'preventive' | 'inspection' | 'project',
        title: '',
        description: '',

        // Step 2: Asset Selection
        plant_id: '',
        area_id: '',
        sector_id: '',
        asset_id: '',

        // Step 3: Priority & Due Date
        priority: 'normal' as 'emergency' | 'urgent' | 'high' | 'normal' | 'low',
        priority_score: 40,
        requested_due_date: '',
        downtime_required: false,

        // Step 4: Initial Assignment
        form_id: '',
        external_reference: '',
        warranty_claim: false,
        tags: [] as string[],

        // Hidden fields
        source_type: 'manual' as const,
    });

    // Filter areas based on selected plant
    const filteredAreas = areas.filter(area => area.plant_id === parseInt(data.plant_id));

    // Filter sectors based on selected area
    const filteredSectors = sectors.filter(sector => sector.area_id === parseInt(data.area_id));

    // Filter assets based on selections
    const filteredAssets = assets.filter(asset => {
        if (data.sector_id) {
            return asset.sector_id === parseInt(data.sector_id);
        }
        if (data.area_id) {
            return asset.area_id === parseInt(data.area_id);
        }
        if (data.plant_id) {
            return asset.plant_id === parseInt(data.plant_id);
        }
        return true;
    });

    // Update priority score based on priority
    const updatePriorityScore = (priority: string) => {
        const scores = {
            emergency: 100,
            urgent: 80,
            high: 60,
            normal: 40,
            low: 20,
        };
        setData({
            ...data,
            priority: priority as any,
            priority_score: scores[priority as keyof typeof scores],
        });
    };

    const handleSubmit = (e: React.FormEvent, isDraft = false) => {
        e.preventDefault();

        const url = isDraft ?
            route('work-orders.store', { draft: true }) :
            route('work-orders.store');

        post(url, {
            onSuccess: () => {
                toast.success(isDraft ?
                    'Rascunho salvo com sucesso!' :
                    'Ordem de serviço criada com sucesso!'
                );
            },
            onError: () => {
                toast.error('Erro ao salvar ordem de serviço. Verifique os campos.');
            },
        });
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const steps = [
        { number: 1, title: 'Informações Básicas' },
        { number: 2, title: 'Seleção de Ativo' },
        { number: 3, title: 'Prioridade e Prazo' },
        { number: 4, title: 'Atribuição Inicial' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Ordem de Serviço" />

            <div className="mx-auto max-w-4xl space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nova Ordem de Serviço</h1>
                    <p className="text-muted-foreground">
                        Crie uma nova ordem de serviço de manutenção
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex items-center">
                            <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium",
                                currentStep >= step.number
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {step.number}
                            </div>
                            <div className="ml-2">
                                <p className="text-sm font-medium">{step.title}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={cn(
                                    "ml-4 h-0.5 w-20",
                                    currentStep > step.number ? "bg-primary" : "bg-muted"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={(e) => handleSubmit(e)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                            <CardDescription>
                                {currentStep === 1 && "Defina o tipo e as informações básicas da ordem de serviço"}
                                {currentStep === 2 && "Selecione o ativo que receberá a manutenção"}
                                {currentStep === 3 && "Defina a prioridade e o prazo para execução"}
                                {currentStep === 4 && "Configure opções adicionais para a ordem de serviço"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Step 1: Basic Information */}
                            {currentStep === 1 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="work_order_type_id">Tipo de Ordem*</Label>
                                        <ItemSelect
                                            items={workOrderTypesWithIcons}
                                            value={data.work_order_type_id}
                                            onValueChange={(value) => {
                                                const type = workOrderTypes.find(t => t.id.toString() === value);
                                                setData({
                                                    ...data,
                                                    work_order_type_id: value,
                                                    work_order_category: type?.category as any || 'corrective',
                                                });
                                            }}
                                            placeholder="Selecione o tipo"
                                            error={errors.work_order_type_id}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Categoria*</Label>
                                        <RadioGroup
                                            value={data.work_order_category}
                                            onValueChange={(value) => setData('work_order_category', value as any)}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="corrective" id="corrective" />
                                                <Label htmlFor="corrective">Corretiva</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="preventive" id="preventive" />
                                                <Label htmlFor="preventive">Preventiva</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="inspection" id="inspection" />
                                                <Label htmlFor="inspection">Inspeção</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="project" id="project" />
                                                <Label htmlFor="project">Projeto</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Título*</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Digite um título descritivo"
                                            error={errors.title}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descrição</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Descreva o problema ou serviço necessário"
                                            rows={4}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Step 2: Asset Selection */}
                            {currentStep === 2 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="plant_id">Planta*</Label>
                                        <ItemSelect
                                            items={plants}
                                            value={data.plant_id}
                                            onValueChange={(value) => {
                                                setData({
                                                    ...data,
                                                    plant_id: value,
                                                    area_id: '',
                                                    sector_id: '',
                                                    asset_id: '',
                                                });
                                            }}
                                            placeholder="Selecione a planta"
                                            error={errors.plant_id}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="area_id">Área*</Label>
                                        <ItemSelect
                                            items={filteredAreas}
                                            value={data.area_id}
                                            onValueChange={(value) => {
                                                setData({
                                                    ...data,
                                                    area_id: value,
                                                    sector_id: '',
                                                    asset_id: '',
                                                });
                                            }}
                                            placeholder="Selecione a área"
                                            error={errors.area_id}
                                            disabled={!data.plant_id}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sector_id">Setor</Label>
                                        <ItemSelect
                                            items={filteredSectors}
                                            value={data.sector_id}
                                            onValueChange={(value) => {
                                                setData({
                                                    ...data,
                                                    sector_id: value,
                                                    asset_id: '',
                                                });
                                            }}
                                            placeholder="Selecione o setor (opcional)"
                                            error={errors.sector_id}
                                            disabled={!data.area_id}
                                            canClear
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="asset_id">Ativo*</Label>
                                        <ItemSelect
                                            items={filteredAssets.map(asset => ({
                                                ...asset,
                                                name: `${asset.tag} - ${asset.name}`,
                                            }))}
                                            value={data.asset_id}
                                            onValueChange={(value) => setData('asset_id', value)}
                                            placeholder="Selecione o ativo"
                                            error={errors.asset_id}
                                            disabled={!data.area_id}
                                            searchable
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Step 3: Priority & Due Date */}
                            {currentStep === 3 && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Prioridade*</Label>
                                        <RadioGroup
                                            value={data.priority}
                                            onValueChange={updatePriorityScore}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="emergency" id="emergency" />
                                                <Label htmlFor="emergency" className="text-red-600">
                                                    Emergência (Score: 100)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="urgent" id="urgent" />
                                                <Label htmlFor="urgent" className="text-orange-600">
                                                    Urgente (Score: 80)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="high" id="high" />
                                                <Label htmlFor="high" className="text-yellow-600">
                                                    Alta (Score: 60)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="normal" id="normal" />
                                                <Label htmlFor="normal" className="text-blue-600">
                                                    Normal (Score: 40)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="low" id="low" />
                                                <Label htmlFor="low" className="text-gray-600">
                                                    Baixa (Score: 20)
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="priority_score">Score de Prioridade</Label>
                                        <Input
                                            id="priority_score"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={data.priority_score}
                                            onChange={(e) => setData('priority_score', parseInt(e.target.value))}
                                            placeholder="0-100"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Ajuste fino da prioridade (0-100)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="requested_due_date">Data de Vencimento Solicitada*</Label>
                                        <Input
                                            id="requested_due_date"
                                            type="datetime-local"
                                            value={data.requested_due_date}
                                            onChange={(e) => setData('requested_due_date', e.target.value)}
                                            error={errors.requested_due_date}
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="downtime_required"
                                            checked={data.downtime_required}
                                            onCheckedChange={(checked) => setData('downtime_required', checked as boolean)}
                                        />
                                        <Label htmlFor="downtime_required">
                                            Requer parada do equipamento
                                        </Label>
                                    </div>
                                </>
                            )}

                            {/* Step 4: Initial Assignment */}
                            {currentStep === 4 && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="form_id">Template de Formulário</Label>
                                        <ItemSelect
                                            items={forms}
                                            value={data.form_id}
                                            onValueChange={(value) => setData('form_id', value)}
                                            placeholder="Selecione um formulário (opcional)"
                                            canClear
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Selecione um formulário para definir as tarefas
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="external_reference">Referência Externa</Label>
                                        <Input
                                            id="external_reference"
                                            value={data.external_reference}
                                            onChange={(e) => setData('external_reference', e.target.value)}
                                            placeholder="Número do pedido, ticket, etc."
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="warranty_claim"
                                            checked={data.warranty_claim}
                                            onCheckedChange={(checked) => setData('warranty_claim', checked as boolean)}
                                        />
                                        <Label htmlFor="warranty_claim">
                                            Solicitação de garantia
                                        </Label>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tags">Tags</Label>
                                        <Input
                                            id="tags"
                                            placeholder="Digite tags separadas por vírgula"
                                            onBlur={(e) => {
                                                const tags = e.target.value
                                                    .split(',')
                                                    .map(tag => tag.trim())
                                                    .filter(tag => tag);
                                                setData('tags', tags);
                                            }}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Tags ajudam na organização e busca
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Navigation Buttons */}
                    <div className="mt-6 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit(route('work-orders.index'))}
                        >
                            Cancelar
                        </Button>

                        <div className="flex items-center gap-2">
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={prevStep}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Anterior
                                </Button>
                            )}

                            {currentStep < totalSteps ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                >
                                    Próximo
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={(e) => handleSubmit(e, true)}
                                        disabled={processing}
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Rascunho
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        Criar Ordem
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 