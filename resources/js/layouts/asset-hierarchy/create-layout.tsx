"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@inertiajs/react";
import { type ReactNode } from "react";
import { type BreadcrumbItem } from "@/types";

interface CreateLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    breadcrumbs: BreadcrumbItem[];
    backRoute: string;
    children?: ReactNode;
    onSave?: () => void;
    isSaving?: boolean;
    contentWidth?: 'full' | 'custom';
    contentClassName?: string;
    innerLayout?: boolean;
    saveButtonText?: string;
}

export default function CreateLayout({
    title,
    subtitle,
    breadcrumbs,
    backRoute,
    children,
    onSave,
    isSaving,
    contentWidth = 'full',
    contentClassName,
    innerLayout = false,
    saveButtonText = 'Criar',
}: CreateLayoutProps) {
    const containerClass = contentWidth === 'custom' ? contentClassName : 'w-full';
    
    return (
        <div className="bg-background pt-4 md:pt-6">
            <div className={`container mx-auto lg:px-6 px-4 flex flex-col gap-6 ${innerLayout ? 'max-w-none p-0' : ''}`}>
                {/* Wrapper div com a largura do conteúdo */}
                <div className={containerClass}>
                    {/* Main content */}
                    <div className="flex justify-between md:items-center gap-6 md:flex-row flex-col w-full">
                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-sm lg:text-base text-muted-foreground">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {/* Buttons */}
                        <div className="flex gap-2 justify-end flex-row-reverse md:flex-row">
                            <Button variant="outline" asChild>
                                <Link href={backRoute}>Cancelar</Link>
                            </Button>
                            {onSave && (
                                <Button onClick={onSave} disabled={isSaving}>
                                    {saveButtonText}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className={`container mx-auto lg:px-6 px-4 py-6 ${innerLayout ? 'max-w-none p-0' : ''}`}>
                <div className={containerClass}>
                    {children}
                </div>
            </div>
        </div>
    );
} 