import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Upload, X, Lightbulb } from 'lucide-react';
import * as React from "react";
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import HeadingSmall from '@/components/heading-small';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';

const importFields = [
    { value: 'id', label: 'ID' },
    { value: 'tag', label: 'Tag' },
    { value: 'serial_number', label: 'Número de Série' },
    { value: 'equipment_type_id', label: 'Tipo de Equipamento' },
    { value: 'description', label: 'Descrição' },
    { value: 'manufacturer', label: 'Fabricante' },
    { value: 'manufacturing_year', label: 'Ano de Fabricação' },
    { value: 'plant_id', label: 'Planta' },
    { value: 'area_id', label: 'Área' },
    { value: 'sector_id', label: 'Setor' },
];

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Equipamentos',
        href: '/cadastro/equipamentos',
    },
    {
        title: 'Importar Equipamentos',
        href: '/cadastro/equipamentos/importar',
    },
];

export default function ImportEquipment() {
    const [processing, setProcessing] = React.useState(false);
    const [showProgress, setShowProgress] = React.useState(false);
    const [progressValue, setProgressValue] = React.useState(0);
    const [csvData, setCsvData] = React.useState<{ headers: string[], data: any[] } | null>(null);
    const [showFormat, setShowFormat] = React.useState(true);
    const [showFormatInstructions, setShowFormatInstructions] = React.useState(true);
    const [fieldMapping, setFieldMapping] = React.useState<Record<string, string>>({});
    const [showInstructions, setShowInstructions] = React.useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowProgress(true);
        setProgressValue(0);
        setProcessing(true);
        
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput.files && fileInput.files[0]) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const response = await axios.post(route('cadastro.equipamentos.import.analyze'), formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Accept': 'application/json',
                    }
                });

                console.log('Resposta do servidor:', response.data);
                setCsvData(response.data);
                setShowFormat(false);
                setShowInstructions(true);
                setProgressValue(100);
                setTimeout(() => setShowProgress(false), 1000);
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                setProgressValue(0);
                setShowProgress(false);
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleFieldMappingChange = (csvHeader: string, fieldValue: string) => {
        setFieldMapping(prev => ({
            ...prev,
            [csvHeader]: fieldValue === 'none' ? '' : fieldValue
        }));
    };

    const handleImport = async () => {
        if (!csvData) return;

        setProcessing(true);
        setShowProgress(true);
        setProgressValue(0);

        try {
            const response = await axios.post(route('cadastro.equipamentos.import.data'), {
                data: csvData.data,
                mapping: fieldMapping
            });

            console.log('Importação concluída:', response.data);

            if (response.data.success) {
                // TODO: Mostrar mensagem de sucesso
                setShowFormat(true);
                setCsvData(null);
                setFieldMapping({});
            } else {
                // TODO: Mostrar mensagem de erro
                console.error('Erros na importação:', response.data.errors);
            }
        } catch (error) {
            console.error('Erro ao importar dados:', error);
        } finally {
            setProcessing(false);
            setShowProgress(false);
            setProgressValue(100);
        }
    };

    React.useEffect(() => {
        if (showProgress && progressValue < 100) {
            const timer = setInterval(() => {
                setProgressValue(prev => Math.min(prev + 10, 90));
            }, 500);

            return () => clearInterval(timer);
        }
    }, [showProgress, progressValue]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Equipamentos" />

            <CadastroLayout>
                <div className="space-y-8">
                    <div className="max-w-2xl">
                        <HeadingSmall 
                            title="Importar Equipamentos" 
                            description="Importe equipamentos através de um arquivo CSV" 
                        />

                        <form onSubmit={handleSubmit} className="space-y-8 mt-6">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file">Arquivo CSV</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <Input
                                                id="file"
                                                type="file"
                                                accept=".csv"
                                                className="flex-1 file:mr-4 file:px-2 file:text-sm file:font-semibold"
                                            />
                                        </div>
                                        <Button type="submit" disabled={processing}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            {processing ? 'Analisando...' : 'Analisar'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="w-full">
                        {showFormat ? (
                            <div className="max-w-2xl">
                                {showFormatInstructions && (
                                    <div className="bg-muted rounded-lg p-4 relative">
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="absolute right-2 top-2 h-6 w-6 hover:bg-muted-foreground/20"
                                            onClick={() => setShowFormatInstructions(false)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <div className="space-y-1 pr-8">
                                            <h3 className="text-base font-medium">Formato esperado do CSV</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Seu arquivo CSV deve seguir o formato abaixo para uma importação bem-sucedida.
                                            </p>
                                            <div className="grid grid-cols-3 gap-x-12 gap-y-1 mt-4 font-mono text-sm">
                                                <div>Tag</div>
                                                <div>Número de Série</div>
                                                <div>Tipo de Equipamento</div>
                                                <div>Descrição</div>
                                                <div>Fabricante</div>
                                                <div>Ano de Fabricação</div>
                                                <div>Planta</div>
                                                <div>Área</div>
                                                <div>Setor</div>
                                            </div>
                                            <div className="mt-4 text-sm flex items-center gap-1.5">
                                                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    Use a funcionalidade de exportar para faciliar a criação do modelo do arquivo CSV.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : csvData && (
                            <div className="space-y-8">
                                <div className="max-w-2xl">
                                    {showInstructions && (
                                        <div className="bg-muted rounded-lg p-4 relative">
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                className="absolute right-2 top-2 h-6 w-6 hover:bg-muted-foreground/20"
                                                onClick={() => setShowInstructions(false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <div className="space-y-1 pr-8">
                                                <h3 className="text-base font-medium">Correlacione os campos</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Para cada coluna do seu arquivo CSV, selecione o campo correspondente do sistema. Se uma coluna não deve ser importada, selecione "Não importar".
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {csvData.headers.map((header, index) => (
                                                    <TableHead key={index}>
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={fieldMapping[header] || ''}
                                                                onValueChange={(value) => handleFieldMappingChange(header, value)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione o campo" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Não importar</SelectItem>
                                                                    {importFields.map((field) => (
                                                                        <SelectItem key={field.value} value={field.value}>
                                                                            {field.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="font-bold ml-3">{header}</div>
                                                        </div>
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {csvData.data.slice(0, 10).map((row, rowIndex) => (
                                                <TableRow key={rowIndex}>
                                                    {csvData.headers.map((header, colIndex) => (
                                                        <TableCell key={colIndex} className="ml-3">
                                                            <div className="ml-3">
                                                                {row[header]}
                                                            </div>
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {csvData.data.length > 10 && (
                                        <div className="text-sm text-muted-foreground mt-2">
                                            Mostrando 10 de {csvData.data.length} linhas
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <Button 
                                        onClick={handleImport}
                                        disabled={processing || Object.keys(fieldMapping).length === 0}
                                    >
                                        Importar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 -mt-20">
                    <Button variant="outline" asChild>
                        <Link href={route('cadastro.equipamentos')}>
                            Cancelar
                        </Link>
                    </Button>
                </div>

                <Dialog open={showProgress} onOpenChange={setShowProgress}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Importação de Equipamentos</DialogTitle>
                            <DialogDescription>
                                Importando equipamentos do arquivo CSV.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{progressValue === 100 ? 'Importação concluída!' : 'Importando arquivo...'}</span>
                                    <span>{progressValue}%</span>
                                </div>
                                <Progress value={progressValue} className="w-full" />
                            </div>
                        </div>

                        <DialogFooter className="justify-center sm:justify-center pt-2">
                            <Button disabled className="w-fit">
                                <Upload className="h-4 w-4 mr-2" />
                                {progressValue === 100 ? 'Concluído' : 'Importando...'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CadastroLayout>
        </AppLayout>
    );
} 