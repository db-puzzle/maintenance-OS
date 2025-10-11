import { PropsWithChildren } from 'react';

export function SlimLayout({ children }: PropsWithChildren) {
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Full-screen grid pattern background */}
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

                {/* Radial gradient to fade pattern - from left to right */}
                <div className="absolute inset-0 z-40">
                    <div className="absolute left-0 top-0 h-full w-2/3 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent" />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-50 flex min-h-screen">
                <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                    <div className="mx-auto w-full max-w-sm lg:w-96">
                        {children}
                    </div>
                </div>
                <div className="hidden w-0 flex-1 lg:block">
                    {/* Empty space on the right side on larger screens */}
                </div>
            </div>
        </div>
    );
}
