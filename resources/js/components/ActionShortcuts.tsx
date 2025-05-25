import React from 'react';
import { ChevronRight } from 'lucide-react';
import { router } from '@inertiajs/react';

export interface ActionItem {
    name: string;
    icon: any;
    isDefault?: boolean;
    comingSoon?: boolean;
    description: string;
    href?: string;
}

export interface PathItem {
    title: string;
    icon: any;
    description: string;
    href?: string;
    actions: ActionItem[];
}

interface ActionShortcutsProps {
    title?: string;
    paths: Record<string, PathItem>;
}

export default function ActionShortcuts({ 
    title = "Atalhos", 
    paths
}: ActionShortcutsProps) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">{title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {Object.entries(paths).map(([key, path]) => {
                    const IconComponent = path.icon;
                    const hasQuickAction = !!path.href;
                    
                    // Conteúdo comum extraído
                    const headerContent = (
                        <div className="flex items-center space-x-3">
                            <div className={`bg-background p-2 rounded-lg transition-colors duration-200 ${
                                hasQuickAction ? 'group-hover:bg-ring/10 group-hover:ring-ring/10' : ''
                            }`}>
                                <IconComponent size={28} className={`text-foreground ${
                                    hasQuickAction ? 'group-hover:text-ring' : ''
                                }`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-foreground">{path.title}</h3>
                                <p className="text-muted-foreground text-sm">{path.description}</p>
                            </div>
                            {hasQuickAction && (
                                <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors" size={20} />
                            )}
                        </div>
                    );

                    // Wrapper condicional
                    const HeaderWrapper = hasQuickAction ? 'button' : 'div';
                    const headerProps = hasQuickAction ? {
                        onClick: () => router.visit(path.href!),
                        className: "w-full bg-muted p-6 hover:bg-input-focus hover:ring-ring/10 hover:ring-[1px] hover:border-ring transition-all duration-200 group text-left"
                    } : {
                        className: "bg-muted p-6"
                    };
                    
                    return (
                        <div key={key} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                            {/* Path Header - Dinâmico */}
                            <HeaderWrapper {...headerProps}>
                                {headerContent}
                            </HeaderWrapper>

                            {/* Actions List */}
                            <div className="p-6">
                                <div className="space-y-1">
                                    {path.actions.map((action, index) => {
                                        const ActionIcon = action.icon;
                                        const hasActionLink = !!action.href;
                                        
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => router.visit(action.href!)}
                                                className={`w-full flex items-start space-x-3 p-4 rounded-lg text-left ${
                                                    hasActionLink 
                                                        ? 'hover:bg-input-focus hover:ring-ring/10 hover:ring-[1px] hover:border-ring transition-colors group'
                                                        : 'group'
                                                }`}
                                            >
                                                <div className={`mt-0.5 ${
                                                    hasActionLink 
                                                        ? 'text-muted-foreground group-hover:text-foreground'
                                                        : 'text-muted-foreground'
                                                }`}>
                                                    <ActionIcon size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className={`font-medium ${
                                                            hasActionLink 
                                                                ? 'text-foreground group-hover:text-foreground'
                                                                : 'text-foreground'
                                                        }`}>
                                                            {action.name}
                                                        </h4>
                                                        {action.isDefault && (
                                                            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                                                Padrão
                                                            </span>
                                                        )}
                                                        {action.comingSoon && (
                                                            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                                                Em Breve
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                                                </div>
                                                {hasActionLink && (
                                                    <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors mt-1" size={16} />
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