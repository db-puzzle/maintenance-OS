import React, { useState, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import {
    User,
    Lock,
    Shield,
    Check,
    ChevronLeft,
    ChevronRight,
    Info,
    Eye,
    EyeOff,
    X,
    Building2,
    MapPin,
    Grid3X3,
    Mail,
    KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import InputError from '@/components/input-error';
import StateButton from '@/components/StateButton';
import { TextInput } from '@/components/TextInput';
import { createFormAdapter } from '@/utils/form-adapters';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Role {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    permissions_count?: number;
    is_system: boolean;
    requires_entity?: boolean;
    entity_type?: 'plant' | 'area' | 'sector';
}

interface RoleAssignment {
    role_id: number;
    role: Role;
    entity_type?: 'plant' | 'area' | 'sector';
    entity_id?: number;
    entity_name?: string;
}

interface Entity {
    id: number;
    name: string;
    type?: 'plant' | 'area' | 'sector';
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

interface StepIndicatorProps {
    steps: Array<{
        number: number;
        title: string;
        icon: React.ReactNode;
    }>;
    currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-between mx-6 px-2 -mt-3">
            {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs",
                                currentStep >= step.number
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {currentStep > step.number ? (
                                <Check className="h-3 w-3" />
                            ) : (
                                step.icon
                            )}
                        </div>
                        <span className={cn(
                            "text-xs hidden sm:inline",
                            currentStep >= step.number
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                        )}>
                            {step.title}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn(
                            "flex-1 h-0.5 mx-2",
                            currentStep > step.number
                                ? "bg-primary"
                                : "bg-muted"
                        )} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export function CreateUserModal({ open, onOpenChange, roles, assignableEntities }: CreateUserModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
    const [showEntitySelector, setShowEntitySelector] = useState<number | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_assignments: [] as Array<{
            role_id: number;
            entity_type?: string;
            entity_id?: number;
        }>,
    });

    // Create form adapter for TextInput components
    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const steps = useMemo(() => [
        { number: 1, title: 'Informações', icon: <User className="h-4 w-4" /> },
        { number: 2, title: 'Senha', icon: <Lock className="h-4 w-4" /> },
        { number: 3, title: 'Função', icon: <Shield className="h-4 w-4" /> },
        { number: 4, title: 'Revisar', icon: <Check className="h-4 w-4" /> },
    ], []);

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleAddRole = (role: Role) => {
        if (role.requires_entity) {
            // Show entity selector for this role
            setShowEntitySelector(role.id);
        } else {
            // Add role without entity scope
            const newAssignment: RoleAssignment = {
                role_id: role.id,
                role: role
            };
            setRoleAssignments([...roleAssignments, newAssignment]);
            updateFormData([...roleAssignments, newAssignment]);
        }
    };

    const handleAddRoleWithEntity = (roleId: number, entityType: string, entityId: number) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        // Check if this exact role-entity combination already exists
        const isDuplicate = roleAssignments.some(
            assignment =>
                assignment.role_id === roleId &&
                assignment.entity_type === entityType &&
                assignment.entity_id === entityId
        );

        if (isDuplicate) {
            // Role already assigned to this entity, just close the selector
            setShowEntitySelector(null);
            return;
        }

        const entity = getEntityById(entityType, entityId);
        const newAssignment: RoleAssignment = {
            role_id: role.id,
            role: role,
            entity_type: entityType as 'plant' | 'area' | 'sector',
            entity_id: entityId,
            entity_name: entity?.name
        };

        setRoleAssignments([...roleAssignments, newAssignment]);
        updateFormData([...roleAssignments, newAssignment]);
        setShowEntitySelector(null);
    };

    const handleRemoveRole = (index: number) => {
        const newAssignments = roleAssignments.filter((_, i) => i !== index);
        setRoleAssignments(newAssignments);
        updateFormData(newAssignments);
    };

    const updateFormData = (assignments: RoleAssignment[]) => {
        setData('role_assignments', assignments.map(a => ({
            role_id: a.role_id,
            entity_type: a.entity_type,
            entity_id: a.entity_id
        })));
    };

    const getEntityById = (type: string, id: number): Entity | undefined => {
        switch (type) {
            case 'plant':
                return assignableEntities.plants.find(p => p.id === id);
            case 'area':
                return assignableEntities.areas.find(a => a.id === id);
            case 'sector':
                return assignableEntities.sectors.find(s => s.id === id);
            default:
                return undefined;
        }
    };

    const getAvailableRoles = () => {
        // Filter out roles that are already assigned (unless they can be assigned multiple times to different entities)
        return roles.filter(role => {
            if (role.requires_entity) {
                // Entity-scoped roles can be assigned multiple times to different entities
                return true;
            }
            // Global roles can only be assigned once
            return !roleAssignments.some(a => a.role_id === role.id);
        });
    };

    const generatePassword = () => {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setData('password', password);
        setData('password_confirmation', password);
        setShowPassword(true);
    };

    const handleSubmit = () => {
        post(route('users.store'), {
            onSuccess: () => {
                reset();
                setCurrentStep(1);
                setRoleAssignments([]);
                setShowEntitySelector(null);
                setShowPassword(false);
                onOpenChange(false);
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
                // Navigate to the step with the first error
                if ((errors.name || errors.email) && currentStep !== 1) {
                    setCurrentStep(1);
                } else if ((errors.password || errors.password_confirmation) && currentStep !== 2) {
                    setCurrentStep(2);
                } else if (errors.role_assignments && currentStep !== 3) {
                    setCurrentStep(3);
                }
            },
        });
    };

    const isStepValid = (step: number) => {
        switch (step) {
            case 1: {
                // Basic info validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !!data.name && !!data.email && emailRegex.test(data.email);
            }
            case 2:
                // Password validation
                return !!data.password && data.password.length >= 8 && data.password === data.password_confirmation;
            case 3:
                // Role selection is optional
                return true;
            case 4:
                // Review step is always valid
                return true;
            default:
                return false;
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            setCurrentStep(1);
            setRoleAssignments([]);
            setShowEntitySelector(null);
            setShowPassword(false);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="!max-w-[50vw] w-[50vw] h-[70vh] flex flex-col p-0">
                <DialogHeader className="mt-4 px-6 py-4 border-b">
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Adicione um novo usuário ao sistema com acesso imediato
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 border-b">
                    <StepIndicator steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Step 1: Basic Information */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-base font-medium mb-4 block">
                                        Informações Básicas do Usuário
                                    </Label>

                                    <div className="space-y-4">
                                        <TextInput
                                            form={formAdapter}
                                            name="name"
                                            label="Nome Completo"
                                            placeholder="João da Silva"
                                            required
                                            helperText="Nome completo do usuário"
                                        />

                                        <TextInput
                                            form={formAdapter}
                                            name="email"
                                            label="Endereço de Email"
                                            placeholder="joao@empresa.com"
                                            type="email"
                                            required
                                            helperText="O usuário usará este email para fazer login"
                                        />
                                    </div>
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <p className="font-medium">Sobre a criação de usuário:</p>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                <li>O usuário terá acesso imediato ao sistema</li>
                                                <li>Você pode gerar uma senha segura automaticamente</li>
                                                <li>As credenciais serão enviadas por email</li>
                                                <li>O usuário pode alterar a senha após o primeiro login</li>
                                            </ul>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Step 2: Password */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <Label className="text-base font-medium">
                                            Definir Senha de Acesso
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={generatePassword}
                                        >
                                            <KeyRound className="h-4 w-4 mr-2" />
                                            Gerar Senha Segura
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <TextInput
                                                form={formAdapter}
                                                name="password"
                                                label="Senha"
                                                placeholder="Digite a senha"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                helperText="Mínimo de 8 caracteres"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>

                                        <TextInput
                                            form={formAdapter}
                                            name="password_confirmation"
                                            label="Confirmar Senha"
                                            placeholder="Digite a senha novamente"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                        />
                                    </div>
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <p className="font-medium">Requisitos de senha:</p>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                <li>Mínimo de 8 caracteres</li>
                                                <li>Recomendado: combinação de letras, números e símbolos</li>
                                                <li>Use o botão "Gerar Senha Segura" para criar automaticamente</li>
                                            </ul>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Step 3: Role Selection */}
                        {currentStep === 3 && (
                            <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
                                {/* Left Side: Available Roles */}
                                <div className="border-r pr-4 flex flex-col min-h-0 overflow-hidden">
                                    <div className="mb-3 flex-shrink-0">
                                        <Label className="text-base font-medium">Funções Disponíveis</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Selecione as funções para atribuir ao usuário
                                        </p>
                                    </div>
                                    <ScrollArea className="flex-1 min-h-0">
                                        <div className="space-y-3 pr-3">
                                            {getAvailableRoles().length > 0 ? (
                                                getAvailableRoles().map((role) => (
                                                    <div key={role.id} className="relative">
                                                        <StateButton
                                                            icon={Shield}
                                                            title={role.display_name || role.name}
                                                            description={role.description || `${role.permissions_count || 0} permissões`}
                                                            selected={false}
                                                            onClick={() => handleAddRole(role)}
                                                        />
                                                        <div className="absolute top-2 right-2 flex gap-2">
                                                            {role.is_system && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs"
                                                                >
                                                                    Sistema
                                                                </Badge>
                                                            )}
                                                            {role.requires_entity && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {role.entity_type === 'plant' ? 'Planta' :
                                                                        role.entity_type === 'area' ? 'Área' :
                                                                            'Setor'}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground text-sm">
                                                    {roleAssignments.length > 0
                                                        ? 'Todas as funções disponíveis foram atribuídas'
                                                        : 'Nenhuma função disponível'}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>

                                {/* Right Side: Selected Roles */}
                                <div className="pl-4 flex flex-col min-h-0 overflow-hidden">
                                    <div className="mb-3 flex-shrink-0">
                                        <Label className="text-base font-medium">Funções Selecionadas</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {roleAssignments.length > 0
                                                ? `${roleAssignments.length} função(ões) atribuída(s)`
                                                : 'Nenhuma função selecionada ainda'}
                                        </p>
                                    </div>
                                    <ScrollArea className="flex-1 min-h-0">
                                        <div className="space-y-2 pr-3">
                                            {roleAssignments.length > 0 ? (
                                                roleAssignments.map((assignment, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <Shield className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm truncate">
                                                                    {assignment.role.display_name || assignment.role.name}
                                                                </p>
                                                                {assignment.entity_name && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {assignment.entity_type === 'plant' ? 'Planta' :
                                                                            assignment.entity_type === 'area' ? 'Área' :
                                                                                'Setor'}: {assignment.entity_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveRole(index)}
                                                            className="flex-shrink-0 ml-2"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex items-center justify-center py-12">
                                                    <div className="text-center space-y-2">
                                                        <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                                                            <Shield className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            Selecione funções à esquerda
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    {errors.role_assignments && (
                                        <div className="mt-2 flex-shrink-0">
                                            <InputError message={errors.role_assignments} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 4 && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">
                                    <div className="space-y-4">
                                        {/* User Details Summary */}
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm">Detalhes do Usuário</h4>
                                                <User className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Nome:</span>
                                                    <span className="font-medium">{data.name}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Email:</span>
                                                    <span className="font-medium">{data.email}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Senha:</span>
                                                    <span className="font-medium">••••••••</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Roles Details */}
                                        {roleAssignments.length > 0 ? (
                                            <div className="rounded-lg border p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-sm">Funções Atribuídas</h4>
                                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    {roleAssignments.map((assignment, index) => (
                                                        <div key={index} className="flex items-center gap-2 text-sm">
                                                            <Check className="h-3 w-3 text-green-600" />
                                                            <span>
                                                                <strong>{assignment.role.display_name || assignment.role.name}</strong>
                                                                {assignment.entity_name && (
                                                                    <span className="text-muted-foreground ml-1">
                                                                        - {assignment.entity_name}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border p-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-sm">Funções Atribuídas</h4>
                                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Nenhuma função atribuída ainda
                                                </p>
                                            </div>
                                        )}

                                        {/* Email Notification Preview */}
                                        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm">Notificação por Email</h4>
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="border-t pt-3 text-sm space-y-2">
                                                <p className="font-medium">Para: {data.email}</p>
                                                <p className="font-medium">Assunto: Bem-vindo ao Sistema</p>
                                                <div className="mt-2 pt-2 border-t">
                                                    <p>Olá {data.name},</p>
                                                    <p className="my-2">Sua conta foi criada com sucesso no sistema.</p>
                                                    <p>Suas credenciais de acesso:</p>
                                                    <ul className="list-disc list-inside mt-1">
                                                        <li>Email: {data.email}</li>
                                                        <li>Senha: [Enviada separadamente]</li>
                                                    </ul>
                                                    {roleAssignments.length > 0 && (
                                                        <div className="my-2">
                                                            <p>Funções atribuídas:</p>
                                                            <ul className="list-disc list-inside mt-1">
                                                                {roleAssignments.map((assignment, index) => (
                                                                    <li key={index} className="text-sm">
                                                                        <strong>{assignment.role.display_name || assignment.role.name}</strong>
                                                                        {assignment.entity_name && ` - ${assignment.entity_name}`}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    <p className="mt-2">Por favor, altere sua senha no primeiro login.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                O usuário será criado e receberá um email com as credenciais de acesso.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Anterior
                        </Button>

                        {currentStep < steps.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!isStepValid(currentStep)}
                            >
                                Próximo
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={processing || !isStepValid(1) || !isStepValid(2)}
                            >
                                {processing ? 'Criando...' : 'Criar Usuário'}
                            </Button>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>

            {/* Entity Selection Dialog */}
            {showEntitySelector && (
                <Dialog open={true} onOpenChange={() => setShowEntitySelector(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Selecione a Entidade</DialogTitle>
                            <DialogDescription>
                                Esta função requer que você especifique onde ela será aplicada.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            {(() => {
                                const role = roles.find(r => r.id === showEntitySelector);
                                if (!role) return null;

                                const entities = role.entity_type === 'plant' ? assignableEntities.plants :
                                    role.entity_type === 'area' ? assignableEntities.areas :
                                        role.entity_type === 'sector' ? assignableEntities.sectors : [];

                                const Icon = role.entity_type === 'plant' ? Building2 :
                                    role.entity_type === 'area' ? MapPin :
                                        Grid3X3;

                                return (
                                    <>
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">
                                                Função: {role.display_name || role.name}
                                            </Label>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Selecione {role.entity_type === 'plant' ? 'a planta' :
                                                    role.entity_type === 'area' ? 'a área' :
                                                        'o setor'} onde esta função será aplicada:
                                            </p>
                                        </div>
                                        <ScrollArea className="h-[200px] border rounded-md p-2">
                                            <div className="space-y-1">
                                                {entities.map((entity) => {
                                                    const isAlreadyAssigned = roleAssignments.some(
                                                        assignment =>
                                                            assignment.role_id === role.id &&
                                                            assignment.entity_type === role.entity_type &&
                                                            assignment.entity_id === entity.id
                                                    );

                                                    return (
                                                        <Button
                                                            key={entity.id}
                                                            variant={isAlreadyAssigned ? "secondary" : "ghost"}
                                                            className={cn(
                                                                "w-full justify-start",
                                                                isAlreadyAssigned && "opacity-50 cursor-not-allowed"
                                                            )}
                                                            onClick={() => handleAddRoleWithEntity(role.id, role.entity_type!, entity.id)}
                                                            disabled={isAlreadyAssigned}
                                                        >
                                                            <Icon className="h-4 w-4 mr-2" />
                                                            {entity.name}
                                                            {isAlreadyAssigned && (
                                                                <Check className="h-4 w-4 ml-auto text-muted-foreground" />
                                                            )}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </>
                                );
                            })()}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEntitySelector(null)}>
                                Cancelar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
} 