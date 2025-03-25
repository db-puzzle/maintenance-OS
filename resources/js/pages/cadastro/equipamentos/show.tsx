import { type BreadcrumbItem, type Equipment, type EquipmentType, type Area, type Plant, type Sector } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

interface Props {
    equipment: Equipment & {
        equipment_type: EquipmentType;
        area: Area;
        sector: Sector;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Detalhes',
        href: '#',
    },
];

export default function Show({ equipment }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Equipamento ${equipment.tag}`} />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight">{equipment.tag}</h1>
                                <div className="text-sm text-muted-foreground">
                                    {equipment.equipment_type?.name ?? 'Tipo não definido'}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('cadastro.equipamentos')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Voltar
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={route('cadastro.equipamentos.edit', equipment.id)}>
                                        Editar
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="informacoes" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="informacoes">Informações Gerais</TabsTrigger>
                            <TabsTrigger value="solicitacoes">Solicitações de Usuário</TabsTrigger>
                            <TabsTrigger value="planos">Planos de Manutenção</TabsTrigger>
                            <TabsTrigger value="log">Central de Logs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="informacoes">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informações Gerais</CardTitle>
                                    <CardDescription>Informações básicas sobre o equipamento</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Coluna 1: Foto */}
                                        <div className="flex flex-col h-full">
                                            <Label className="mb-2">Foto do Equipamento</Label>
                                            <div className="flex-1 relative rounded-lg overflow-hidden bg-muted min-h-[238px] max-h-[238px]">
                                                {equipment.photo_path ? (
                                                    <img
                                                        src={`/storage/${equipment.photo_path}`}
                                                        alt={`Foto do equipamento ${equipment.tag}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                        <Camera className="w-12 h-12" />
                                                        <span className="text-sm">Sem foto</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Coluna 2: Informações Básicas */}
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>TAG</Label>
                                                <div className="text-base text-muted-foreground">{equipment.tag}</div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Tipo</Label>
                                                <div className="text-base text-muted-foreground">{equipment.equipment_type?.name ?? '-'}</div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Número Serial</Label>
                                                <div className="text-base text-muted-foreground">{equipment.serial_number ?? '-'}</div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Fabricante</Label>
                                                <div className="text-base text-muted-foreground">{equipment.manufacturer ?? '-'}</div>
                                            </div>
                                        </div>

                                        {/* Coluna 3: Localização e Ano */}
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>Planta</Label>
                                                <div className="text-base">
                                                    {equipment.area?.plant ? (
                                                        <Link
                                                            href={route('cadastro.plantas.show', equipment.area.plant.id)}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {equipment.area.plant.name}
                                                        </Link>
                                                    ) : '-'}
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Área</Label>
                                                <div className="text-base">
                                                    {equipment.area ? (
                                                        <Link
                                                            href={route('cadastro.areas.show', equipment.area.id)}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {equipment.area.name}
                                                        </Link>
                                                    ) : '-'}
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Setor</Label>
                                                <div className="text-base">
                                                    {equipment.sector ? (
                                                        <Link
                                                            href={route('cadastro.setores.show', equipment.sector.id)}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {equipment.sector.name}
                                                        </Link>
                                                    ) : '-'}
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Ano de Fabricação</Label>
                                                <div className="text-base text-muted-foreground">{equipment.manufacturing_year ?? '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="solicitacoes">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Solicitações de Usuário</CardTitle>
                                    <CardDescription>Histórico de solicitações relacionadas a este equipamento</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground py-6 text-center">
                                        Em breve...
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="planos">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Planos de Manutenção</CardTitle>
                                    <CardDescription>Planos e cronogramas de manutenção do equipamento</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground py-6 text-center">
                                        Em breve...
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="log">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Log de Operação / Manutenção</CardTitle>
                                    <CardDescription>Histórico de operações e manutenções realizadas</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground py-6 text-center">
                                        Em breve...
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 