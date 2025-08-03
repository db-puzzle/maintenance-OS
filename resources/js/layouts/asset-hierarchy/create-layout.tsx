'use client';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';
interface CreateLayoutProps {
    title: string;
    subtitle?: string | ReactNode;
    backRoute: string;
    children?: ReactNode;
    onSave?: () => void;
    isSaving?: boolean;
    contentWidth?: 'full' | 'custom';
    contentClassName?: string;
    saveButtonText?: string;
}
export default function CreateLayout({
    title,
    subtitle,
    backRoute,
    children,
    onSave,
    isSaving,
    contentWidth = 'full',
    contentClassName,
    saveButtonText = 'Criar',
}: CreateLayoutProps) {
    const containerClass = contentWidth === 'custom' ? contentClassName : 'w-full';
    return (
        <div className="space-y-6 p-5">
            <div className={`${containerClass}`}>
                {/* Main content */}
                <div className="flex w-full flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-foreground text-lg leading-7 font-semibold lg:text-xl">{title}</h2>
                        {subtitle && <p className="text-muted-foreground text-sm leading-5">{subtitle}</p>}
                    </div>
                    {/* Buttons */}
                    <div className="flex w-full flex-row-reverse justify-end gap-2 md:w-auto md:flex-row">
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
