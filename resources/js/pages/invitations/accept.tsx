import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Mail, UserCircle, XCircle } from 'lucide-react';

interface RoleAssignment {
    role_name: string;
    entity_type: string | null;
    entity_name: string | null;
    full_display: string;
}

interface Props {
    invitation: {
        id: number;
        email: string;
        token: string;
        invited_by: {
            name: string;
        };
        initial_roles?: RoleAssignment[];
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
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <Head title="Complete seu cadastro" />

            <div className="flex w-full max-w-4xl flex-col gap-6">
                {/* Logo */}
                <Link href={route('home')} className="flex items-center gap-2 self-center font-medium">
                    <div className="flex h-9 w-9 items-center justify-center">
                        <AppLogoIcon className="size-9 fill-current text-black dark:text-white" />
                    </div>
                </Link>

                {/* Main Card with Two Columns */}
                <Card className="rounded-xl">
                    <CardHeader className="px-10 pt-8 pb-0 text-center">
                        <CardTitle className="text-xl">Complete seu cadastro</CardTitle>
                        <CardDescription>
                            Você foi convidado para participar do sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 py-8">
                        <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr]">
                            {/* Left Column - Form */}
                            <div className="flex flex-col gap-6">
                                <form onSubmit={submit} className="flex flex-col gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={invitation.email}
                                            className="bg-muted"
                                            disabled
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nome completo *</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            name="name"
                                            value={data.name}
                                            autoComplete="name"
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            autoFocus
                                            placeholder="Seu nome completo"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Senha *</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            name="password"
                                            value={data.password}
                                            autoComplete="new-password"
                                            onChange={(e) => setData('password', e.target.value)}
                                            onFocus={() => setPasswordFocus(true)}
                                            onBlur={() => setPasswordFocus(false)}
                                            required
                                            placeholder="Crie uma senha segura"
                                        />
                                        <InputError message={errors.password} />
                                        {(passwordFocus || data.password) && (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-muted-foreground text-xs font-medium">
                                                    Requisitos da senha:
                                                </p>
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

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">Confirmar senha *</Label>
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            name="password_confirmation"
                                            value={data.password_confirmation}
                                            autoComplete="new-password"
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            required
                                            placeholder="Confirme sua senha"
                                        />
                                        <InputError message={errors.password_confirmation} />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={processing}>
                                        {processing ? 'Criando conta...' : 'Concluir cadastro'}
                                    </Button>
                                </form>
                            </div>

                            {/* Separator */}
                            <div className="relative hidden md:flex">
                                <Separator orientation="vertical" className="h-full" />
                            </div>

                            {/* Right Column - Invitation Info */}
                            <div className="flex flex-col gap-6 md:border-t-0 border-t pt-6 md:pt-0">
                                <div>
                                    <h3 className="mb-4 text-sm font-semibold">Detalhes do convite</h3>

                                    <div className="space-y-4">
                                        {/* Invited By */}
                                        <div className="flex items-start gap-3">
                                            <UserCircle className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs">Convidado por</p>
                                                <p className="text-sm font-medium">{invitation.invited_by.name}</p>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="flex items-start gap-3">
                                            <Mail className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs">Email do convite</p>
                                                <p className="text-sm font-medium">{invitation.email}</p>
                                            </div>
                                        </div>

                                        {/* Roles */}
                                        {invitation.initial_roles && invitation.initial_roles.length > 0 && (
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-muted-foreground text-xs mb-1.5">
                                                        {invitation.initial_roles.length === 1 ? 'Função atribuída' : 'Funções atribuídas'}
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {invitation.initial_roles.map((role, index) => (
                                                            <li key={index} className="text-sm">
                                                                <span className="font-medium">{role.role_name}</span>
                                                                {role.entity_name && role.entity_type && (
                                                                    <span className="text-muted-foreground">
                                                                        {' '}(para {role.entity_type}: {role.entity_name})
                                                                    </span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 