import { router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface ActionItem {
    name: string;
    icon: LucideIcon;
    isDefault?: boolean;
    comingSoon?: boolean;
    newFeature?: boolean;
    description: string;
    href?: string;
}

export interface PathItem {
    title: string;
    icon: LucideIcon;
    description: string;
    href?: string;
    actions: ActionItem[];
}

interface ActionShortcutsProps {
    title?: string;
    paths: Record<string, PathItem>;
    onActionClick?: (pathKey: string, actionName: string) => void;
}

export default function ActionShortcuts({ title = 'Atalhos', paths, onActionClick }: ActionShortcutsProps) {
    return (
        <div>
            <h2 className="text-foreground mb-6 text-xl font-semibold">{title}</h2>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {Object.entries(paths).map(([key, path]) => {
                    const IconComponent = path.icon;
                    const hasQuickAction = !!path.href;

                    // Conteúdo comum extraído
                    const headerContent = (
                        <div className="flex items-center space-x-3">
                            <div
                                className={`bg-background rounded-lg p-2 transition-colors duration-200 ${
                                    hasQuickAction ? 'group-hover:bg-ring/10 group-hover:ring-ring/10' : ''
                                }`}
                            >
                                <IconComponent size={28} className={`text-foreground ${hasQuickAction ? 'group-hover:text-ring' : ''}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-foreground text-xl font-semibold">{path.title}</h3>
                                <p className="text-muted-foreground text-sm">{path.description}</p>
                            </div>
                            {hasQuickAction && (
                                <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors" size={20} />
                            )}
                        </div>
                    );

                    // Wrapper condicional
                    const HeaderWrapper = hasQuickAction ? 'button' : 'div';
                    const headerProps = hasQuickAction
                        ? {
                              onClick: () => router.visit(path.href!),
                              className:
                                  'w-full bg-muted p-6 hover:bg-input-focus hover:ring-ring/10 hover:ring-[1px] hover:border-ring transition-all duration-200 group text-left',
                          }
                        : {
                              className: 'bg-muted p-6',
                          };

                    return (
                        <div key={key} className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
                            {/* Path Header - Dinâmico */}
                            <HeaderWrapper {...headerProps}>{headerContent}</HeaderWrapper>

                            {/* Actions List */}
                            <div className="p-6">
                                <div className="space-y-1">
                                    {path.actions.map((action, index) => {
                                        const ActionIcon = action.icon;
                                        const hasActionLink = !!action.href;

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (onActionClick) {
                                                        onActionClick(key, action.name);
                                                    } else if (action.href) {
                                                        router.visit(action.href);
                                                    }
                                                }}
                                                className={`flex w-full items-start space-x-3 rounded-lg p-4 text-left ${
                                                    hasActionLink
                                                        ? 'hover:bg-input-focus hover:ring-ring/10 hover:border-ring group transition-colors hover:ring-[1px]'
                                                        : 'group'
                                                }`}
                                            >
                                                <div
                                                    className={`mt-0.5 ${
                                                        hasActionLink ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    <ActionIcon size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h4
                                                            className={`font-medium ${
                                                                hasActionLink ? 'text-foreground group-hover:text-foreground' : 'text-foreground'
                                                            }`}
                                                        >
                                                            {action.name}
                                                        </h4>
                                                        {action.isDefault && (
                                                            <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">Padrão</span>
                                                        )}
                                                        {action.comingSoon && (
                                                            <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">
                                                                Em Breve
                                                            </span>
                                                        )}
                                                        {action.newFeature && (
                                                            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                                Novo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground mt-1 text-sm">{action.description}</p>
                                                </div>
                                                {hasActionLink && (
                                                    <ChevronRight
                                                        className="text-muted-foreground group-hover:text-foreground mt-1 transition-colors"
                                                        size={16}
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
