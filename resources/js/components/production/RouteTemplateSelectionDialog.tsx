import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, Layers, Settings, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RouteTemplate } from '@/types/production';

interface RouteTemplateSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: RouteTemplate[];
    selectedTemplate: RouteTemplate | null;
    onSelectTemplate: (template: RouteTemplate) => void;
    onUseTemplate: () => void;
    itemName?: string;
}

export default function RouteTemplateSelectionDialog({
    open,
    onOpenChange,
    templates,
    selectedTemplate,
    onSelectTemplate,
    onUseTemplate,
    itemName,
}: RouteTemplateSelectionDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter templates based on search query
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return templates;
        
        const query = searchQuery.toLowerCase();
        return templates.filter(template =>
            template.name.toLowerCase().includes(query) ||
            template.description?.toLowerCase().includes(query)
        );
    }, [templates, searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleSelect = () => {
        if (selectedTemplate) {
            onUseTemplate();
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        setSearchQuery('');
    };

    const getCategoryIcon = (template: RouteTemplate) => {
        // You can customize this based on actual category types
        if (template.item_category) {
            return <Package className="h-4 w-4" />;
        }
        return <Settings className="h-4 w-4" />;
    };

    const formatTime = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle>Selecionar Roteiro Template</DialogTitle>
                    <DialogDescription>
                        Escolha um template para criar o roteiro de produção{itemName ? ` para ${itemName}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                        />
                    </div>

                    {/* Results */}
                    <ScrollArea className="h-[400px] rounded-md border">
                        <div className="p-2">
                            {filteredTemplates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="mb-2 h-8 w-8" />
                                    <p className="text-sm">Nenhum template encontrado</p>
                                    <p className="text-xs">Tente usar palavras-chave diferentes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredTemplates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => onSelectTemplate(template)}
                                            onDoubleClick={handleSelect}
                                            className={cn(
                                                "p-4 cursor-pointer transition-all hover:bg-accent/50",
                                                selectedTemplate?.id === template.id && "border-primary bg-accent"
                                            )}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5">
                                                            {getCategoryIcon(template)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium">{template.name}</h4>
                                                            {template.description && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {template.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Removed itemCategoryId check */}
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    {template.steps_count !== undefined && (
                                                        <div className="flex items-center gap-1">
                                                            <Layers className="h-3 w-3" />
                                                            <span>
                                                                {template.steps_count} {template.steps_count === 1 ? 'passo' : 'passos'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {template.estimated_time !== undefined && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>
                                                                ~{formatTime(template.estimated_time)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {template.usage_count !== undefined && template.usage_count > 0 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Usado {template.usage_count}x
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template disponível' : 'templates disponíveis'}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSelect}
                                disabled={!selectedTemplate}
                            >
                                Usar Template
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}