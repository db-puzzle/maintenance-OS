import { Link } from '@inertiajs/react';
import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

const baseStyles = {
    solid:
        'group inline-flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2',
    outline:
        'group inline-flex ring-1 items-center justify-center rounded-full py-2 px-4 text-sm',
};

const variantStyles = {
    solid: {
        slate:
            'bg-slate-900 text-white hover:bg-slate-700 hover:text-slate-100 active:bg-slate-800 active:text-slate-300 focus-visible:outline-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 dark:active:bg-slate-300',
        blue: 'bg-blue-600 text-white hover:text-slate-100 hover:bg-blue-500 active:bg-blue-800 active:text-blue-100 focus-visible:outline-blue-600 dark:bg-blue-400 dark:text-white dark:hover:bg-blue-500',
        white:
            'bg-white text-slate-900 hover:bg-blue-50 active:bg-blue-200 active:text-slate-600 focus-visible:outline-white dark:bg-slate-900 dark:text-white dark:hover:bg-slate-700 dark:active:bg-slate-800',
    },
    outline: {
        slate:
            'ring-slate-200 text-slate-700 hover:text-slate-900 hover:ring-slate-300 active:bg-slate-100 active:text-slate-600 focus-visible:outline-blue-600 focus-visible:ring-slate-300 dark:ring-slate-700 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:ring-slate-600 dark:active:bg-slate-800 dark:active:text-slate-400',
        white:
            'ring-slate-700 text-white hover:ring-slate-500 active:ring-slate-700 active:text-slate-400 focus-visible:outline-white',
    },
};

type ButtonProps = (
    | {
        variant?: 'solid';
        color?: keyof typeof variantStyles.solid;
    }
    | {
        variant: 'outline';
        color?: keyof typeof variantStyles.outline;
    }
) &
    (
        | ComponentPropsWithoutRef<typeof Link>
        | (Omit<ComponentPropsWithoutRef<'button'>, 'color'> & {
            href?: undefined;
        })
    );

export function LandingButton({ className, ...props }: ButtonProps) {
    props.variant ??= 'solid';
    props.color ??= 'slate';

    className = clsx(
        baseStyles[props.variant],
        props.variant === 'outline'
            ? variantStyles.outline[props.color]
            : props.variant === 'solid'
                ? variantStyles.solid[props.color]
                : undefined,
        className,
    );

    return typeof props.href === 'undefined' ? (
        <button className={className} {...props} />
    ) : (
        <Link className={className} {...props} />
    );
}
