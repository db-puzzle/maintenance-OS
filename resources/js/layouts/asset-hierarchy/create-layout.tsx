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
        <div className="space-y-6 p-5">
            <div className={`${containerClass}`}>
                {/* Main content */}
                <div className="flex justify-between md:items-center gap-6 md:flex-row flex-col w-full">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg lg:text-xl font-semibold text-foreground leading-7">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground leading-5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {/* Buttons */}
                    <div className="flex gap-2 justify-end flex-row-reverse md:flex-row w-full md:w-auto">
                        <Button variant="outline" asChild className="flex-1 md:flex-none">
                            <Link href={backRoute}>Cancelar</Link>
                        </Button>
                        {onSave && (
                            <Button onClick={onSave} disabled={isSaving} className="flex-1 md:flex-none">
                                {saveButtonText}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
} 