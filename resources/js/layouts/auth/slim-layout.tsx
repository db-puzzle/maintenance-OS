import { PropsWithChildren } from 'react';

export function SlimLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen">
            <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    {children}
                </div>
            </div>
            <div className="relative hidden w-0 flex-1 lg:block">
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/images/background-auth.jpg"
                    alt=""
                />
            </div>
        </div>
    );
}
