import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Sparkles, FileX2, Info } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { Item, ManufacturingRoute } from '@/types/production';

interface OrderCreationWizardProps {
    item?: Item;
    templates: ManufacturingRoute[];
    recommendedTemplate?: ManufacturingRoute;
    allTemplates: ManufacturingRoute[];
    selectedTemplate: number | null;
    onTemplateSelect: (id: number | null) => void;
    routeCreationMode: 'auto' | 'manual' | 'empty';
    onModeChange: (mode: 'auto' | 'manual' | 'empty') => void;
}

export const OrderCreationWizard: React.FC<OrderCreationWizardProps> = ({
    item,
    templates,
    recommendedTemplate,
    allTemplates,
    selectedTemplate,
    onTemplateSelect,
    routeCreationMode,
    onModeChange
}) => {
    const [localSelectedTemplate, setLocalSelectedTemplate] = useState<number | null>(selectedTemplate);

    // Show template selection if multiple templates for item type
    const showTemplateSelection = templates.length > 1 && routeCreationMode === 'auto';
    const hasTemplatesForCategory = templates.length > 0;

    useEffect(() => {
        // Auto-select recommended template if in auto mode and only one template
        if (routeCreationMode === 'auto' && templates.length === 1 && !localSelectedTemplate) {
            const template = recommendedTemplate || templates[0];
            setLocalSelectedTemplate(template.id);
            onTemplateSelect(template.id);
        }
    }, [routeCreationMode, templates, recommendedTemplate, localSelectedTemplate, onTemplateSelect]);

    const handleModeChange = (mode: string) => {
        const typedMode = mode as 'auto' | 'manual' | 'empty';
        onModeChange(typedMode);

        // Clear selection when changing modes
        if (typedMode !== routeCreationMode) {
            setLocalSelectedTemplate(null);
            onTemplateSelect(null);
        }

        // Auto-select in auto mode if only one template
        if (typedMode === 'auto' && templates.length === 1) {
            const template = recommendedTemplate || templates[0];
            setLocalSelectedTemplate(template.id);
            onTemplateSelect(template.id);
        }
    };

    const handleTemplateSelect = (id: number) => {
        setLocalSelectedTemplate(id);
        onTemplateSelect(id);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-3">Manufacturing Route Setup</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Choose how to set up the manufacturing route for this order.
                    All orders require a route, but it can be created without steps for simple execution.
                </p>
            </div>

            <RadioGroup value={routeCreationMode} onValueChange={handleModeChange}>
                <div className="space-y-3">
                    {/* Automatic Template Selection */}
                    <Label
                        htmlFor="mode-auto"
                        className={cn(
                            "cursor-pointer",
                            !hasTemplatesForCategory && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Card className={cn(
                            "transition-all",
                            routeCreationMode === 'auto' && "ring-2 ring-primary"
                        )}>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem
                                        value="auto"
                                        id="mode-auto"
                                        disabled={!hasTemplatesForCategory}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">
                                                Automatic - Use template for {item?.category?.name || 'item type'}
                                            </CardTitle>
                                            {hasTemplatesForCategory && (
                                                <Badge variant="secondary">
                                                    {templates.length} available
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {hasTemplatesForCategory
                                                ? `Use a pre-configured template designed for ${item?.category?.name || 'this item type'}`
                                                : `No templates available for ${item?.category?.name || 'this item type'}`
                                            }
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Label>

                    {/* Manual Template Selection */}
                    <Label htmlFor="mode-manual" className="cursor-pointer">
                        <Card className={cn(
                            "transition-all",
                            routeCreationMode === 'manual' && "ring-2 ring-primary"
                        )}>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                            <CardTitle className="text-base">
                                                Manual - Select any template
                                            </CardTitle>
                                            <Badge variant="secondary">
                                                {allTemplates.length} total
                                            </Badge>
                                        </div>
                                        <CardDescription className="mt-1">
                                            Choose from any available template regardless of item type
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Label>

                    {/* Empty Route */}
                    <Label htmlFor="mode-empty" className="cursor-pointer">
                        <Card className={cn(
                            "transition-all",
                            routeCreationMode === 'empty' && "ring-2 ring-primary"
                        )}>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem value="empty" id="mode-empty" className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <FileX2 className="h-5 w-5 text-orange-600" />
                                            <CardTitle className="text-base">
                                                Empty - Create without steps
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="mt-1">
                                            Create a route without steps. Production will use direct execution mode.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Label>
                </div>
            </RadioGroup>

            {/* Template Selection */}
            {routeCreationMode === 'auto' && hasTemplatesForCategory && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="font-medium">
                            {showTemplateSelection
                                ? 'Select Template'
                                : 'Template Selected'}
                        </h4>
                        {showTemplateSelection ? (
                            <TemplateSelector
                                templates={templates}
                                selected={localSelectedTemplate}
                                onSelect={handleTemplateSelect}
                                recommended={recommendedTemplate?.id}
                            />
                        ) : (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>{templates[0].name}</strong> will be automatically applied to this order.
                                    {templates[0].description && (
                                        <span className="block mt-1 text-muted-foreground">
                                            {templates[0].description}
                                        </span>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </>
            )}

            {routeCreationMode === 'manual' && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="font-medium">Select Template</h4>
                        <TemplateSelector
                            templates={allTemplates}
                            selected={localSelectedTemplate}
                            onSelect={handleTemplateSelect}
                            showCategories
                        />
                    </div>
                </>
            )}

            {routeCreationMode === 'empty' && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        The order will be created with an empty route. You can add steps later or execute
                        production directly without steps. This is suitable for simple one-step operations.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};
