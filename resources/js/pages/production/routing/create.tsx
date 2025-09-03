/**
 * @deprecated This page has been replaced with CreateManufacturingRouteDialog modal component.
 * It's kept here for reference but should not be used in production.
 * The routing index page now uses the modal dialog for creating new routings.
 */
import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { createFormAdapter } from '@/utils/form-adapters';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/TextInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

import { ItemSelect } from '@/components/ItemSelect';
import { ManufacturingOrder, Item } from '@/types/production';
interface Props {
    items: Item[];
    orders: ManufacturingOrder[];
}
export default function CreateRouting({ items, orders }: Props) {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '',
        description: '',
        item_id: '',
        manufacturing_order_id: '',
        is_active: true as boolean,
    });

    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(window.route('production.routing.store'), {
            onSuccess: () => {
                toast.success('Roteiro criado com sucesso');
            },
            onError: () => {
                toast.error('Erro ao criar roteiro');
            }
        });
    };
    const breadcrumbs = [
        { title: 'Produção', href: '/production' },
        { title: 'Roteiros', href: route('production.routing.index') },
        { title: 'Novo Roteiro', href: '' }
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Roteiro" />
            <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Novo Roteiro de Produção</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Nome do Roteiro */}
                            <TextInput
                                form={formAdapter}
                                name="name"
                                label="Nome do Roteiro"
                                placeholder="Ex: Roteiro de Montagem Principal"
                                required
                            />
                            {/* Descrição */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Descreva o processo de produção..."
                                    rows={4}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600">{errors.description}</p>
                                )}
                            </div>
                            {/* Item */}
                            <ItemSelect
                                label="Item"
                                items={items}
                                value={data.item_id}
                                onValueChange={(value) => setData('item_id', value)}
                                placeholder="Selecione um item (opcional)"
                                error={errors.item_id}
                            />
                            {/* Ordem de Produção */}
                            <div className="space-y-2">
                                <ItemSelect
                                    label="Ordem de Produção"
                                    items={orders.filter(order => order.status === 'draft' || order.status === 'planned').map(order => ({
                                        id: order.id,
                                        name: `${order.order_number} - ${order.item?.name || 'Item'}`
                                    }))}
                                    value={data.manufacturing_order_id}
                                    onValueChange={(value) => setData('manufacturing_order_id', value)}
                                    placeholder="Selecione uma ordem (opcional)"
                                    error={errors.manufacturing_order_id}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Apenas ordens em rascunho ou planejadas podem receber roteiros
                                </p>
                            </div>
                            {/* Status Ativo */}
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => {
                                        if (typeof checked === 'boolean') {
                                            setData('is_active', checked);
                                        }
                                    }}
                                />
                                <Label htmlFor="is_active">Roteiro Ativo</Label>
                            </div>
                            {/* Botões de Ação */}
                            <div className="flex justify-end space-x-4 pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.visit(window.route('production.routing.index'))}
                                    disabled={processing}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Criar Roteiro
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
} 