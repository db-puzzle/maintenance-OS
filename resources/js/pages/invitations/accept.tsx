import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, InfoIcon } from 'lucide-react';
interface Props {
    invitation: {
        id: number;
        email: string;
        token: string;
        invited_by: {
            name: string;
        };
        initial_role?: string;
        message?: string;
        expires_at: string;
    };
}
export default function InvitationsAccept({ invitation }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });
    const [passwordFocus, setPasswordFocus] = useState(false);
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('invitations.accept', invitation.token));
    };
    // Password validation checks
    const passwordChecks = {
        length: data.password.length >= 8,
        uppercase: /[A-Z]/.test(data.password),
        number: /[0-9]/.test(data.password),
    };
    const PasswordCheck = ({ valid, text }: { valid: boolean; text: string }) => (
        <div className="flex items-center gap-2 text-sm">
            {valid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={valid ? 'text-green-600' : 'text-gray-500'}>{text}</span>
        </div>
    );
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <img
                    className="mx-auto h-12 w-auto"
                    src="/logo.svg"
                    alt="Logo"
                />
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Complete seu cadastro
                </h2>
            </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
                    <div className="mb-6">
                        <Alert>
                            <InfoIcon className="h-4 w-4" />
                            <AlertDescription>
                                Você foi convidado por <strong>{invitation.invited_by.name}</strong> para
                                participar do nosso sistema.
                                {invitation.initial_role && (
                                    <span className="mt-1 block">
                                        Você será atribuído à função de <strong>{invitation.initial_role}</strong>.
                                    </span>
                                )}
                            </AlertDescription>
                        </Alert>
                        {invitation.message && (
                            <div className="mt-4 rounded-md bg-gray-50 p-4">
                                <p className="text-sm text-gray-700">
                                    <strong>Mensagem pessoal:</strong> "{invitation.message}"
                                </p>
                            </div>
                        )}
                    </div>
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={invitation.email}
                                className="mt-1 bg-gray-100"
                                disabled
                            />
                        </div>
                        <div>
                            <Label htmlFor="name">Nome completo *</Label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={data.name}
                                className="mt-1"
                                autoComplete="name"
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoFocus
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="password">Senha *</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1"
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                onFocus={() => setPasswordFocus(true)}
                                onBlur={() => setPasswordFocus(false)}
                                required
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-destructive">{errors.password}</p>
                            )}
                            {(passwordFocus || data.password) && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs font-medium text-gray-700">Requisitos da senha:</p>
                                    <PasswordCheck
                                        valid={passwordChecks.length}
                                        text="Pelo menos 8 caracteres"
                                    />
                                    <PasswordCheck
                                        valid={passwordChecks.uppercase}
                                        text="Uma letra maiúscula"
                                    />
                                    <PasswordCheck
                                        valid={passwordChecks.number}
                                        text="Um número"
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="password_confirmation">Confirmar senha *</Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                className="mt-1"
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                            />
                            {errors.password_confirmation && (
                                <p className="mt-1 text-sm text-destructive">
                                    {errors.password_confirmation}
                                </p>
                            )}
                        </div>
                        <div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing ? 'Criando conta...' : 'Completar cadastro'}
                            </Button>
                        </div>
                    </form>
                    <div className="mt-6 text-center text-xs text-gray-500">
                        Este convite expira em{' '}
                        {new Date(invitation.expires_at).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
} 