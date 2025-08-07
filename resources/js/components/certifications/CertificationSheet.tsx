import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface Certification {
    id: number;
    name: string;
    description: string | null;
    issuing_organization: string;
    validity_period_days: number | null;
    active: boolean;
}

interface CertificationSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    certification?: Certification | null;
    onClose: () => void;
}

const validityOptions = [
    { label: 'Sem validade', value: '0' },
    { label: '6 meses', value: '180' },
    { label: '1 ano', value: '365' },
    { label: '2 anos', value: '730' },
    { label: '3 anos', value: '1095' },
    { label: '5 anos', value: '1825' },
    { label: 'Personalizado', value: 'custom' },
];

export default function CertificationSheet({ open, onOpenChange, certification, onClose }: CertificationSheetProps) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        description: '',
        issuing_organization: '',
        validity_period_days: '',
        validity_option: '0',
        active: true as boolean,
    });

    useEffect(() => {
        if (certification) {
            const validityDays = certification.validity_period_days?.toString() || '0';
            const validityOption = validityOptions.find(opt => opt.value === validityDays)?.value || 'custom';

            setData({
                name: certification.name,
                description: certification.description || '',
                issuing_organization: certification.issuing_organization,
                validity_period_days: validityDays,
                validity_option: validityOption,
                active: certification.active,
            });
        } else {
            reset();
        }
    }, [certification]);

    const handleValidityOptionChange = (value: string) => {
        setData('validity_option', value);
        if (value !== 'custom') {
            setData('validity_period_days', value);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            name: data.name,
            description: data.description,
            issuing_organization: data.issuing_organization,
            validity_period_days: data.validity_period_days === '0' ? null : parseInt(data.validity_period_days),
            active: data.active,
        };

        if (certification) {
            put(route('certifications.update', certification.id), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
            });
        } else {
            post(route('certifications.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
            });
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            reset();
        }
        onOpenChange(newOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="sm:max-w-[425px]">
                <SheetHeader>
                    <SheetTitle>{certification ? 'Editar Certificação' : 'Nova Certificação'}</SheetTitle>
                    <SheetDescription>
                        {certification
                            ? 'Atualize as informações da certificação'
                            : 'Preencha as informações para criar uma nova certificação'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ex: NR-10 - Segurança em Instalações Elétricas"
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="issuing_organization">Organização Emissora *</Label>
                        <Input
                            id="issuing_organization"
                            value={data.issuing_organization}
                            onChange={(e) => setData('issuing_organization', e.target.value)}
                            placeholder="Ex: SENAI, ABRAMAN, etc."
                        />
                        {errors.issuing_organization && (
                            <p className="text-sm text-destructive">{errors.issuing_organization}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="validity">Período de Validade</Label>
                        <Select value={data.validity_option} onValueChange={handleValidityOptionChange}>
                            <SelectTrigger id="validity">
                                <SelectValue placeholder="Selecione o período de validade" />
                            </SelectTrigger>
                            <SelectContent>
                                {validityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {data.validity_option === 'custom' && (
                            <Input
                                type="number"
                                value={data.validity_period_days}
                                onChange={(e) => setData('validity_period_days', e.target.value)}
                                placeholder="Número de dias"
                                min="1"
                                className="mt-2"
                            />
                        )}

                        {errors.validity_period_days && (
                            <p className="text-sm text-destructive">{errors.validity_period_days}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descreva a certificação..."
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">{errors.description}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="active">Status</Label>
                            <p className="text-sm text-muted-foreground">
                                Certificações inativas não aparecem para seleção
                            </p>
                        </div>
                        <Switch
                            id="active"
                            checked={data.active}
                            onCheckedChange={(checked) => setData('active', !!checked)}
                        />
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Por favor, corrija os erros acima antes de continuar.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={processing} className="flex-1">
                            {processing ? 'Salvando...' : certification ? 'Atualizar' : 'Criar'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}