import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { SlimLayout } from '@/layouts/auth/slim-layout';
import { LandingButton } from '@/components/landing/LandingButton';
import { LandingTextField } from '@/components/landing/LandingTextField';
import AppLogoIcon from '@/components/app-logo-icon';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    timezone: string;
};

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        timezone: 'UTC',
    });

    useEffect(() => {
        // Detect browser timezone on component mount
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTimezone) {
            setData('timezone', browserTimezone);
        }
    }, [setData]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <SlimLayout>
            <Head title="Sign Up" />
            <div className="flex">
                <Link href="/" aria-label="Home">
                    <AppLogoIcon className="h-10 w-auto text-blue-600 dark:text-blue-400" />
                </Link>
            </div>
            <h2 className="mt-20 text-lg font-semibold text-gray-900 dark:text-white">
                Get started for free
            </h2>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Already registered?{' '}
                <Link
                    href={route('login')}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                    Sign in
                </Link>{' '}
                to your account.
            </p>
            <form
                className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8"
                onSubmit={submit}
            >
                <LandingTextField
                    label="Full name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    autoFocus
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    error={errors.name}
                    disabled={processing}
                />
                <LandingTextField
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    error={errors.email}
                    disabled={processing}
                />
                <LandingTextField
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    disabled={processing}
                />
                <LandingTextField
                    label="Confirm password"
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    error={errors.password_confirmation}
                    disabled={processing}
                />
                {/* Hidden timezone field */}
                <input type="hidden" name="timezone" value={data.timezone} />
                <div>
                    <LandingButton
                        type="submit"
                        variant="solid"
                        color="blue"
                        className="w-full"
                        disabled={processing}
                    >
                        <span>
                            Sign up <span aria-hidden="true">&rarr;</span>
                        </span>
                    </LandingButton>
                </div>
            </form>
        </SlimLayout>
    );
}