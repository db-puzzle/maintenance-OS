"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@inertiajs/react";
import { type ReactNode } from "react";
import { type BreadcrumbItem } from "@/types";

interface EditLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    breadcrumbs: BreadcrumbItem[];
    backRoute: string;
    children?: ReactNode;
    onSave?: () => void;
    isSaving?: boolean;
}

export default function EditLayout({
    title,
    subtitle,
    breadcrumbs,
    backRoute,
    children,
    onSave,
    isSaving,
}: EditLayoutProps) {
    return (
        <div className="bg-background pt-4 md:pt-6">
            <div className="container mx-auto lg:px-6 px-4 flex flex-col gap-6">
                {/* Main content */}
                <div className="flex justify-between md:items-center gap-6 md:flex-row flex-col">
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
                                Salvar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className="container mx-auto lg:px-6 px-4 py-6">
                <div className="w-full">
                    {children}
                </div>
            </div>
        </div>
    );
} 