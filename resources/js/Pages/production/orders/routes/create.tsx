import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Search, Clock, Users, Layers } from 'lucide-react';
import { ManufacturingOrder, RouteTemplate } from '@/types/production';
import { cn } from '@/lib/utils';
interface Props {
    order: ManufacturingOrder;
    templates: RouteTemplate[];
}
interface ExtendedRouteTemplate extends RouteTemplate {
    steps_count?: number;
    total_time?: number;
    usage_count?: number;
}
export default function CreateRoute({ order, templates }: Props) {
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<ExtendedRouteTemplate | null>(null);
    const extendedTemplates = templates as ExtendedRouteTemplate[];
    const filteredTemplates = extendedTemplates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const handleTemplateSelect = (template: ExtendedRouteTemplate) => {
        setSelectedTemplate(template);
    };
    const handleUseTemplate = () => {
        if (selectedTemplate) {
            router.post(route('production.orders.routes.store', order.id), {
                template_id: selectedTemplate.id,
                name: selectedTemplate.name,
                description: selectedTemplate.description,
            });
        }
    };
    const handleCustomRoute = () => {
        router.post(route('production.orders.routes.store', order.id), {
            name: `Roteiro para ${order.item?.name || 'Item'}`,
            description: `Roteiro customizado para ordem ${order.order_number}`,
        });
    };
    const breadcrumbs = [
        { title: 'Produção', href: '/production' },
        { title: 'Ordens', href: route('production.orders.index') },
        { title: order.order_number, href: route('production.orders.show', order.id) },
        { title: 'Criar Roteiro', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Criar Roteiro - ${order.order_number}`} />
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Context Bar */}
                <div className="bg-muted/50 border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Ordem</p>
                            <p className="font-medium">{order.order_number}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Item</p>
                            <p className="font-medium">{order.item?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Quantidade</p>
                            <p className="font-medium">{order.quantity}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Data Prevista</p>
                            <p className="font-medium">
                                {order.planned_end_date
                                    ? new Date(order.planned_end_date).toLocaleDateString('pt-BR')
                                    : '-'
                                }
                            </p>
                        </div>
                    </div>
                </div>
                {/* Title */}
                <div>
                    <h1 className="text-2xl font-semibold">Criar Roteiro de Produção</h1>
                    <p className="text-muted-foreground mt-1">
                        Escolha como deseja criar o roteiro para esta ordem
                    </p>
                </div>
                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Template Option */}
                    <Card
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary"
                        onClick={() => setShowTemplateSelector(true)}
                    >
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle>Usar Template</CardTitle>
                            <CardDescription>Caminho recomendado</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                Crie rapidamente um roteiro baseado em templates pré-definidos
                            </p>
                            <Badge variant="secondary">
                                {templates.length} templates disponíveis
                            </Badge>
                        </CardContent>
                    </Card>
                    {/* Custom Option */}
                    <Card
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary"
                        onClick={handleCustomRoute}
                    >
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                                <Plus className="h-8 w-8 text-secondary-foreground" />
                            </div>
                            <CardTitle>Roteiro Customizado</CardTitle>
                            <CardDescription>Criar do zero</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Configure manualmente cada etapa do processo de produção
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Template Selection Modal */}
            <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Selecionar Template de Roteiro</DialogTitle>
                        <DialogDescription>
                            Escolha um template compatível com o item {order.item?.name || 'selecionado'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Buscar templates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        {/* Template List */}
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {filteredTemplates.map((template) => (
                                    <Card
                                        key={template.id}
                                        className={cn(
                                            "cursor-pointer transition-all duration-200",
                                            selectedTemplate?.id === template.id
                                                ? "border-primary shadow-md"
                                                : "hover:shadow-sm"
                                        )}
                                        onClick={() => handleTemplateSelect(template)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <CardTitle className="text-base">
                                                        {template.name}
                                                    </CardTitle>
                                                    {template.description && (
                                                        <CardDescription className="mt-1">
                                                            {template.description}
                                                        </CardDescription>
                                                    )}
                                                </div>
                                                {selectedTemplate?.id === template.id && (
                                                    <Badge>Selecionado</Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Layers className="h-4 w-4" />
                                                    <span>{template.steps_count || 0} etapas</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>{template.total_time || 0} min</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    <span>Usado {template.usage_count || 0}x</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setShowTemplateSelector(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleUseTemplate}
                                disabled={!selectedTemplate}
                            >
                                Usar Template
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 