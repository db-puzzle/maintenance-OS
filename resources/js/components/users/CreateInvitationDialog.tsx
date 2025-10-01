import React, { useState, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Mail,
    MessageSquare,
    Check,
    ChevronLeft,
    ChevronRight,
    Info,
    Shield,
    Eye,
    X,
    Building2,
    MapPin,
    Grid3X3
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
import { Textarea } from '@/components/ui/textarea';

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
    type: 'plant' | 'area' | 'sector';
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roles: Role[];
    plants?: Entity[];
    areas?: Entity[];
    sectors?: Entity[];
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

export default function CreateInvitationDialog({
    open,
    onOpenChange,
    roles = [],
    plants = [],
    areas = [],
    sectors = []
}: Props) {
    const [currentStep, setCurrentStep] = useState(1);
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
    const [showEntitySelector, setShowEntitySelector] = useState<number | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        email: '',
        role_assignments: [] as Array<{
            role_id: number;
            entity_type?: string;
            entity_id?: number;
        }>,
        message: '',
    });

    // Create form adapter for TextInput components
    const formAdapter = createFormAdapter({ data, setData, errors, clearErrors });

    const steps = useMemo(() => [
        { number: 1, title: 'Email', icon: <Mail className="h-4 w-4" /> },
        { number: 2, title: 'Função', icon: <Shield className="h-4 w-4" /> },
        { number: 3, title: 'Mensagem', icon: <MessageSquare className="h-4 w-4" /> },
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
                return plants.find(p => p.id === id);
            case 'area':
                return areas.find(a => a.id === id);
            case 'sector':
                return sectors.find(s => s.id === id);
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

    const handleSubmit = () => {
        post(route('invitations.store'), {
            onSuccess: () => {
                reset();
                setCurrentStep(1);
                setRoleAssignments([]);
                setShowEntitySelector(null);
                onOpenChange(false);
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
                // Navigate to the step with the first error
                if (errors.email && currentStep !== 1) {
                    setCurrentStep(1);
                } else if (errors.role_assignments && currentStep !== 2) {
                    setCurrentStep(2);
                } else if (errors.message && currentStep !== 3) {
                    setCurrentStep(3);
                }
            },
        });
    };

    const isStepValid = (step: number) => {
        switch (step) {
            case 1: {
                // Email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !!data.email && emailRegex.test(data.email);
            }
            case 2:
                // Role selection is optional, so always valid
                return true;
            case 3:
                // Message is optional, so always valid
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
        }
        onOpenChange(open);
    };


    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="!max-w-[50vw] w-[50vw] h-[70vh] flex flex-col p-0">
                <DialogHeader className="mt-4 px-6 py-4 border-b">
                    <DialogTitle>Convidar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Envie um convite para um novo usuário se juntar ao sistema
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 border-b">
                    <StepIndicator steps={steps} currentStep={currentStep} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden px-6">
                    <div className="flex-1 overflow-y-auto py-2">
                        {/* Step 1: Email Input */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-base font-medium mb-4 block">
                                        Insira o endereço de email do novo usuário
                                    </Label>

                                    <TextInput
                                        form={formAdapter}
                                        name="email"
                                        label="Endereço de Email"
                                        placeholder="exemplo@empresa.com"
                                        type="email"
                                        required
                                        helperText="O usuário receberá um convite neste endereço de email."
                                    />
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <p className="font-medium">Sobre o processo de convite:</p>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                <li>O usuário receberá um email com um link seguro</li>
                                                <li>O link expira em 7 dias</li>
                                                <li>Você pode reenviar o convite a qualquer momento</li>
                                                <li>O convite pode ser revogado antes de ser aceito</li>
                                            </ul>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Step 2: Role Selection */}
                        {currentStep === 2 && (
                            <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
                                {/* Left Side: Available Roles */}
                                <div className="border-r pr-4 flex flex-col min-h-0 overflow-hidden">
                                    <div className="mb-3 flex-shrink-0">
                                        <Label className="text-base font-medium">Funções Disponíveis</Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Selecione as funções para atribuir ao novo usuário
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

                        {/* Step 3: Personal Message */}
                        {currentStep === 3 && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">

                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="message">Mensagem (opcional)</Label>
                                            <Textarea
                                                id="message"
                                                value={data.message}
                                                onChange={(e) => setData('message', e.target.value)}
                                                rows={5}
                                                className="mt-2"
                                                placeholder="Olá! Estou convidando você para se juntar à nossa equipe..."
                                                maxLength={500}
                                            />
                                            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                                                <span>Máximo 500 caracteres</span>
                                                <span>{data.message.length}/500</span>
                                            </div>
                                            {errors.message && (
                                                <InputError message={errors.message} className="mt-2" />
                                            )}
                                        </div>

                                    </div>

                                </div>
                            </ScrollArea>
                        )}

                        {/* Step 4: Review and Send */}
                        {currentStep === 4 && (
                            <ScrollArea className="h-full">
                                <div className="space-y-6 pr-4">

                                    <div className="space-y-4">
                                        {/* Email Summary */}
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm">Detalhes do Convite</h4>
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Email:</span>
                                                    <span className="font-medium">{data.email}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Funções:</span>
                                                    <span className="font-medium">
                                                        {roleAssignments.length > 0 ? `${roleAssignments.length} selecionada(s)` : 'Nenhuma'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Mensagem personalizada:</span>
                                                    <span className="font-medium">{data.message ? 'Sim' : 'Não'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Roles Details */}
                                        {roleAssignments.length > 0 && (
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
                                        )}

                                        {/* Email Preview */}
                                        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm">Prévia do Email</h4>
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="border-t pt-3 text-sm space-y-2">
                                                <p className="font-medium">Para: {data.email}</p>
                                                <p className="font-medium">Assunto: Convite para o Sistema</p>
                                                <div className="mt-2 pt-2 border-t">
                                                    <p>Olá,</p>
                                                    {data.message && (
                                                        <p className="italic my-2">{data.message}</p>
                                                    )}
                                                    <p>Você foi convidado para se juntar ao nosso sistema.</p>
                                                    {roleAssignments.length > 0 && (
                                                        <div className="my-2">
                                                            <p>Você receberá as seguintes funções:</p>
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
                                                    <p className="mt-2">Clique no link abaixo para aceitar o convite e criar sua conta:</p>
                                                    <p className="text-primary underline">[Link do Convite]</p>
                                                    <p className="text-muted-foreground text-xs mt-4">
                                                        Este convite expira em 7 dias.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                O convite será enviado automaticamente após clicar em "Enviar Convite".
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
                                disabled={processing || !isStepValid(1)} // Email is required
                            >
                                {processing ? 'Enviando...' : 'Enviar Convite'}
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

                                const entities = role.entity_type === 'plant' ? plants :
                                    role.entity_type === 'area' ? areas :
                                        role.entity_type === 'sector' ? sectors : [];

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
