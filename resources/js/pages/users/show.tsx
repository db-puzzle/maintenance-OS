import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ShowLayout from '@/layouts/show-layout';
import UserFormComponent from '@/components/users/UserFormComponent';
import RolesTable from '@/components/users/RolesTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Key,
    Shield,
    Activity,
    ChevronRight,
    Building2,
    MapPin,
    Hash,
    Eye,
    Plus,
    Wrench,
    Award,
    Save,
} from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import EmptyCard from '@/components/ui/empty-card';
import { type BreadcrumbItem } from '@/types';
import { ItemSelect } from '@/components/ItemSelect';
import { SkillsTable } from '@/components/work-orders/SkillsTable';
import { CertificationsTable } from '@/components/work-orders/CertificationsTable';
import { ItemRequirementsSelector } from '@/components/work-orders/ItemRequirementsSelector';
import SkillSheet from '@/components/skills/SkillSheet';
import CertificationSheet from '@/components/certifications/CertificationSheet';
import { toast } from 'sonner';

interface User {
    id: number;
    name: string;
    email: string;
    roles: Array<{ id: number; name: string }>;
    permissions: Array<{ id: number; name: string }>;
    skills: Array<Skill>;
    certifications: Array<Certification>;
    created_at: string;
    updated_at: string;
}

interface Skill {
    id: number;
    name: string;
    description?: string | null;
    category: string;
}

interface Certification {
    id: number;
    name: string;
    description?: string | null;
    issuing_organization: string;
    validity_period_days?: number | null;
    active: boolean;
}

interface PermissionNode {
    id: number;
    name: string;
    type: 'plant' | 'area' | 'sector' | 'asset';
    permissions: string[];
    children?: PermissionNode[];
}

interface ActivityLog {
    id: number;
    action: string;
    user?: { id: number; name: string } | null;
    created_at: string;
    details: Record<string, unknown> | null;
}

interface Props {
    user: User;
    permissionHierarchy: PermissionNode[];
    activityLogs: ActivityLog[];
    skills: Skill[];
    certifications: Certification[];
    canEditUser: boolean;
    canManagePermissions: boolean;
}

