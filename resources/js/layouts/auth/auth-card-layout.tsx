import AppLogoIcon from '@/components/app-logo-icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
            {/* Grid pattern background */}
            <div className="absolute inset-0 z-0">
                {/* Base gradient background */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800" />

                {/* Grid pattern using CSS background */}
                <div
                    className="absolute inset-0 z-10 opacity-[0.15] dark:opacity-[0.12]"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, #64748b 1px, transparent 1px),
                            linear-gradient(to bottom, #64748b 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px'
                    }}
                />

                {/* Dot pattern at intersections */}
                <div
                    className="absolute inset-0 z-20 opacity-[0.12] dark:opacity-[0.08]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #64748b 2px, transparent 2px)',
                        backgroundSize: '60px 60px',
                        backgroundPosition: '30px 30px'
                    }}
                />

                {/* Gradient overlay for depth - subtle gradients */}
                <div className="absolute inset-0 z-30 bg-gradient-to-t from-white/60 via-white/20 to-transparent dark:from-slate-900/60 dark:via-slate-900/20 dark:to-transparent" />

                {/* Diagonal gradient to fade pattern from bottom-left to top-right */}
                <div className="absolute inset-0 z-40">
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(45deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 30%, transparent 60%)'
                        }}
                    />
                    <div
                        className="absolute inset-0 dark:block hidden"
                        style={{
                            background: 'linear-gradient(45deg, rgba(15,23,42,1) 0%, rgba(15,23,42,0.8) 30%, transparent 60%)'
                        }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-50 flex w-full max-w-md flex-col gap-6">
                <Link href={route('home')} className="flex items-center gap-2 self-center font-medium">
                    <div className="flex h-9 w-9 items-center justify-center">
                        <AppLogoIcon className="size-9 fill-current text-black dark:text-white" />
                    </div>
                </Link>
                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl shadow-xl backdrop-blur-sm">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">{children}</CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
