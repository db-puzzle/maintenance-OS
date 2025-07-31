import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { QrCode, Download, Package, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

interface Item {
    id: number;
    item_number: string;
    name: string;
    description?: string;
    category?: {
        id: number;
        name: string;
    };
}

interface ManufacturingOrder {
    id: number;
    order_number: string;
    quantity: number;
    due_date: string;
    item: Item;
}

interface Template {
    id: number;
    name: string;
    type: string;
    layout: any;
}

interface Props {
    type: 'item' | 'order';
    resource: Item | ManufacturingOrder;
    template: Template | null;
}

export default function TagPreview({ type, resource, template }: Props) {
    const [generating, setGenerating] = React.useState(false);

    const isItem = type === 'item';
    const item = isItem ? (resource as Item) : (resource as ManufacturingOrder).item;
    const displayNumber = isItem
        ? (resource as Item).item_number
        : (resource as ManufacturingOrder).order_number;

    const breadcrumbs = [
        { title: 'Produção', href: '/' },
        { title: 'Etiquetas QR', href: route('production.qr-tags.index') },
        { title: 'Visualizar', href: '' }
    ];

    const generateTag = async () => {
        setGenerating(true);

        try {
            const response = await axios.post(
                isItem
                    ? route('production.qr-tags.item', resource.id)
                    : route('production.qr-tags.order', resource.id)
            );

            if (response.data.success && response.data.pdf_url) {
                window.open(response.data.pdf_url, '_blank');
                toast.success('Etiqueta gerada com sucesso!');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao gerar etiqueta');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Visualizar Etiqueta - ${displayNumber}`} />

            <div className="container mx-auto px-4 py-6 max-w-2xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <QrCode className="h-6 w-6" />
                        Visualizar Etiqueta QR
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                {isItem ? (
                                    <Package className="h-5 w-5" />
                                ) : (
                                    <Factory className="h-5 w-5" />
                                )}
                                {isItem ? 'Item' : 'Ordem de Manufatura'}
                            </CardTitle>
                            <Badge variant="secondary">{displayNumber}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Preview Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                            <div className="text-center space-y-4">
                                <div className="w-32 h-32 mx-auto bg-gray-200 rounded flex items-center justify-center">
                                    <QrCode className="h-20 w-20 text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">{item.name}</p>
                                    <p className="text-sm text-gray-600">{displayNumber}</p>
                                </div>
                                {!isItem && (
                                    <div className="text-sm text-gray-600">
                                        <p>Quantidade: {(resource as ManufacturingOrder).quantity}</p>
                                        <p>
                                            Entrega: {new Date((resource as ManufacturingOrder).due_date).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resource Details */}
                        <div className="space-y-2">
                            <h3 className="font-semibold">Detalhes do {isItem ? 'Item' : 'Pedido'}</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Nome:</span>
                                    <p className="font-medium">{item.name}</p>
                                </div>
                                {item.category && (
                                    <div>
                                        <span className="text-gray-500">Categoria:</span>
                                        <p className="font-medium">{item.category.name}</p>
                                    </div>
                                )}
                                {!isItem && (
                                    <>
                                        <div>
                                            <span className="text-gray-500">Quantidade:</span>
                                            <p className="font-medium">{(resource as ManufacturingOrder).quantity}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Data de Entrega:</span>
                                            <p className="font-medium">
                                                {new Date((resource as ManufacturingOrder).due_date).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {item.description && (
                                <div>
                                    <span className="text-gray-500 text-sm">Descrição:</span>
                                    <p className="text-sm">{item.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Template Info */}
                        {template && (
                            <div className="pt-2 border-t">
                                <p className="text-sm text-gray-500">
                                    Template: <span className="font-medium">{template.name}</span>
                                </p>
                            </div>
                        )}

                        {/* Action Button */}
                        <Button
                            onClick={generateTag}
                            disabled={generating}
                            className="w-full"
                            size="lg"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {generating ? 'Gerando...' : 'Gerar e Baixar PDF'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}