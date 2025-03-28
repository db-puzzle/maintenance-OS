import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Importar Equipamentos',
        href: '#',
    },
];

export default function ImportEquipment() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Equipamentos" />

            <CadastroLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight">Importar Equipamentos</h1>
                                <p className="text-sm text-muted-foreground">
                                    Importe equipamentos através de um arquivo CSV
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('cadastro.equipamentos')}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Voltar
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Upload do Arquivo</CardTitle>
                            <CardDescription>
                                Selecione um arquivo CSV com os dados dos equipamentos para importar
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file">Arquivo CSV</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="file"
                                            type="file"
                                            accept=".csv"
                                            className="flex-1"
                                        />
                                        <Button>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Importar
                                        </Button>
                                    </div>
                                </div>
                                <Separator />
                                <div className="text-sm text-muted-foreground">
                                    <p className="font-medium mb-2">Formato esperado do CSV:</p>
                                    <pre className="bg-muted p-4 rounded-md">
                                        {`tag,nome,tipo_equipamento_id,area_id,setor_id,fabricante,ano_fabricacao
EQUIP001,Bomba Centrífuga,1,1,1,WEG,2020
EQUIP002,Compressor,2,2,2,Atlas Copco,2021`}
                                    </pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 