import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/asset-hierarchy/show-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Building2, Globe, Mail, Phone, MapPin, FileText, Package } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import EmptyCard from '@/components/ui/empty-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AssetData {
    id: number;
    tag: string;
    description: string;
    serial_number: string | null;
    part_number: string | null;
    asset_type: string | null;
    plant: string | null;
    area: string | null;
    sector: string | null;
}

interface ManufacturerData {
    id: number;
    name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    notes?: string | null;
    assets_count?: number;
    assets?: AssetData[];
}

interface Props {
    manufacturer: ManufacturerData;
}

export default function Show({ manufacturer }: Props) {
    const [isEditing, setIsEditing] = useState(false);

    const { data, setData, put, processing, errors, reset } = useForm({
        name: manufacturer.name,
        website: manufacturer.website || '',
        email: manufacturer.email || '',
        phone: manufacturer.phone || '',
        country: manufacturer.country || '',
        notes: manufacturer.notes || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Manutenção',
            href: '/maintenance-dashboard',
        },
        {
            title: 'Hierarquia de Ativos',
            href: '/asset-hierarchy',
        },
        {
            title: 'Fabricantes',
            href: '/asset-hierarchy/manufacturers',
        },
        {
            title: manufacturer.name,
            href: '#',
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        put(route('asset-hierarchy.manufacturers.update', manufacturer.id), {
            onSuccess: () => {
                toast.success('Fabricante atualizado com sucesso!');
                setIsEditing(false);
            },
            onError: () => {
                toast.error('Erro ao atualizar fabricante');
            },
        });
    };

    const handleCancel = () => {
        reset();
        setIsEditing(false);
    };

    const tabs = [
        {
            id: 'informacoes',
            label: 'Informações Gerais',
            content: (
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Fabricante</Label>
                                {isEditing ? (
                                    <>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-destructive">{errors.name}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{manufacturer.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country">País</Label>
                                {isEditing ? (
                                    <>
                                        <Input
                                            id="country"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                        />
                                        {errors.country && (
                                            <p className="text-sm text-destructive">{errors.country}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{manufacturer.country || '-'}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                {isEditing ? (
                                    <>
                                        <Input
                                            id="website"
                                            type="url"
                                            value={data.website}
                                            onChange={(e) => setData('website', e.target.value)}
                                            placeholder="https://www.exemplo.com"
                                        />
                                        {errors.website && (
                                            <p className="text-sm text-destructive">{errors.website}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {manufacturer.website ? (
                                            <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {manufacturer.website}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                {isEditing ? (
                                    <>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="contato@exemplo.com"
                                        />
                                        {errors.email && (
                                            <p className="text-sm text-destructive">{errors.email}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {manufacturer.email ? (
                                            <a href={`mailto:${manufacturer.email}`} className="text-primary hover:underline">
                                                {manufacturer.email}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                {isEditing ? (
                                    <>
                                        <Input
                                            id="phone"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="+55 11 99999-9999"
                                        />
                                        {errors.phone && (
                                            <p className="text-sm text-destructive">{errors.phone}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{manufacturer.phone || '-'}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Observações</Label>
                            {isEditing ? (
                                <>
                                    <Textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Observações sobre o fabricante..."
                                        className="min-h-[100px]"
                                    />
                                    {errors.notes && (
                                        <p className="text-sm text-destructive">{errors.notes}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{manufacturer.notes || '-'}</p>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <Button type="button" onClick={() => setIsEditing(true)}>
                                Editar
                            </Button>
                        )}
                    </form>
                </div>
            ),
        },
        {
            id: 'ativos',
            label: 'Ativos Associados',
            content: (
                <div className="p-6">
                    {manufacturer.assets_count === 0 ? (
                        <EmptyCard
                            icon={Package}
                            title="Nenhum ativo associado"
                            description="Este fabricante ainda não possui ativos associados."
                            primaryButtonText="Ver todos os ativos"
                            primaryButtonAction={() => router.visit(route('asset-hierarchy.assets'))}
                        />
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tag</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Número Serial</TableHead>
                                        <TableHead>Part Number</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Localização</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manufacturer.assets?.map((asset) => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={route('asset-hierarchy.assets.show', asset.id)}
                                                    className="text-primary hover:underline"
                                                >
                                                    {asset.tag}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{asset.description || '-'}</TableCell>
                                            <TableCell>{asset.serial_number || '-'}</TableCell>
                                            <TableCell>{asset.part_number || '-'}</TableCell>
                                            <TableCell>{asset.asset_type || '-'}</TableCell>
                                            <TableCell>
                                                {[asset.plant, asset.area, asset.sector]
                                                    .filter(Boolean)
                                                    .join(' > ') || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Fabricante ${manufacturer.name}`} />

            <ShowLayout
                title={manufacturer.name}
                subtitle={`${manufacturer.assets_count || 0} ativo(s) associado(s)`}
                breadcrumbs={breadcrumbs}
                editRoute=""
                backRoute={route('asset-hierarchy.manufacturers')}
                tabs={tabs}
                defaultActiveTab="informacoes"
            />
        </AppLayout>
    );
} 