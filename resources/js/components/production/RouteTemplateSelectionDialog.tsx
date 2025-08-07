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

interface ExtendedRouteTemplate extends RouteTemplate {
    steps_count?: number;
    estimated_time?: number;
    usage_count?: number;
}

interface RouteTemplateSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: ExtendedRouteTemplate[];
    orderNumber: string;
    itemCategoryId?: number;
    onSelectTemplate: (templateId: number) => void;
}

export default function RouteTemplateSelectionDialog({
    open,
    onOpenChange,
    templates,
    orderNumber,
    itemCategoryId,
    onSelectTemplate,
}: RouteTemplateSelectionDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Filter templates based on search query and category
    const filteredTemplates = useMemo(() => {
        let filtered = templates;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(template =>
                template.name.toLowerCase().includes(query) ||
                (template.description || '').toLowerCase().includes(query)
            );
        }

        // Sort templates: category-specific first, then general templates
        return filtered.sort((a, b) => {
            // If both have same relevance, sort by name
            if ((a.item_category === itemCategoryId) === (b.item_category === itemCategoryId)) {
                return a.name.localeCompare(b.name);
            }
            // Category-specific templates come first
            return a.item_category === itemCategoryId ? -1 : 1;
        });
    }, [templates, searchQuery, itemCategoryId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const handleSelect = () => {
        if (selectedId) {
            onSelectTemplate(selectedId);
            onOpenChange(false);
            setSearchQuery('');
            setSelectedId(null);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        setSearchQuery('');
        setSelectedId(null);
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
                    <DialogTitle>Selecionar Template de Rota</DialogTitle>
                    <DialogDescription>
                        Escolha um template de rota para a OM #{orderNumber}
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
                                            onClick={() => setSelectedId(template.id)}
                                            onDoubleClick={handleSelect}
                                            className={cn(
                                                "w-full rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                                                selectedId === template.id && "border-primary bg-accent"
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
                                                    {template.item_category === itemCategoryId && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Recomendado
                                                        </Badge>
                                                    )}
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
                            <Button variant="outline" onClick={handleCancel}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSelect}
                                disabled={!selectedId}
                            >
                                Aplicar Template
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}