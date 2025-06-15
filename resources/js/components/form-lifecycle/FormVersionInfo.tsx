import { ArrowRight, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormVersionInfoProps {
    currentVersion?: {
        version_number: string;
        task_count?: number;
    };
    draftTaskCount?: number;
    hasDraftChanges?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function FormVersionInfo({
    currentVersion,
    draftTaskCount,
    hasDraftChanges = false,
    className,
    size = 'md'
}: FormVersionInfoProps) {
    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-3.5 w-3.5',
        lg: 'h-4 w-4'
    };

    if (!currentVersion && !hasDraftChanges) {
        return null;
    }

    const showTransition = hasDraftChanges && currentVersion && draftTaskCount !== undefined;

    return (
        <div className={cn('flex items-center gap-2', sizeClasses[size], className)}>
            <GitBranch className={cn(iconSizes[size], 'text-muted-foreground')} />

            {currentVersion && (
                <div className="flex items-center gap-1">
                    <span className="font-medium">v{currentVersion.version_number}</span>
                    {currentVersion.task_count !== undefined && (
                        <span className="text-muted-foreground">
                            ({currentVersion.task_count} {currentVersion.task_count === 1 ? 'tarefa' : 'tarefas'})
                        </span>
                    )}
                </div>
            )}

            {showTransition && (
                <>
                    <ArrowRight className={cn(iconSizes[size], 'text-muted-foreground')} />
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-orange-600">Rascunho</span>
                        <span className="text-muted-foreground">
                            ({draftTaskCount} {draftTaskCount === 1 ? 'tarefa' : 'tarefas'})
                        </span>
                    </div>
                </>
            )}

            {!currentVersion && hasDraftChanges && draftTaskCount !== undefined && (
                <div className="flex items-center gap-1">
                    <span className="font-medium text-orange-600">Rascunho</span>
                    <span className="text-muted-foreground">
                        ({draftTaskCount} {draftTaskCount === 1 ? 'tarefa' : 'tarefas'})
                    </span>
                </div>
            )}
        </div>
    );
} 