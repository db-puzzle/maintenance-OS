import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Clock, Edit3, User } from 'lucide-react';

export type FormState = 'unpublished' | 'published' | 'draft';

export interface FormData {
    id: number;
    current_version_id: number | null;
    has_draft_changes?: boolean;
    isDraft?: boolean;
    currentVersionId?: number | null;
    current_version?: {
        id?: number;
        version_number: string;
        published_at?: string;
        published_by?: {
            id: number;
            name: string;
        };
    };
    draft_updated_at?: string;
    draft_updated_by?: {
        id: number;
        name: string;
    };
    tasks?: Array<{ id: number; name: string; type: string; [key: string]: unknown }>;
    draft_tasks?: Array<{ id: number; name: string; type: string; [key: string]: unknown }>;
    last_execution?: {
        completed_at: string;
        executed_by?: {
            name: string;
        };
    };
}

interface FormStatusBadgeProps {
    form: FormData;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
    showSubtitle?: boolean;
    className?: string;
}

export function getFormState(form: FormStatusBadgeProps['form']): FormState {
    // Handle both naming conventions
    const currentVersionId = form.current_version_id ?? form.currentVersionId;
    const hasDraftChanges = form.has_draft_changes ?? form.isDraft;

    if (!currentVersionId) {
        return 'unpublished';
    }
    if (hasDraftChanges) {
        return 'draft';
    }
    return 'published';
}

export default function FormStatusBadge({ form, size = 'md', showDetails = false, showSubtitle = false, className }: FormStatusBadgeProps) {
    const state = getFormState(form);
    const hasDraftChanges = form.has_draft_changes ?? form.isDraft;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-0.5',
        lg: 'text-base px-3 py-1',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4',
    };

    const configs = {
        unpublished: {
            variant: 'destructive' as const,
            icon: AlertCircle,
            label: 'Não Publicado',
            className: 'bg-red-100 text-red-700 border-red-200 cursor-default',
        },
        published: {
            variant: 'default' as const,
            icon: CheckCircle,
            label: 'Publicado',
            className: 'bg-green-100 text-green-700 border-green-200 cursor-default',
        },
        draft: {
            variant: 'default' as const,
            icon: CheckCircle,
            label: 'Publicado',
            className: 'bg-green-100 text-green-700 border-green-200 cursor-default',
        },
    };

    const config = configs[state];
    const Icon = config.icon;

    // Format additional details
    const getAdditionalInfo = () => {
        const details: string[] = [];

        if (state === 'published' && form.last_execution) {
            const timeAgo = formatDistanceToNow(new Date(form.last_execution.completed_at), {
                addSuffix: true,
                locale: ptBR,
            });
            details.push(`Executado ${timeAgo}`);
        }

        if (state === 'draft' && form.draft_updated_at) {
            const timeAgo = formatDistanceToNow(new Date(form.draft_updated_at), {
                addSuffix: true,
                locale: ptBR,
            });
            const editor = form.draft_updated_by?.name || 'alguém';
            details.push(`Editado por ${editor} ${timeAgo}`);
        }

        if (state === 'published' && form.current_version?.published_at && showDetails) {
            const timeAgo = formatDistanceToNow(new Date(form.current_version.published_at), {
                addSuffix: true,
                locale: ptBR,
            });
            details.push(`Publicado ${timeAgo}`);
        }

        return details;
    };

    const additionalInfo = getAdditionalInfo();

    if (showSubtitle) {
        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <Badge
                        variant={config.variant}
                        className={cn(sizeClasses[size], config.className, 'inline-flex items-center gap-1 font-medium', className)}
                    >
                        <Icon className={iconSizes[size]} />
                        <span>{config.label}</span>
                    </Badge>
                    {hasDraftChanges && state === 'draft' && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        sizeClasses[size],
                                        'cursor-default border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-800',
                                        'inline-flex items-center gap-1 font-medium',
                                    )}
                                >
                                    <Edit3 className={iconSizes[size]} />
                                    <span>Rascunho</span>
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Este formulário tem alterações não publicadas.</p>
                                <p>A versão atual ainda pode ser utilizada.</p>
                                {form.draft_updated_at && form.draft_updated_by && (
                                    <p className="mt-1 text-xs opacity-80">Última edição por {form.draft_updated_by.name}</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <div className="flex flex-col gap-0.5">
                    {additionalInfo.map((info, index) => (
                        <span key={index} className="text-muted-foreground flex items-center gap-1 text-xs">
                            {info.includes('Editado') && <User className="h-3 w-3" />}
                            {info.includes('Executado') && <Clock className="h-3 w-3" />}
                            {info}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1">
            <Badge
                variant={config.variant}
                className={cn(sizeClasses[size], config.className, 'inline-flex items-center gap-1 font-medium', className)}
            >
                <Icon className={iconSizes[size]} />
                <span>{config.label}</span>
                {showDetails && additionalInfo.length > 0 && <span className="ml-1 opacity-70">• {additionalInfo[0]}</span>}
            </Badge>
            {hasDraftChanges && state === 'draft' && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="secondary"
                            className={cn(
                                sizeClasses[size],
                                'cursor-default border-orange-200 bg-orange-100 text-orange-700',
                                'inline-flex items-center gap-1 font-medium',
                            )}
                        >
                            <Edit3 className={cn(iconSizes[size], 'h-2.5 w-2.5')} />
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Este formulário tem alterações não publicadas.</p>
                        <p>A versão atual ainda pode ser utilizada.</p>
                        {form.draft_updated_at && form.draft_updated_by && (
                            <p className="mt-1 text-xs opacity-80">Última edição por {form.draft_updated_by.name}</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
