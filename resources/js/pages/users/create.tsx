import React from 'react';
import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, UserPlus, Building2, MapPin, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Role {
    id: number;
    name: string;
}

interface Entity {
    id: number;
    name: string;
}

interface AssignableEntities {
    plants: Entity[];
    areas: Entity[];
    sectors: Entity[];
}

interface Props {
    roles: Role[];
    assignableEntities: AssignableEntities;
}

export default function UserCreate({ roles, assignableEntities }: Props) {
    const [selectedEntityType, setSelectedEntityType] = useState<'Plant' | 'Area' | 'Sector' | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: '',
        entity_type: '',
        entity_id: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/users');
    };

    const generatePassword = () => {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setData({
            ...data,
            password,
            password_confirmation: password,
        });
        setShowPassword(true);
    };

    const getEntityOptions = () => {
        switch (selectedEntityType) {
            case 'Plant':
                return assignableEntities.plants;
            case 'Area':
                return assignableEntities.areas;
            case 'Sector':
                return assignableEntities.sectors;
            default:
                return [];
        }
    };

    const getRoleDescription = (roleName: string) => {
        const descriptions: Record<string, string> = {
            'Administrator': 'Full system access with all permissions',
            'Plant Manager': 'Manage all resources within assigned plants',
            'Area Manager': 'Manage resources within assigned areas',
            'Sector Manager': 'Manage resources within assigned sectors',
            'Maintenance Supervisor': 'Execute maintenance tasks across assigned scope',
            'Technician': 'Execute maintenance on specific assets',
            'Viewer': 'Read-only access to assigned resources',
        };
        return descriptions[roleName] || '';
    };

    return (
        <AppLayout>
            <Head title="Create User" />

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" asChild>
                        <Link href="/users">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Create User</h2>
                        <p className="text-muted-foreground">Add a new user with role-based permissions</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>Enter the user's basic details</CardDescription>
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
                                <div className="flex items-center justify-between">
                                    <Label>Password</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={generatePassword}
                                    >
                                        Generate Password
                                    </Button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Enter password"
                                            className={errors.password ? 'border-red-500' : ''}
                                        />
                                        {errors.password && (
                                            <p className="text-sm text-red-500">{errors.password}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Input
                                            id="password_confirmation"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            placeholder="Confirm password"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="show-password"
                                        checked={showPassword}
                                        onChange={(e) => setShowPassword(e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <Label htmlFor="show-password" className="text-sm font-normal">
                                        Show password
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Role Assignment */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Role Assignment</CardTitle>
                            <CardDescription>
                                Select a role and entity to automatically apply appropriate permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Select Role</Label>
                                <Select
                                    value={data.role_id}
                                    onValueChange={(value) => setData('role_id', value)}
                                >
                                    <SelectTrigger className={errors.role_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Choose a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.role_id && (
                                    <p className="text-sm text-red-500">{errors.role_id}</p>
                                )}
                                {data.role_id && (
                                    <p className="text-sm text-muted-foreground">
                                        {getRoleDescription(roles.find(r => r.id.toString() === data.role_id)?.name || '')}
                                    </p>
                                )}
                            </div>

                            {data.role_id && (
                                <>
                                    <Separator />

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Assign to Entity (Optional)</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Select an entity to automatically grant role permissions scoped to that entity
                                            </p>
                                        </div>

                                        <RadioGroup
                                            value={selectedEntityType || ''}
                                            onValueChange={(value) => {
                                                setSelectedEntityType(value as 'Plant' | 'Area' | 'Sector');
                                                setData({
                                                    ...data,
                                                    entity_type: value,
                                                    entity_id: '',
                                                });
                                            }}
                                        >
                                            <div className="grid gap-4 md:grid-cols-3">
                                                {assignableEntities.plants.length > 0 && (
                                                    <div className={cn(
                                                        'flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent',
                                                        selectedEntityType === 'Plant' && 'border-primary bg-accent'
                                                    )}>
                                                        <RadioGroupItem value="Plant" id="plant" />
                                                        <Label htmlFor="plant" className="cursor-pointer flex items-center gap-2">
                                                            <Building2 className="h-4 w-4" />
                                                            Plant
                                                        </Label>
                                                    </div>
                                                )}

                                                {assignableEntities.areas.length > 0 && (
                                                    <div className={cn(
                                                        'flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent',
                                                        selectedEntityType === 'Area' && 'border-primary bg-accent'
                                                    )}>
                                                        <RadioGroupItem value="Area" id="area" />
                                                        <Label htmlFor="area" className="cursor-pointer flex items-center gap-2">
                                                            <MapPin className="h-4 w-4" />
                                                            Area
                                                        </Label>
                                                    </div>
                                                )}

                                                {assignableEntities.sectors.length > 0 && (
                                                    <div className={cn(
                                                        'flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent',
                                                        selectedEntityType === 'Sector' && 'border-primary bg-accent'
                                                    )}>
                                                        <RadioGroupItem value="Sector" id="sector" />
                                                        <Label htmlFor="sector" className="cursor-pointer flex items-center gap-2">
                                                            <Hash className="h-4 w-4" />
                                                            Sector
                                                        </Label>
                                                    </div>
                                                )}
                                            </div>
                                        </RadioGroup>

                                        {selectedEntityType && (
                                            <div className="space-y-2">
                                                <Label htmlFor="entity">Select {selectedEntityType}</Label>
                                                <Select
                                                    value={data.entity_id}
                                                    onValueChange={(value) => setData('entity_id', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={`Choose a ${selectedEntityType.toLowerCase()}`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {getEntityOptions().map((entity) => (
                                                            <SelectItem key={entity.id} value={entity.id.toString()}>
                                                                {entity.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Alert */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            The user will receive an email with their login credentials. If you selected a role and entity,
                            the appropriate permissions will be automatically granted upon creation.
                        </AlertDescription>
                    </Alert>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Button variant="outline" asChild>
                            <Link href="/users">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 