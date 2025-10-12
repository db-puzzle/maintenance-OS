import { Link } from '@inertiajs/react';
import { LandingContainer } from './LandingContainer';
import AppLogoIcon from '@/components/app-logo-icon';

export function LandingFooter() {
    return (
        <footer className="bg-slate-50 dark:bg-slate-900">
            <LandingContainer>
                <div className="py-16">
                    <div className="flex justify-center">
                        <Link href="/" aria-label="Home" className="flex items-center">
                            <AppLogoIcon className="h-10 w-auto text-blue-600 dark:text-blue-400" />
                            <span className="ml-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                StreamLine
                            </span>
                        </Link>
                    </div>
                    <nav className="mt-10 text-sm" aria-label="quick links">
                        <div className="-my-1 flex justify-center gap-x-6">
                            <Link
                                href="#features"
                                className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                                Features
                            </Link>
                            <Link
                                href="#testimonials"
                                className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                                Testimonials
                            </Link>
                            <Link
                                href="#pricing"
                                className="rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                                Pricing
                            </Link>
                        </div>
                    </nav>
                </div>
                <div className="flex flex-col items-center border-t border-slate-400/10 py-10 sm:flex-row-reverse sm:justify-between">
                    <div className="flex gap-x-6">
                        <Link
                            href="https://twitter.com"
                            className="group"
                            aria-label="StreamLine on Twitter"
                        >
                            <svg
                                className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700 dark:fill-slate-400 dark:group-hover:fill-slate-300"
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                            </svg>
                        </Link>
                        <Link
                            href="https://github.com"
                            className="group"
                            aria-label="StreamLine on GitHub"
                        >
                            <svg
                                className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700 dark:fill-slate-400 dark:group-hover:fill-slate-300"
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-slate-500 sm:mt-0 dark:text-slate-400">
                        Copyright &copy; {new Date().getFullYear()} StreamLine. All rights reserved.
                    </p>
                </div>
            </LandingContainer>
        </footer>
    );
}