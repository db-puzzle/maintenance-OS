import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Download, CheckCircle2 } from 'lucide-react';
import * as React from "react";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import CadastroLayout from '@/layouts/asset-hierarchy/layout';

interface PageProps {
    success?: boolean;
    download_url?: string;
    error?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cadastro',
        href: '/asset-hierarchy/equipamentos',
    },
    {
        title: 'Equipamentos',
        href: '/asset-hierarchy/equipamentos',
    },
    {
        title: 'Exportar Equipamentos',
        href: '/asset-hierarchy/equipamentos/exportar',
    },
];

export default function ExportEquipment() {
    const { post, processing } = useForm();

    const [showProgress, setShowProgress] = React.useState(false);
    const [progressValue, setProgressValue] = React.useState(0);
    const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowProgress(true);
        setProgressValue(0);
        setDownloadUrl(null);
        
        post(route('asset-hierarchy.equipamentos.export.data'), {
            onSuccess: (page) => {
                setProgressValue(100);
                const props = page.props as unknown as PageProps;
                
                if (props.success && props.download_url) {
                    setDownloadUrl(props.download_url);
                } else {
                    if (props.error) {
                        // TODO: Mostrar mensagem de erro para o usuário
                    }
                }
            },
            onError: (errors) => {
                setShowProgress(false);
            },
        });
    };

    const handleDownload = () => {
        if (downloadUrl) {
            try {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', '');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setShowProgress(false);
                setDownloadUrl(null);
            } catch (error) {
                // TODO: Tratar erro de download
            }
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
                        <div className="flex items-center gap-4">
                            <Button type="submit" className="w-fit" disabled={processing}>
                                <Download className="h-4 w-4 mr-2" />
                                {processing ? 'Exportando...' : 'Exportar CSV'}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('asset-hierarchy.equipamentos')}>
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
                                Faça o download do arquivo CSV.
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