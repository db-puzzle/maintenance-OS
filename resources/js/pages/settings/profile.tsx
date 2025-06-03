import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

interface ProfileForm {
    name: string;
    email: string;
    timezone: string;
}

// Common timezones grouped by region
const timezones = {
    'Americas': [
        { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
        { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
        { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
        { value: 'America/Sao_Paulo', label: 'Brasília Time' },
        { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
        { value: 'America/Mexico_City', label: 'Mexico City' },
    ],
    'Europe': [
        { value: 'Europe/London', label: 'London' },
        { value: 'Europe/Paris', label: 'Paris' },
        { value: 'Europe/Berlin', label: 'Berlin' },
        { value: 'Europe/Madrid', label: 'Madrid' },
        { value: 'Europe/Rome', label: 'Rome' },
        { value: 'Europe/Moscow', label: 'Moscow' },
    ],
    'Asia': [
        { value: 'Asia/Tokyo', label: 'Tokyo' },
        { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
        { value: 'Asia/Singapore', label: 'Singapore' },
        { value: 'Asia/Kolkata', label: 'India Standard Time' },
        { value: 'Asia/Dubai', label: 'Dubai' },
    ],
    'Pacific': [
        { value: 'Australia/Sydney', label: 'Sydney' },
        { value: 'Australia/Melbourne', label: 'Melbourne' },
        { value: 'Pacific/Auckland', label: 'Auckland' },
    ],
    'Other': [
        { value: 'UTC', label: 'UTC' },
    ]
};

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<Required<ProfileForm>>({
        name: auth.user.name,
        email: auth.user.email,
        timezone: (auth.user.timezone as string) || 'UTC',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your name and email address" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="timezone">Timezone</Label>

                            <Select value={data.timezone} onValueChange={(value) => setData('timezone', value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select your timezone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(timezones).map(([region, zones]) => (
                                        <div key={region}>
                                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                                {region}
                                            </div>
                                            {zones.map((zone) => (
                                                <SelectItem key={zone.value} value={zone.value}>
                                                    {zone.label}
                                                </SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>

                            <InputError className="mt-2" message={errors.timezone} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="text-muted-foreground -mt-4 text-sm">
                                    Your email address is unverified.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                    >
                                        Click here to resend the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
