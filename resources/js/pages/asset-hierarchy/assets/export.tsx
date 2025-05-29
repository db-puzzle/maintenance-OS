import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Download } from 'lucide-react';
import * as React from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

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
        href: '/asset-hierarchy/assets',
    },
    {
        title: 'Ativos',
        href: '/asset-hierarchy/assets',
    },
    {
        title: 'Exportar Ativos',
        href: '/asset-hierarchy/assets/exportar',
    },
];

export default function ExportAsset() {
    const { post, processing } = useForm();

    const [showProgress, setShowProgress] = React.useState(false);
    const [progressValue, setProgressValue] = React.useState(0);
    const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowProgress(true);
        setProgressValue(0);
        setDownloadUrl(null);

        post(route('asset-hierarchy.assets.export.data'), {
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
                setProgressValue((prev) => Math.min(prev + 10, 90));
            }, 500);

            return () => clearInterval(timer);
        }
    }, [showProgress, progressValue]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Exportar Ativos" />

            <CadastroLayout>
                <div className="max-w-2xl space-y-6">
                    <HeadingSmall title="Exportar Ativos" description="Exporte os ativos para um arquivo CSV" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Button type="submit" className="w-fit" disabled={processing}>
                                <Download className="mr-2 h-4 w-4" />
                                {processing ? 'Exportando...' : 'Exportar CSV'}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('asset-hierarchy.assets')}>Cancelar</Link>
                            </Button>
                        </div>
                    </form>
                </div>

                <Dialog open={showProgress} onOpenChange={setShowProgress}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Exportação de Ativos</DialogTitle>
                            <DialogDescription>Faça o download do arquivo CSV.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <div className="text-muted-foreground flex justify-between text-sm">
                                    <span>{progressValue === 100 ? 'Exportação concluída!' : 'Gerando arquivo...'}</span>
                                    <span>{progressValue}%</span>
                                </div>
                                <Progress value={progressValue} className="w-full" />
                            </div>
                        </div>

                        <DialogFooter className="justify-center pt-2 sm:justify-center">
                            {progressValue === 100 ? (
                                <Button onClick={handleDownload} className="w-fit">
                                    <Download className="mr-2 h-4 w-4" />
                                    Baixar Arquivo
                                </Button>
                            ) : (
                                <Button disabled className="w-fit">
                                    <Download className="mr-2 h-4 w-4" />
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
