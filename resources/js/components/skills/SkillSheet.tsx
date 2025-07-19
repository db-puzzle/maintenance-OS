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

interface Skill {
    id: number;
    name: string;
    description: string | null;
    category: string;
    active: boolean;
}

interface SkillSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    skill?: Skill | null;
    onClose: () => void;
}

const categories = [
    'Técnica',
    'Elétrica',
    'Mecânica',
    'Instrumentação',
    'Segurança',
    'Qualidade',
    'Gestão',
    'Informática',
    'Idiomas',
    'Outras',
];

export default function SkillSheet({ open, onOpenChange, skill, onClose }: SkillSheetProps) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        description: '',
        category: 'Técnica',
        active: true,
    });

    useEffect(() => {
        if (skill) {
            setData({
                name: skill.name,
                description: skill.description || '',
                category: skill.category,
                active: skill.active,
            });
        } else {
            reset();
        }
    }, [skill]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (skill) {
            put(route('skills.update', skill.id), {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    reset();
                },
            });
        } else {
            post(route('skills.store'), {
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
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{skill ? 'Editar Habilidade' : 'Nova Habilidade'}</SheetTitle>
                    <SheetDescription>
                        {skill
                            ? 'Atualize as informações da habilidade'
                            : 'Preencha as informações para criar uma nova habilidade'}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Ex: Soldagem MIG/MAG"
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria *</Label>
                        <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category && (
                            <p className="text-sm text-destructive">{errors.category}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Descreva a habilidade..."
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
                                Habilidades inativas não aparecem para seleção
                            </p>
                        </div>
                        <Switch
                            id="active"
                            checked={data.active}
                            onCheckedChange={(checked) => setData('active', checked)}
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
                            {processing ? 'Salvando...' : skill ? 'Atualizar' : 'Criar'}
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