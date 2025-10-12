import { LandingContainer } from './LandingContainer';
import { usePage, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import { ThreeDMarquee } from '../../../../components/ui/shadcn-io/3d-marquee';

export function LandingHero() {
    const { auth } = usePage<SharedData>().props;

    // Screenshots for the 3D marquee - duplicating for better marquee effect
    const screenshots = [
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.02.35PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.02.57PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.03.08PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.19.04PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.19.40PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.20.02PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.20.37PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.21.14PM.png',
        '/images/screenshots/hero_3d_marquee/2025-10-11_4.21.28PM.png',
    ];

    // Duplicate the array to have more items for smoother marquee
    const images = [...screenshots, ...screenshots, ...screenshots];

    return (
        <div className="relative overflow-hidden bg-white dark:bg-slate-900">
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

                {/* Radial gradient to fade pattern behind text */}
                <div className="absolute inset-0 z-40">
                    <div className="absolute left-0 top-0 h-full w-2/3 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent" />
                </div>
            </div>

            <LandingContainer className="pb-16 pt-12 sm:pt-16 lg:pt-20">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16 lg:gap-y-20">
                    <div className="relative z-10 mx-auto max-w-2xl lg:col-span-6 lg:max-w-none lg:pt-6 xl:col-span-5">
                        {/* Tagline */}
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            BY THE MAKERS OF MAINTENANCEOS
                        </p>

                        {/* Main heading */}
                        <h1 className="mt-8 text-4xl font-medium tracking-tight text-slate-900 sm:text-6xl dark:text-white">
                            Manufacturing enters the age of AI.
                        </h1>

                        {/* Technology badges */}
                        <div className="mt-6 flex items-center gap-x-4">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                                </svg>
                                Production
                            </span>
                            <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                                </svg>
                                Quality
                            </span>
                            <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                                <svg className="mr-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                                </svg>
                                Maintenance
                            </span>
                        </div>

                        {/* Description */}
                        <p className="mt-6 text-lg text-slate-600 dark:text-slate-400">
                            All the tools you need to manage your manufacturing operation. Complement your existing ERP with the toll you always wished you had or start fresh using StreamLineOS as your  ERP.
                        </p>

                        {/* CTA buttons */}
                        <div className="mt-10 flex items-center gap-x-6">
                            {auth.user ? (
                                <>
                                    <Button asChild variant="blue">
                                        <Link href={route('home')}>Go to Dashboard</Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="#features">Learn more</Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button asChild variant="blue">
                                        <Link href={route('register')}>Get started</Link>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <Link href="#features">Documentation</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hero image area */}
                    <div className="relative mt-8 sm:mt-12 lg:col-span-6 lg:row-span-2 lg:-mt-10 xl:col-span-7">
                        <div className="-mx-4 sm:-mx-6 lg:-mr-8 xl:-mr-12">
                            <div className="rounded-xl bg-gray-100 p-2 sm:p-4 dark:bg-gray-800">
                                <ThreeDMarquee images={images} className="mx-auto" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom section with category links */}
                <div className="relative z-10 mt-20 lg:mt-32">
                    <div className="border-t border-slate-200 pt-10 dark:border-slate-700">
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Maintenance
                                </h3>
                                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                                    Work orders, asset tracking, preventive maintenance — everything you need to manage your facilities.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Operations
                                </h3>
                                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                                    Scheduling, inventory, reporting — all the tools for smooth daily operations management.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Analytics
                                </h3>
                                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                                    Performance metrics, cost analysis, predictive insights — data-driven maintenance decisions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </LandingContainer>
        </div>
    );
}