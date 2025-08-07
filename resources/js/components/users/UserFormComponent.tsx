import React, { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Save, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useInitials } from '@/hooks/use-initials';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
interface User {
    id: number;
    name: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
    created_at: string;
    updated_at: string;
}
interface UserFormComponentProps {
    user: User;
    initialMode?: 'view' | 'edit';
    onSuccess?: () => void;
    onCancel?: () => void;
    canUpdate?: boolean;
}
export default function UserFormComponent({
    user,
    initialMode = 'view',
    onSuccess,
    onCancel,
    canUpdate = false
}: UserFormComponentProps) {
    const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
    const isViewMode = mode === 'view';
    const getInitials = useInitials();
    const initials = getInitials(user.name);
    // Ensure mode updates when initialMode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);
    const { data, setData, put, processing, errors, clearErrors, reset } = useForm({
        name: user.name,
        email: user.email,
    });
    const handleSave = () => {
        put(route('users.update', user.id), {
            onSuccess: () => {
                toast.success('Usuário atualizado com sucesso!');
                setMode('view');
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.reload();
                }
            },
            onError: () => {
                toast.error('Erro ao atualizar usuário', {
                    description: 'Verifique os campos e tente novamente.',
                });
            },
        });
    };
    const handleCancel = () => {
        if (mode === 'edit') {
            // Reset form to original data
            reset();
            clearErrors();
            setMode('view');
        } else if (onCancel) {
            onCancel();
        }
    };
    const handleEdit = () => {
        setMode('edit');
    };
    const getRoleBadgeColor = (roleName: string) => {
        switch (roleName) {
            case 'Administrator':
                return 'bg-red-500 text-white hover:bg-red-600';
            case 'Plant Manager':
                return 'bg-blue-500 text-white hover:bg-blue-600';
            case 'Area Manager':
                return 'bg-green-500 text-white hover:bg-green-600';
            case 'Sector Manager':
                return 'bg-yellow-500 text-white hover:bg-yellow-600';
            case 'Maintenance Supervisor':
                return 'bg-purple-500 text-white hover:bg-purple-600';
            case 'Technician':
                return 'bg-orange-500 text-white hover:bg-orange-600';
            case 'Viewer':
                return 'bg-gray-500 text-white hover:bg-gray-600';
            default:
                return 'bg-gray-200 text-gray-800 hover:bg-gray-300';
        }
    };
    return (
        <div className="space-y-6">
            {/* Form Fields */}
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/50 px-3 py-2">
                                {data.name}
                            </div>
                        ) : (
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Nome do usuário"
                                className={errors.name ? 'border-red-500' : ''}
                                disabled={processing}
                            />
                        )}
                        {errors.name && !isViewMode && (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        {isViewMode ? (
                            <div className="rounded-md border bg-muted/50 px-3 py-2">
                                {data.email}
                            </div>
                        ) : (
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="email@example.com"
                                className={errors.email ? 'border-red-500' : ''}
                                disabled={processing}
                            />
                        )}
                        {errors.email && !isViewMode && (
                            <p className="text-sm text-red-500">{errors.email}</p>
                        )}
                    </div>
                </div>
                {/* Roles - View Only */}
                <div className="space-y-2">
                    <Label>Funções</Label>
                    <div className="flex flex-wrap gap-2">
                        {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                                <Badge
                                    key={role.id}
                                    className={getRoleBadgeColor(role.name)}
                                >
                                    {role.name}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-sm text-muted-foreground">Nenhuma função atribuída</span>
                        )}
                    </div>
                </div>
                {/* Timestamps - View Only */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Criado em</Label>
                        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                            {new Date(user.created_at).toLocaleString('pt-BR')}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Última atualização</Label>
                        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                            {new Date(user.updated_at).toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>
            {/* Action Buttons */}
            {canUpdate && (
                <div className="flex justify-end gap-2">
                    {isViewMode ? (
                        <Button onClick={handleEdit} variant="default">
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleCancel} variant="outline" disabled={processing}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
} 