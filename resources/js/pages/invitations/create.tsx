import React from 'react';
import { Link, useForm, Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface Role {
    id: number;
    name: string;
    is_system: boolean;
}

interface Props {
    roles: Role[];
}

export default function InvitationsCreate({ roles }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        initial_role: '',
        message: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('invitations.store'), {
            onSuccess: () => reset(),
        });
    };

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Usuários', href: '#' },
        { title: 'Convites', href: '/invitations' },
        { title: 'Criar', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Convidar Novo Usuário" />

            <div className="bg-background flex-shrink-0 border-b">
                <div className="px-6 py-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Convidar Novo Usuário</h2>
                        <p className="text-sm text-muted-foreground">
                            Envie um convite para um novo usuário se juntar ao sistema
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto py-6">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-lg bg-white p-6 shadow">
                        <Link
                            href={route('invitations.index')}
                            className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                        >
                            ← Voltar para convites
                        </Link>

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <Label htmlFor="email">
                                    Endereço de Email *
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="mt-1"
                                    autoComplete="email"
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-destructive">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="initial_role">
                                    Função Inicial (Opcional)
                                </Label>
                                <Select
                                    value={data.initial_role}
                                    onValueChange={(value) => setData('initial_role', value)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Selecione uma função..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.name}>
                                                {role.name}
                                                {role.is_system && (
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        (Sistema)
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.initial_role && (
                                    <p className="mt-1 text-sm text-destructive">{errors.initial_role}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="message">
                                    Mensagem Pessoal (Opcional)
                                </Label>
                                <Textarea
                                    id="message"
                                    name="message"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    rows={3}
                                    className="mt-1"
                                    placeholder="Adicione uma mensagem de boas-vindas personalizada..."
                                    maxLength={500}
                                />
                                <div className="mt-1 flex justify-between text-xs text-gray-500">
                                    <span>Máximo 500 caracteres</span>
                                    <span>{data.message.length}/500</span>
                                </div>
                                {errors.message && (
                                    <p className="mt-1 text-sm text-destructive">{errors.message}</p>
                                )}
                            </div>

                            <Alert>
                                <InfoIcon className="h-4 w-4" />
                                <AlertDescription>
                                    O usuário receberá um email com um link seguro para completar seu
                                    registro. O link expira em 7 dias.
                                </AlertDescription>
                            </Alert>

                            <div className="flex items-center justify-end gap-4">
                                <Link href={route('invitations.index')}>
                                    <Button type="button" variant="outline">
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Enviando...' : 'Enviar Convite'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 