export default function UserShow({
    user,
    permissionHierarchy,
    activityLogs,
    skills,
    certifications,
    canEditUser,
    canManagePermissions
}: Props) {
    const getInitials = useInitials();
    const initials = getInitials(user.name);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [skillSheetOpen, setSkillSheetOpen] = useState(false);
    const [certificationSheetOpen, setCertificationSheetOpen] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<Skill[]>(user.skills || []);
    const [selectedCertifications, setSelectedCertifications] = useState<Certification[]>(user.certifications || []);
    const [isEditingSkillsCerts, setIsEditingSkillsCerts] = useState(false);

    const { data: skillsData, setData: setSkillsData, put: putSkills, processing: processingSkills } = useForm({
        skills: selectedSkills.map(s => s.id)
    });

    const { data: certificationsData, setData: setCertificationsData, put: putCertifications, processing: processingCertifications } = useForm({
        certifications: selectedCertifications.map(c => c.id)
    });

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
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

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'plant':
                return <Building2 className="h-4 w-4" />;
            case 'area':
                return <MapPin className="h-4 w-4" />;
            case 'sector':
                return <Hash className="h-4 w-4" />;
            default:
                return <Eye className="h-4 w-4" />;
        }
    };

    const renderPermissionNode = (node: PermissionNode, depth = 0) => {
        const nodeKey = `${node.type}-${node.id}`;
        const isExpanded = expandedNodes.has(nodeKey);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={nodeKey} className={cn('space-y-2', depth > 0 && 'ml-6')}>
                <div className="flex items-start gap-2">
                    {hasChildren && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleNode(nodeKey)}
                        >
                            <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                        </Button>
                    )}
                    {!hasChildren && <div className="w-6" />}

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            {getNodeIcon(node.type)}
                            <span className="font-medium">{node.name}</span>
                            <Badge variant="outline" className="text-xs">
                                {node.type}
                            </Badge>
                        </div>

                        {node.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-6">
                                {node.permissions.map((permission) => (
                                    <Badge key={permission} variant="secondary" className="text-xs">
                                        {permission}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="space-y-2">
                        {node.children!.map((child) => renderPermissionNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const formatActivityTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Handlers for skills
    const handleAddSkill = (skill: Skill) => {
        if (!selectedSkills.find(s => s.id === skill.id)) {
            setSelectedSkills([...selectedSkills, skill]);
        }
    };

    const handleRemoveSkill = (skillId: number) => {
        setSelectedSkills(selectedSkills.filter(s => s.id !== skillId));
    };

    // Handlers for certifications
    const handleAddCertification = (certification: Certification) => {
        if (!selectedCertifications.find(c => c.id === certification.id)) {
            setSelectedCertifications([...selectedCertifications, certification]);
        }
    };

    const handleRemoveCertification = (certificationId: number) => {
        setSelectedCertifications(selectedCertifications.filter(c => c.id !== certificationId));
    };

    // Save handlers
    const handleSaveSkillsCertifications = () => {
        // Update form data before saving
        setSkillsData('skills', selectedSkills.map(s => s.id));
        setCertificationsData('certifications', selectedCertifications.map(c => c.id));

        // Save skills
        putSkills(route('users.skills.update', user.id), {
            onSuccess: () => {
                // Save certifications
                putCertifications(route('users.certifications.update', user.id), {
                    onSuccess: () => {
                        toast.success('Habilidades e certificações atualizadas com sucesso!');
                        setIsEditingSkillsCerts(false);
                        router.reload();
                    },
                    onError: () => {
                        toast.error('Erro ao atualizar certificações');
                    }
                });
            },
            onError: () => {
                toast.error('Erro ao atualizar habilidades');
            }
        });
    };

    const handleCancelSkillsCertifications = () => {
        // Reset to original values
        setSelectedSkills(user.skills || []);
        setSelectedCertifications(user.certifications || []);
        setIsEditingSkillsCerts(false);
    };

    // Define breadcrumbs
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: '/home',
        },
        {
            title: 'Users',
            href: '/users',
        },
        {
            title: user.name,
            href: '#',
        },
    ];

    const tabs = [
        {
            id: 'info',
            label: 'User Information',
            content: (
                <div className="space-y-8 py-8">
                    <UserFormComponent
                        user={user}
                        initialMode="view"
                        canUpdate={canEditUser}
                        onSuccess={() => router.reload()}
                    />

                    <div className="space-y-4">
                        <RolesTable
                            selectedRoles={user.roles}
                            isViewMode={true}
                            onRemoveRole={() => { }} // Not used in view mode
                        />

                        {canManagePermissions && (
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                >
                                    <Link href={`/users/${user.id}/permissions`}>
                                        <Shield className="h-4 w-4 mr-2" />
                                        Gerenciar Permissões
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'skills-certifications',
            label: 'Habilidades e Certificações',
            icon: <Award className="h-4 w-4" />,
            content: (
                <div className="space-y-6 py-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Skills Column */}
                        <ItemRequirementsSelector
                            title="Habilidades"
                            items={skills}
                            selectedItems={selectedSkills}
                            onAdd={handleAddSkill}
                            onRemove={handleRemoveSkill}
                            onCreateClick={() => setSkillSheetOpen(true)}
                            isViewMode={!isEditingSkillsCerts}
                            placeholder="Selecione ou busque uma habilidade..."
                        >
                            <SkillsTable
                                selectedSkills={selectedSkills}
                                isViewMode={!isEditingSkillsCerts}
                                onRemoveSkill={handleRemoveSkill}
                            />
                        </ItemRequirementsSelector>

                        {/* Certifications Column */}
                        <ItemRequirementsSelector
                            title="Certificações"
                            items={certifications}
                            selectedItems={selectedCertifications}
                            onAdd={handleAddCertification}
                            onRemove={handleRemoveCertification}
                            onCreateClick={() => setCertificationSheetOpen(true)}
                            isViewMode={!isEditingSkillsCerts}
                            placeholder="Selecione ou busque uma certificação..."
                        >
                            <CertificationsTable
                                selectedCertifications={selectedCertifications}
                                isViewMode={!isEditingSkillsCerts}
                                onRemoveCertification={handleRemoveCertification}
                            />
                        </ItemRequirementsSelector>
                    </div>

                    {/* Action Buttons */}
                    {canEditUser && (
                        <div className="flex justify-end pt-4">
                            {!isEditingSkillsCerts ? (
                                <Button
                                    onClick={() => setIsEditingSkillsCerts(true)}
                                    variant="outline"
                                    size="sm"
                                >
                                    Editar
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCancelSkillsCertifications}
                                        variant="outline"
                                        size="sm"
                                        disabled={processingSkills || processingCertifications}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleSaveSkillsCertifications}
                                        size="sm"
                                        disabled={processingSkills || processingCertifications}
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Removed Manage Permissions button section */}
                </div>
            ),
        },
        {
            id: 'permissions',
            label: 'Permissions',
            icon: <Shield className="h-4 w-4" />,
            content: (
                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Permission Hierarchy</h3>
                        <p className="text-sm text-muted-foreground">
                            Permissions organized by entity hierarchy
                        </p>
                    </div>

                    <Separator />

                    {permissionHierarchy.length > 0 ? (
                        <div className="space-y-4">
                            {permissionHierarchy.map((node) => renderPermissionNode(node))}
                        </div>
                    ) : (
                        <EmptyCard
                            icon={Shield}
                            title="No permissions assigned"
                            description="This user has not been assigned any permissions yet"
                            primaryButtonText="Manage Permissions"
                            primaryButtonAction={() => router.visit(route('users.permissions.index', { user: user.id }))}
                        />
                    )}
                </div>
            ),
        },
        {
            id: 'activity',
            label: 'Activity',
            icon: <Activity className="h-4 w-4" />,
            content: (
                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Recent Activity</h3>
                        <p className="text-sm text-muted-foreground">
                            Permission changes and user actions
                        </p>
                    </div>

                    <Separator />

                    {activityLogs.length > 0 ? (
                        <div className="space-y-4">
                            {activityLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm">
                                            <span className="font-medium">{log.user?.name || 'System'}</span>{' '}
                                            <span className="text-muted-foreground">{log.action}</span>
                                        </p>
                                        {log.details && (
                                            <p className="text-xs text-muted-foreground">
                                                {JSON.stringify(log.details)}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatActivityTime(log.created_at)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyCard
                            icon={Activity}
                            title="No recent activity"
                            description="There is no activity to display for this user"
                        />
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`User - ${user.name}`} />

            <ShowLayout
                title={user.name}
                subtitle={`${user.email} • ${user.roles.map(role => role.name).join(', ')}`}
                editRoute={canEditUser ? `/users/${user.id}/edit` : ""}
                tabs={tabs}
                defaultActiveTab="info"
            />

            {/* Skill Sheet for creating new skills */}
            <SkillSheet
                open={skillSheetOpen}
                onOpenChange={setSkillSheetOpen}
                skill={null}
                onClose={() => {
                    setSkillSheetOpen(false);
                    // Reload to get updated skills list
                    router.reload();
                }}
            />

            {/* Certification Sheet for creating new certifications */}
            <CertificationSheet
                open={certificationSheetOpen}
                onOpenChange={setCertificationSheetOpen}
                certification={null}
                onClose={() => {
                    setCertificationSheetOpen(false);
                    // Reload to get updated certifications list
                    router.reload();
                }}
            />
        </AppLayout>
    );
} 