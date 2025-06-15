'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

interface EditLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    backRoute: string;
    children?: ReactNode;
    onSave?: () => void;
    isSaving?: boolean;
}

export default function EditLayout({ title, subtitle, backRoute, children, onSave, isSaving }: EditLayoutProps) {
    return (
        <div className="bg-background pt-4 md:pt-6">
            <div className="container mx-auto flex flex-col gap-6 px-4 lg:px-6">
                {/* Main content */}
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
                        {subtitle && <p className="text-muted-foreground text-sm lg:text-base">{subtitle}</p>}
                    </div>
                    {/* Buttons */}
                    <div className="flex flex-row-reverse justify-end gap-2 md:flex-row">
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
            <div className="container mx-auto px-4 py-6 lg:px-6">
                <div className="w-full">{children}</div>
            </div>
        </div>
    );
}
