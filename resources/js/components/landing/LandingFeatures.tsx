import { useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';
import { LandingContainer } from './LandingContainer';

const features = [
    {
        title: 'Items and BOMs',
        description:
            "Manage your products and their relationships to each other in a intuitive and visual way.",
        image: '/images/screenshots/hero_3d_marquee/2025-10-11_4.19.04PM.png',
    },
    {
        title: 'Production Routes',
        description:
            "Define the production steps and transition rules every sub-assembly.",
        image: '/images/screenshots/hero_3d_marquee/2025-10-11_4.21.14PM.png',
    },
    {
        title: 'Scheduling',
        description:
            "Schedule your production to coordinate workcells and maximize efficiency.",
        image: '/images/screenshots/hero_3d_marquee/2025-10-11_4.21.28PM.png',
    },
    {
        title: 'Tracking',
        description:
            'Easily distribute work thru the shop floor with QR codes and mobile scanning.',
        image: '/images/screenshots/reporting.png',
    },
];

export function LandingFeatures() {
    const [tabOrientation, setTabOrientation] = useState<'horizontal' | 'vertical'>(
        'horizontal'
    );

    useEffect(() => {
        const lgMediaQuery = window.matchMedia('(min-width: 1024px)');

        function onMediaQueryChange({ matches }: { matches: boolean }) {
            setTabOrientation(matches ? 'vertical' : 'horizontal');
        }

        onMediaQueryChange(lgMediaQuery);
        lgMediaQuery.addEventListener('change', onMediaQueryChange);

        return () => {
            lgMediaQuery.removeEventListener('change', onMediaQueryChange);
        };
    }, []);

    return (
        <section
            id="features"
            aria-label="Features for running your books"
            className="relative overflow-hidden bg-blue-600 pb-28 pt-20 sm:py-32"
        >
            {/* Grid pattern background */}
            <div className="absolute inset-0 z-0">
                {/* Grid pattern using CSS background */}
                <div
                    className="absolute inset-0 z-10 opacity-20 animate-grid-fade-in"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, white 1px, transparent 1px),
                            linear-gradient(to bottom, white 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        maskImage: 'linear-gradient(315deg, black 0%, black 50%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(315deg, black 0%, black 50%, transparent 100%)',
                        maskSize: '200% 200%',
                        WebkitMaskSize: '200% 200%',
                        maskPosition: '100% 100%',
                        WebkitMaskPosition: '100% 100%',
                        animation: 'gridReveal180 2s ease-out forwards'
                    }}
                />

                {/* Dot pattern at intersections */}
                <div
                    className="absolute inset-0 z-20 opacity-15 animate-grid-fade-in"
                    style={{
                        backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)',
                        backgroundSize: '60px 60px',
                        backgroundPosition: '30px 30px',
                        maskImage: 'linear-gradient(315deg, black 0%, black 50%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(315deg, black 0%, black 50%, transparent 100%)',
                        maskSize: '200% 200%',
                        WebkitMaskSize: '200% 200%',
                        maskPosition: '100% 100%',
                        WebkitMaskPosition: '100% 100%',
                        animation: 'gridReveal180 2s ease-out 0.3s forwards'
                    }}
                />

                {/* Diagonal overlay to mask grid pattern - showing only bottom left */}
                <div
                    className="absolute inset-0 z-30"
                    style={{
                        background: `linear-gradient(225deg, 
                            rgb(37, 99, 235) 0%,
                            rgb(37, 99, 235) 30%,
                            rgba(37, 99, 235, 0.8) 50%,
                            rgba(37, 99, 235, 0.3) 70%,
                            transparent 100%
                        )`
                    }}
                />

                {/* Additional gradient overlay for depth on the lower area */}
                <div className="absolute inset-0 z-40 bg-gradient-to-t from-blue-700/20 via-transparent to-transparent" />
            </div>

            <LandingContainer className="relative z-40">
                <div className="max-w-2xl md:mx-auto md:text-center xl:max-w-none">
                    <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl md:text-5xl">
                        Everything you need to run your shop.
                    </h2>
                    <p className="mt-6 text-lg tracking-tight text-blue-100">
                        Your products are complex, your production process doesn&apos;t have to be.
                    </p>
                </div>
                <TabGroup
                    className="mt-16 grid grid-cols-1 items-center gap-y-2 pt-10 sm:gap-y-6 md:mt-20 lg:grid-cols-12 lg:pt-0"
                    vertical={tabOrientation === 'vertical'}
                >
                    {({ selectedIndex }) => (
                        <>
                            <div className="-mx-4 flex overflow-x-auto pb-4 sm:mx-0 sm:overflow-visible sm:pb-0 lg:col-span-5">
                                <TabList className="relative z-10 flex gap-x-4 whitespace-nowrap px-4 sm:mx-auto sm:px-0 lg:mx-0 lg:block lg:gap-x-0 lg:gap-y-1 lg:whitespace-normal">
                                    {features.map((feature, featureIndex) => (
                                        <div
                                            key={feature.title}
                                            className={clsx(
                                                'group relative rounded-full px-4 py-1 lg:rounded-l-xl lg:rounded-r-none lg:p-6',
                                                selectedIndex === featureIndex
                                                    ? 'bg-white lg:bg-white/10 lg:ring-1 lg:ring-inset lg:ring-white/10'
                                                    : 'hover:bg-white/10 lg:hover:bg-white/5'
                                            )}
                                        >
                                            <h3>
                                                <Tab
                                                    className={clsx(
                                                        'font-display text-lg focus:outline-none',
                                                        selectedIndex === featureIndex
                                                            ? 'text-blue-600 lg:text-white'
                                                            : 'text-blue-100 hover:text-white lg:text-white'
                                                    )}
                                                >
                                                    <span className="absolute inset-0 rounded-full lg:rounded-l-xl lg:rounded-r-none" />
                                                    {feature.title}
                                                </Tab>
                                            </h3>
                                            <p
                                                className={clsx(
                                                    'mt-2 hidden text-sm lg:block',
                                                    selectedIndex === featureIndex
                                                        ? 'text-white'
                                                        : 'text-blue-100 group-hover:text-white'
                                                )}
                                            >
                                                {feature.description}
                                            </p>
                                        </div>
                                    ))}
                                </TabList>
                            </div>
                            <TabPanels className="lg:col-span-7">
                                {features.map((feature) => (
                                    <TabPanel key={feature.title} unmount={false}>
                                        <div className="relative sm:px-6 lg:hidden">
                                            <div className="absolute -inset-x-4 -bottom-6 -top-4 bg-white/10 ring-1 ring-inset ring-white/10 sm:inset-x-0 sm:rounded-t-xl" />
                                            <p className="relative mx-auto max-w-2xl text-base text-white sm:text-center">
                                                {feature.description}
                                            </p>
                                        </div>
                                        <div className="mt-10 w-[45rem] overflow-hidden rounded-xl bg-slate-50 shadow-xl shadow-blue-900/20 sm:w-auto lg:mt-0 lg:w-[67.8125rem]">
                                            <img
                                                className="w-full"
                                                src={feature.image}
                                                alt=""
                                                sizes="(min-width: 1024px) 67.8125rem, (min-width: 640px) 100vw, 45rem"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://placehold.co/1085x655/e2e8f0/64748b?text=' + encodeURIComponent(feature.title + ' Screenshot');
                                                }}
                                            />
                                        </div>
                                    </TabPanel>
                                ))}
                            </TabPanels>
                        </>
                    )}
                </TabGroup>
            </LandingContainer>
        </section>
    );
}