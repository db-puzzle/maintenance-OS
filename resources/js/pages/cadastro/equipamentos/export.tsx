import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Download, CheckCircle2 } from 'lucide-react';
import * as React from "react";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from "@/components/ui/progress";
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

interface PageProps {
    success?: boolean;
    download_url?: string;
    error?: string;
}

interface FlashMessage {
    success?: boolean;
    download_url?: string;
    filename?: string;
    error?: string;
}

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
        title: 'Exportar Equipamentos',
        href: '/cadastro/equipamentos/exportar',
    },
];

export default function ExportEquipment() {
    const { data, setData, post, processing } = useForm({
        format: 'csv',
    });

    const [showProgress, setShowProgress] = React.useState(false);
    const [progressValue, setProgressValue] = React.useState(0);
    const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowProgress(true);
        setProgressValue(0);
        setDownloadUrl(null);
        
        console.log('Iniciando exportação...', { format: data.format });
        
        post(route('cadastro.equipamentos.export.data'), {
            onSuccess: (page) => {
                setProgressValue(100);
                console.log('Resposta recebida:', page.props);
                
                const props = page.props as unknown as PageProps;
                
                if (props.success && props.download_url) {
                    console.log('URL de download recebida:', props.download_url);
                    setDownloadUrl(props.download_url);
                } else {
                    console.warn('Resposta não contém URL de download:', props);
                    if (props.error) {
                        // TODO: Mostrar mensagem de erro para o usuário
                        console.error('Erro retornado:', props.error);
                    }
                }
            },
            onError: (errors) => {
                console.error('Erro na exportação:', errors);
                setShowProgress(false);
            },
        });
    };

    const handleDownload = () => {
        if (downloadUrl) {
            console.log('Iniciando download do arquivo:', downloadUrl);
            
            try {
                // Cria um link temporário para fazer o download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', ''); // Isso força o download ao invés de navegar
                document.body.appendChild(link);
                console.log('Link de download criado:', link);
                
                link.click();
                document.body.removeChild(link);
                console.log('Download iniciado e link removido');

                // Fecha o dialog após iniciar o download
                setShowProgress(false);
                setDownloadUrl(null);
            } catch (error) {
                console.error('Erro ao fazer download:', error);
            }
        } else {
            console.warn('URL de download não disponível');
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
            <Head title="Exportar Equipamentos" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall 
                        title="Exportar Equipamentos" 
                        description="Exporte os equipamentos para um arquivo CSV" 
                    />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="format" className="flex items-center gap-1">
                                    Formato do Arquivo
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select 
                                    value={data.format} 
                                    onValueChange={(value) => setData('format', value)}
                                >
                                    <SelectTrigger id="format">
                                        <SelectValue placeholder="Selecione o formato" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button type="submit" className="w-fit" disabled={processing}>
                                <Download className="h-4 w-4 mr-2" />
                                {processing ? 'Exportando...' : 'Exportar'}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('cadastro.equipamentos')}>
                                    Cancelar
                                </Link>
                            </Button>
                        </div>
                    </form>
                </div>

                <Dialog open={showProgress} onOpenChange={setShowProgress}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Exportação de Equipamentos</DialogTitle>
                            <DialogDescription>
                                Faça o download do arquivo CSV ou Excel.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{progressValue === 100 ? 'Exportação concluída!' : 'Gerando arquivo...'}</span>
                                    <span>{progressValue}%</span>
                                </div>
                                <Progress value={progressValue} className="w-full" />
                            </div>
                        </div>

                        <DialogFooter className="justify-center sm:justify-center pt-2">
                            {progressValue === 100 ? (
                                <Button onClick={handleDownload} className="w-fit">
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar Arquivo
                                </Button>
                            ) : (
                                <Button disabled className="w-fit">
                                    <Download className="h-4 w-4 mr-2" />
                                    Gerando...
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CadastroLayout>
        </AppLayout>
    );
} 