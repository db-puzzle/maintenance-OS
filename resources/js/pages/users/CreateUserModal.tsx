import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, UserPlus, Building2, MapPin, Hash, Eye, Wrench, Shield } from 'lucide-react';
import { useForm } from '@inertiajs/react';
interface Role {
    id: number;
    name: string;
    description?: string;
    display_name?: string;
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
interface CreateUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roles: Role[];
    assignableEntities: AssignableEntities;
}
// Define which entity types are relevant for each role
const roleEntityMapping: Record<string, string[]> = {
    'Administrator': [], // No entity selection needed
    'Plant Manager': ['plants'],
    'Area Manager': ['areas'],
    'Sector Manager': ['sectors'],
    'Maintenance Supervisor': ['plants', 'areas', 'sectors'], // Can supervise at any level
    'Technician': ['plants', 'areas', 'sectors'], // Can work at any level
    'Viewer': ['plants', 'areas', 'sectors'], // Can be assigned to any level
};
// Role icons for better visual identification
const roleIcons: Record<string, React.ReactNode> = {
    'Administrator': <Shield className="h-4 w-4" />,
    'Plant Manager': <Building2 className="h-4 w-4" />,
    'Area Manager': <MapPin className="h-4 w-4" />,
    'Sector Manager': <Hash className="h-4 w-4" />,
    'Maintenance Supervisor': <Wrench className="h-4 w-4" />,
    'Technician': <Wrench className="h-4 w-4" />,
    'Viewer': <Eye className="h-4 w-4" />,
};
export function CreateUserModal({ open, onOpenChange, roles, assignableEntities }: CreateUserModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [selectedEntities, setSelectedEntities] = useState<{
        plants: number[];
        areas: number[];
        sectors: number[];
    }>({
        plants: [],
        areas: [],
        sectors: [],
    });
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: '',
        entity_assignments: {
            plants: [] as number[],
            areas: [] as number[],
            sectors: [] as number[],
        },
    });
    const selectedRole = roles.find(r => r.id.toString() === data.role_id);
    const applicableEntityTypes = selectedRole ? roleEntityMapping[selectedRole.name] || [] : [];
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Update form data with selected entities
        setData('entity_assignments', selectedEntities);
        // Submit the form
        post('/users', {
            onSuccess: () => {
                reset();
                setSelectedEntities({ plants: [], areas: [], sectors: [] });
                setShowPassword(false);
                onOpenChange(false);
            },
        });
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
    const getRoleDescription = (roleName: string) => {
        // First, try to get the description from the selected role object
        const role = roles.find(r => r.name === roleName);
        if (role?.description) {
            return role.description;
        }
        // Fallback to hardcoded descriptions for backward compatibility
        const descriptions: Record<string, string> = {
            'Administrator': 'Full system access with all permissions',
            'Plant Manager': 'Manage all resources within assigned plants',
            'Area Manager': 'Manage resources within assigned areas',
            'Sector Manager': 'Manage resources within assigned sectors',
            'Maintenance Supervisor': 'Execute and supervise maintenance tasks at plant, area, or sector level',
            'Technician': 'Execute maintenance tasks at plant, area, sector, or individual asset level',
            'Viewer': 'Read-only access to assigned resources at any level',
        };
        return descriptions[roleName] || '';
    };
    const handleEntityToggle = (type: 'plants' | 'areas' | 'sectors', entityId: number) => {
        setSelectedEntities(prev => ({
            ...prev,
            [type]: prev[type].includes(entityId)
                ? prev[type].filter(id => id !== entityId)
                : [...prev[type], entityId]
        }));
    };
    const handleSelectAll = (type: 'plants' | 'areas' | 'sectors') => {
        const entities = assignableEntities[type];
        setSelectedEntities(prev => ({
            ...prev,
            [type]: prev[type].length === entities.length ? [] : entities.map(e => e.id)
        }));
    };
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            reset();
            setSelectedEntities({ plants: [], areas: [], sectors: [] });
            setShowPassword(false);
        }
        onOpenChange(newOpen);
    };
    const renderEntitySection = (type: 'plants' | 'areas' | 'sectors', icon: React.ReactNode, label: string) => {
        const entities = assignableEntities[type];
        const selected = selectedEntities[type];
        if (!applicableEntityTypes.includes(type) || entities.length === 0) {
            return null;
        }
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                        {icon}
                        {label}
                    </Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll(type)}
                    >
                        {selected.length === entities.length ? 'Deselect All' : 'Select All'}
                    </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {entities.map((entity) => (
                        <div key={entity.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${type}-${entity.id}`}
                                checked={selected.includes(entity.id)}
                                onCheckedChange={() => handleEntityToggle(type, entity.id)}
                            />
                            <Label
                                htmlFor={`${type}-${entity.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                            >
                                {entity.name}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>Create User</DialogTitle>
                    <DialogDescription>Add a new user with role-based permissions</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
                    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
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
                                    Select a role to determine the user's base permissions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Select Role</Label>
                                    <Select
                                        value={data.role_id}
                                        onValueChange={(value) => {
                                            setData('role_id', value);
                                            // Reset entity selections when role changes
                                            setSelectedEntities({ plants: [], areas: [], sectors: [] });
                                        }}
                                    >
                                        <SelectTrigger className={errors.role_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Choose a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        {roleIcons[role.name]}
                                                        {role.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.role_id && (
                                        <p className="text-sm text-red-500">{errors.role_id}</p>
                                    )}
                                    {selectedRole && (
                                        <p className="text-sm text-muted-foreground">
                                            {getRoleDescription(selectedRole.name)}
                                        </p>
                                    )}
                                </div>
                                {selectedRole && selectedRole.name !== 'Administrator' && (
                                    <>
                                        <Separator />
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Assign to Entities</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Select the specific {applicableEntityTypes.join(', ')} this user will have access to.
                                                    {applicableEntityTypes.length > 1 && ' You can select from multiple categories.'}
                                                </p>
                                            </div>
                                            {renderEntitySection('plants', <Building2 className="h-4 w-4" />, 'Plants')}
                                            {renderEntitySection('areas', <MapPin className="h-4 w-4" />, 'Areas')}
                                            {renderEntitySection('sectors', <Hash className="h-4 w-4" />, 'Sectors')}
                                            {applicableEntityTypes.length > 0 &&
                                                assignableEntities.plants.length === 0 &&
                                                assignableEntities.areas.length === 0 &&
                                                assignableEntities.sectors.length === 0 && (
                                                    <Alert>
                                                        <AlertCircle className="h-4 w-4" />
                                                        <AlertDescription>
                                                            No entities are available for assignment. Please ensure you have the necessary permissions
                                                            to assign users to entities.
                                                        </AlertDescription>
                                                    </Alert>
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
                                The user will receive an email with their login credentials.
                                {selectedRole && selectedRole.name === 'Administrator' &&
                                    ' As an Administrator, they will have full system access.'}
                                {selectedRole && selectedRole.name !== 'Administrator' &&
                                    ' Their permissions will be automatically configured based on the selected role and assigned entities.'}
                            </AlertDescription>
                        </Alert>
                    </form>
                </ScrollArea>
                <DialogFooter className="px-6 pb-6">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={processing}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create User
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 