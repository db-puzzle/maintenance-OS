import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, Clock, CheckCircle2, Star } from 'lucide-react';
import { ManufacturingRoute } from '@/types/production';

interface TemplateSelectorProps {
    templates: ManufacturingRoute[];
    selected: number | null;
    onSelect: (id: number) => void;
    recommended?: number;
    showCategories?: boolean;
    className?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
    templates,
    selected,
    onSelect,
    recommended,
    showCategories = false,
    className
}) => {
    const groupedTemplates = useMemo(() => {
        if (!showCategories) return { '': templates };

        return templates.reduce((acc, template) => {
            const category = template.item_category?.name || 'No Category';
            if (!acc[category]) acc[category] = [];
            acc[category].push(template);
            return acc;
        }, {} as Record<string, ManufacturingRoute[]>);
    }, [templates, showCategories]);

    const renderTemplate = (template: ManufacturingRoute) => {
        const isSelected = selected === template.id;
        const isRecommended = recommended === template.id;
        const stepCount = template.steps?.length || 0;
        const totalTime = template.steps?.reduce((sum, step) =>
            sum + (step.setup_time_minutes || 0) + (step.cycle_time_minutes || 0), 0
        ) || 0;

        return (
            <Label
                key={template.id}
                htmlFor={`template-${template.id}`}
                className={cn(
                    "cursor-pointer transition-all",
                    isSelected && "ring-2 ring-primary"
                )}
            >
                <Card className={cn(
                    "hover:shadow-md transition-shadow",
                    isSelected && "border-primary"
                )}>
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <RadioGroupItem
                                value={template.id.toString()}
                                id={`template-${template.id}`}
                                className="mt-1"
                            />
                            <div className="flex-1 ml-3">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">
                                        {template.name}
                                    </CardTitle>
                                    {isRecommended && (
                                        <Badge variant="default" className="gap-1">
                                            <Star className="h-3 w-3" />
                                            Recommended
                                        </Badge>
                                    )}
                                    {template.is_latest_for_category && (
                                        <Badge variant="secondary">Latest</Badge>
                                    )}
                                    {template.version > 1 && (
                                        <Badge variant="outline">v{template.version}</Badge>
                                    )}
                                </div>
                                {template.description && (
                                    <CardDescription className="mt-1">
                                        {template.description}
                                    </CardDescription>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Layers className="h-4 w-4" />
                                <span>{stepCount} steps</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{totalTime} min</span>
                            </div>
                            {template.derived_routes_count && (
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Used {template.derived_routes_count} times</span>
                                </div>
                            )}
                        </div>
                        {template.template_metadata?.tags && template.template_metadata.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                                {template.template_metadata.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Label>
        );
    };

    return (
        <ScrollArea className={cn("h-[400px]", className)}>
            <RadioGroup
                value={selected?.toString() || ''}
                onValueChange={(value) => onSelect(parseInt(value))}
                className="space-y-3"
            >
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                    <div key={category} className="space-y-3">
                        {showCategories && category && (
                            <h4 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-2">
                                {category}
                            </h4>
                        )}
                        {categoryTemplates.map(renderTemplate)}
                    </div>
                ))}
            </RadioGroup>
        </ScrollArea>
    );
};
