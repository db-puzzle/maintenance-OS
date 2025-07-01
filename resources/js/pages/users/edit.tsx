import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';

interface User {
    id: number;
    name: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
    created_at: string;
    updated_at: string;
}

interface Props {
    user: User;
}

export default function UserEdit({ user }: Props) {
    const getInitials = useInitials();
    const initials = getInitials(user.name);

    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/users/${user.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit User - ${user.name}`} />

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild>
                        <Link href={`/users/${user.id}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Edit User</h2>
                            <p className="text-muted-foreground">Update user information</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>Update the user's basic details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="John Doe"
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="john@example.com"
                                        className={errors.email ? 'border-red-500' : ''}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email}</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground">Roles</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {user.roles.map((role) => (
                                            <span
                                                key={role.id}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                                            >
                                                {role.name}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        To manage roles and permissions, use the permissions page
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="text-muted-foreground">Created</Label>
                                        <p className="text-sm">{new Date(user.created_at).toLocaleString()}</p>
                                    </div>

                                    <div>
                                        <Label className="text-muted-foreground">Last Updated</Label>
                                        <p className="text-sm">{new Date(user.updated_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Changing the email address will require the user to verify their new email address.
                            They will receive a verification email at the new address.
                        </AlertDescription>
                    </Alert>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" asChild>
                            <Link href={`/users/${user.id}`}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 