import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

interface LandingContainerProps extends PropsWithChildren {
    className?: string;
}

export function LandingContainer({ className, children, ...props }: LandingContainerProps) {
    return (
        <div
            className={clsx('mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12', className)}
            {...props}
        >
            {children}
        </div>
    );
}
