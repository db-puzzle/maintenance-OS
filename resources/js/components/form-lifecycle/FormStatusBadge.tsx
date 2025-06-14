import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Edit3 } from 'lucide-react';

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
    };
}

interface FormStatusBadgeProps {
    form: FormData;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
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

export default function FormStatusBadge({
    form,
    size = 'md',
    showDetails = false,
    className
}: FormStatusBadgeProps) {
    const state = getFormState(form);

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-0.5',
        lg: 'text-base px-3 py-1'
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4'
    };

    const configs = {
        unpublished: {
            variant: 'destructive' as const,
            icon: AlertCircle,
            label: 'Não Publicado',
            className: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
        },
        published: {
            variant: 'default' as const,
            icon: CheckCircle,
            label: form.current_version ? `v${form.current_version.version_number}` : 'Publicado',
            className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
        },
        draft: {
            variant: 'secondary' as const,
            icon: Edit3,
            label: form.current_version
                ? `v${form.current_version.version_number} com alterações`
                : 'Rascunho',
            className: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200'
        }
    };

    const config = configs[state];
    const Icon = config.icon;

    return (
        <Badge
            variant={config.variant}
            className={cn(
                sizeClasses[size],
                config.className,
                'inline-flex items-center gap-1 font-medium',
                className
            )}
        >
            <Icon className={iconSizes[size]} />
            <span>{config.label}</span>
            {showDetails && form.current_version && form.current_version.published_at && (
                <span className="ml-1 opacity-70">
                    • {new Date(form.current_version.published_at).toLocaleDateString('pt-BR')}
                </span>
            )}
        </Badge>
    );
} 