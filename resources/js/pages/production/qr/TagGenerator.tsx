import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    QrCode,
    Download,
    Package,
    Factory,
    FileText,
    Loader2,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import axios from 'axios';
interface QrTagTemplate {
    id: number;
    name: string;
    type: string;
    is_default: boolean;
}
interface Props {
    templates: QrTagTemplate[];
}
export default function TagGenerator({ templates }: Props) {
    const [generating, setGenerating] = useState(false);
    const [selectedType, setSelectedType] = useState<'item' | 'order'>('item');
    const [batchIds, setBatchIds] = useState<string>('');
    const [generatedUrls, setGeneratedUrls] = useState<{ pdf_url?: string; preview_url?: string } | null>(null);
    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Etiquetas QR', href: route('production.qr-tags.index') },
        { title: 'Gerador', href: '' }
    ];
    const form = useForm({
        itemNumber: '',
        orderNumber: '',
    });
    const generateSingleTag = async (type: 'item' | 'order', id: string) => {
        setGenerating(true);
        setGeneratedUrls(null);
        try {
            const response = await axios.post(
                type === 'item'
                    ? route('production.qr-tags.item', id)
                    : route('production.qr-tags.order', id)
            );
            if (response.data.success) {
                setGeneratedUrls(response.data);
                toast.success('Etiqueta QR gerada com sucesso!');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Erro ao gerar etiqueta');
            } else {
                toast.error('Erro ao gerar etiqueta');
            }
        } finally {
            setGenerating(false);
        }
    };
    const generateBatch = async () => {
        if (!batchIds.trim()) {
            toast.error('Por favor, insira os IDs para gerar em lote');
            return;
        }
        setGenerating(true);
        setGeneratedUrls(null);
        try {
            const ids = batchIds.split(',').map(id => id.trim()).filter(Boolean);
            const response = await axios.post(route('production.qr-tags.batch'), {
                type: selectedType,
                ids: ids.map(id => parseInt(id))
            });
            if (response.data.success) {
                setGeneratedUrls(response.data);
                if (response.data.queued) {
                    toast.info(response.data.message);
                } else {
                    toast.success('Etiquetas QR geradas com sucesso!');
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Erro ao gerar etiquetas em lote');
            } else {
                toast.error('Erro ao gerar etiquetas em lote');
            }
        } finally {
            setGenerating(false);
        }
    };
    const handleSingleGeneration = () => {
        const id = selectedType === 'item' ? form.data.itemNumber : form.data.orderNumber;
        if (!id) {
            toast.error(`Por favor, insira o ${selectedType === 'item' ? 'número do item' : 'número da ordem'}`);
            return;
        }
        generateSingleTag(selectedType, id);
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gerador de Etiquetas QR" />
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <QrCode className="h-6 w-6" />
                        Gerador de Etiquetas QR
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gere etiquetas com códigos QR para itens e ordens de manufatura
                    </p>
                </div>
                <Tabs defaultValue="single" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">Individual</TabsTrigger>
                        <TabsTrigger value="batch">Em Lote</TabsTrigger>
                    </TabsList>
                    {/* Single Generation */}
                    <TabsContent value="single" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gerar Etiqueta Individual</CardTitle>
                                <CardDescription>
                                    Selecione o tipo e insira o identificador do recurso
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant={selectedType === 'item' ? 'default' : 'outline'}
                                        onClick={() => setSelectedType('item')}
                                        className="h-24"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="h-6 w-6" />
                                            <span>Item</span>
                                        </div>
                                    </Button>
                                    <Button
                                        variant={selectedType === 'order' ? 'default' : 'outline'}
                                        onClick={() => setSelectedType('order')}
                                        className="h-24"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Factory className="h-6 w-6" />
                                            <span>Ordem</span>
                                        </div>
                                    </Button>
                                </div>
                                {selectedType === 'item' ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="itemNumber">Número do Item</Label>
                                        <Input
                                            id="itemNumber"
                                            placeholder="Ex: ITM-001"
                                            value={form.data.itemNumber}
                                            onChange={(e) => form.setData('itemNumber', e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSingleGeneration()}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="orderNumber">Número da Ordem</Label>
                                        <Input
                                            id="orderNumber"
                                            placeholder="Ex: OM-2024-001"
                                            value={form.data.orderNumber}
                                            onChange={(e) => form.setData('orderNumber', e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSingleGeneration()}
                                        />
                                    </div>
                                )}
                                <Button
                                    onClick={handleSingleGeneration}
                                    disabled={generating}
                                    className="w-full"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Gerar Etiqueta
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {/* Batch Generation */}
                    <TabsContent value="batch" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gerar Etiquetas em Lote</CardTitle>
                                <CardDescription>
                                    Gere múltiplas etiquetas de uma vez
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant={selectedType === 'item' ? 'default' : 'outline'}
                                        onClick={() => setSelectedType('item')}
                                    >
                                        <Package className="mr-2 h-4 w-4" />
                                        Itens
                                    </Button>
                                    <Button
                                        variant={selectedType === 'order' ? 'default' : 'outline'}
                                        onClick={() => setSelectedType('order')}
                                    >
                                        <Factory className="mr-2 h-4 w-4" />
                                        Ordens
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="batchIds">
                                        IDs (separados por vírgula)
                                    </Label>
                                    <Input
                                        id="batchIds"
                                        placeholder="Ex: 1, 2, 3, 4, 5"
                                        value={batchIds}
                                        onChange={(e) => setBatchIds(e.target.value)}
                                    />
                                    <p className="text-sm text-gray-500">
                                        Insira os IDs dos {selectedType === 'item' ? 'itens' : 'ordens'} separados por vírgula
                                    </p>
                                </div>
                                <Alert>
                                    <AlertDescription>
                                        Para lotes com mais de 10 etiquetas, a geração será processada em segundo plano
                                        e você receberá uma notificação quando estiver pronta.
                                    </AlertDescription>
                                </Alert>
                                <Button
                                    onClick={generateBatch}
                                    disabled={generating}
                                    className="w-full"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Gerar Lote
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                {/* Generated Results */}
                {generatedUrls && generatedUrls.pdf_url && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-600" />
                                Etiqueta(s) Gerada(s)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant="default"
                                className="w-full"
                                onClick={() => window.open(generatedUrls.pdf_url, '_blank')}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Baixar PDF
                            </Button>
                            {generatedUrls.preview_url && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.open(generatedUrls.preview_url, '_blank')}
                                >
                                    Visualizar
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
                {/* Templates Info */}
                {templates.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Templates Disponíveis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex items-center justify-between p-2 rounded border"
                                    >
                                        <span>{template.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">
                                                {template.type === 'item' ? 'Item' : 'Ordem'}
                                            </span>
                                            {template.is_default && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    Padrão
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}