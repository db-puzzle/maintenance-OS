import { Link, usePage } from '@inertiajs/react';
import { Fragment } from 'react';
import {
    Popover,
    PopoverButton,
    PopoverBackdrop,
    PopoverPanel,
    Transition,
} from '@headlessui/react';
import clsx from 'clsx';
import { LandingButton } from './LandingButton';
import { LandingContainer } from './LandingContainer';
import AppLogoIcon from '@/components/app-logo-icon';
import type { SharedData } from '@/types';

function MobileNavLink({
    href,
    children,
}: {
    href: string;
    children: React.ReactNode;
}) {
    return (
        <PopoverButton as={Link} href={href} className="block w-full p-2">
            {children}
        </PopoverButton>
    );
}

function MobileNavIcon({ open }: { open: boolean }) {
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 overflow-visible stroke-slate-700 dark:stroke-slate-300"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
        >
            <path
                d="M0 1H14M0 7H14M0 13H14"
                className={clsx(
                    'origin-center transition',
                    open && 'scale-90 opacity-0',
                )}
            />
            <path
                d="M2 2L12 12M12 2L2 12"
                className={clsx(
                    'origin-center transition',
                    !open && 'scale-90 opacity-0',
                )}
            />
        </svg>
    );
}

function MobileNavigation() {
    const { auth } = usePage<SharedData>().props;

    return (
        <Popover>
            <PopoverButton
                className="relative z-10 flex h-8 w-8 items-center justify-center ui-not-focus-visible:outline-none"
                aria-label="Toggle Navigation"
            >
                {({ open }) => <MobileNavIcon open={open} />}
            </PopoverButton>
            <Transition>
                <TransitionChild
                    as={Fragment}
                    enter="duration-150 ease-out"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="duration-150 ease-in"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <PopoverBackdrop className="fixed inset-0 bg-slate-300/50 dark:bg-black/50" />
                </TransitionChild>
                <TransitionChild
                    as={Fragment}
                    enter="duration-150 ease-out"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="duration-100 ease-in"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <PopoverPanel className="absolute inset-x-0 top-full mt-4 flex origin-top flex-col rounded-2xl bg-white p-4 text-lg tracking-tight text-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 dark:text-slate-100">
                        <MobileNavLink href="#features">Features</MobileNavLink>
                        <MobileNavLink href="#testimonials">Testimonials</MobileNavLink>
                        <MobileNavLink href="#pricing">Pricing</MobileNavLink>
                        <hr className="m-2 border-slate-300/40 dark:border-slate-700/40" />
                        {auth.user ? (
                            <MobileNavLink href={route('home')}>Dashboard</MobileNavLink>
                        ) : (
                            <MobileNavLink href={route('login')}>Sign in</MobileNavLink>
                        )}
                    </PopoverPanel>
                </TransitionChild>
            </Transition>
        </Popover>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
            {children}
        </Link>
    );
}

// Helper component for transitions
interface TransitionChildProps {
    children: React.ReactNode;
    as?: React.ElementType;
    enter?: string;
    enterFrom?: string;
    enterTo?: string;
    leave?: string;
    leaveFrom?: string;
    leaveTo?: string;
}

function TransitionChild({ children, ...props }: TransitionChildProps) {
    return <Transition.Child {...props}>{children}</Transition.Child>;
}

export function LandingHeader() {
    const { auth } = usePage<SharedData>().props;

    return (
        <header className="py-10">
            <LandingContainer>
                <nav className="relative z-50 flex justify-between">
                    <div className="flex items-center md:gap-x-12">
                        <Link href="/" aria-label="Home" className="flex items-center">
                            <AppLogoIcon className="h-10 w-auto text-blue-600 dark:text-blue-400" />
                            <span className="ml-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                TaxPal
                            </span>
                        </Link>
                        <div className="hidden md:flex md:gap-x-6">
                            <NavLink href="#features">Features</NavLink>
                            <NavLink href="#testimonials">Testimonials</NavLink>
                            <NavLink href="#pricing">Pricing</NavLink>
                        </div>
                    </div>
                    <div className="flex items-center gap-x-5 md:gap-x-8">
                        {auth.user ? (
                            <>
                                <div className="hidden md:block">
                                    <NavLink href={route('home')}>Dashboard</NavLink>
                                </div>
                                <LandingButton href={route('home')} color="blue">
                                    <span>Go to Dashboard</span>
                                </LandingButton>
                            </>
                        ) : (
                            <>
                                <div className="hidden md:block">
                                    <NavLink href={route('login')}>Sign in</NavLink>
                                </div>
                                <LandingButton href={route('register')} color="blue">
                                    <span>
                                        Get started <span className="hidden lg:inline">today</span>
                                    </span>
                                </LandingButton>
                            </>
                        )}
                        <div className="-mr-1 md:hidden">
                            <MobileNavigation />
                        </div>
                    </div>
                </nav>
            </LandingContainer>
        </header>
    );
}