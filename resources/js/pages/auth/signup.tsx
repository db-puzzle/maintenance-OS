import { Head, router, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import AuthLayout from '@/layouts/auth-layout';
import { cn } from '@/lib/utils';

/**
 * Plan type definition
 */
type Plan = {
    id: number;
    name: string;
    description: string | null;
    price: number;
    trial_days: number;
    is_active: boolean;
};

/**
 * Component props
 */
type SignupPageProps = {
    plans: Plan[];
    subdomainCheck?: {
        available: boolean;
        message: string;
        subdomain: string;
    };
};

/**
 * Signup form data
 */
type SignupForm = {
    company_name: string;
    subdomain: string;
    plan_id: number;
    admin_name: string;
    admin_email: string;
    admin_password: string;
    admin_password_confirmation: string;
    terms_accepted: boolean;
};

/**
 * Tenant signup page (for creating new tenant accounts)
 * This is different from register.tsx which is for tenant users
 */
export default function Signup({ plans }: SignupPageProps) {
    const [appDomain] = useState(() => window.location.hostname);

    // Get flash data and errors from Inertia
    const page = usePage<SignupPageProps>();
    const { subdomainCheck } = page.props;
    const pageErrors = page.props.errors as Partial<Record<keyof SignupForm | 'general', string>>;

    const { data, setData, post, processing, errors, reset } = useForm<SignupForm>({
        company_name: '',
        subdomain: '',
        plan_id: plans[0]?.id || 0,
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
        terms_accepted: false,
    });

    // State for subdomain availability checking
    const [subdomainStatus, setSubdomainStatus] = useState<{
        checking: boolean;
        available: boolean | null;
        message: string;
        lastChecked: string;
    }>({
        checking: false,
        available: null,
        message: '',
        lastChecked: '',
    });

    // Handle Inertia flash data for subdomain check
    useEffect(() => {
        if (subdomainCheck) {
            setSubdomainStatus({
                checking: false,
                available: subdomainCheck.available,
                message: subdomainCheck.message,
                lastChecked: subdomainCheck.subdomain,
            });
        }
    }, [subdomainCheck]);

    /**
     * Check subdomain availability
     */
    const checkSubdomainAvailability = () => {
        const subdomain = data.subdomain.trim();

        // Validate format first (client-side pre-check)
        if (!subdomain || subdomain.length < 3) {
            setSubdomainStatus({
                checking: false,
                available: false,
                message: 'Subdomain must be at least 3 characters',
                lastChecked: '',
            });
            return;
        }

        if (!/^[a-z0-9-]+$/.test(subdomain)) {
            setSubdomainStatus({
                checking: false,
                available: false,
                message: 'Only lowercase letters, numbers, and hyphens allowed',
                lastChecked: '',
            });
            return;
        }

        // Set checking state
        setSubdomainStatus({
            checking: true,
            available: null,
            message: 'Checking availability...',
            lastChecked: '',
        });

        // Use Inertia router to make request
        // Use current origin to ensure we're posting to the right domain
        const checkUrl = `${window.location.origin}/check-subdomain`;

        router.post(
            checkUrl,
            { subdomain },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    // Flash data is available in page.props
                    console.log('✅ Subdomain check response:', page.props);
                },
                onError: (errors) => {
                    // Handle validation errors
                    console.log('❌ Subdomain check errors:', errors);
                    setSubdomainStatus({
                        checking: false,
                        available: false,
                        message: errors.subdomain || 'Error checking availability',
                        lastChecked: '',
                    });
                },
            }
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // Log form submission attempt
        console.log('🚀 Form submission started');
        console.log('📋 Form data:', data);
        console.log('🔗 Posting to:', route('register'));

        post(route('register'), {
            onStart: () => {
                console.log('⏳ Request started...');
            },
            onSuccess: (response) => {
                console.log('✅ Registration successful!', response);
            },
            onError: (errors) => {
                console.error('❌ Registration failed with errors:', errors);
            },
            onFinish: () => {
                console.log('🏁 Request finished');
                reset('admin_password', 'admin_password_confirmation');
            },
        });
    };

    return (
        <AuthLayout
            title="Create Your Account"
            description="Start your 30-day free trial - no credit card required"
            className="max-w-5xl"
        >
            <Head title="Sign Up" />

            {/* General Error Messages */}
            {pageErrors.general && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                    <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold">Registration Failed</h3>
                            <p className="text-sm">{pageErrors.general}</p>
                        </div>
                    </div>
                </div>
            )}

            <form className="flex flex-col gap-6" onSubmit={submit}>
                {/* Two-column layout on medium+ screens, single column on small screens */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column: Form Fields */}
                    <div className="grid gap-6">
                        {/* Company Information */}
                        <div className="grid gap-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <Input
                                id="company_name"
                                type="text"
                                required
                                autoFocus
                                tabIndex={1}
                                value={data.company_name}
                                onChange={(e) => setData('company_name', e.target.value)}
                                disabled={processing}
                                placeholder="Acme Corporation"
                            />
                            <InputError message={errors.company_name} />
                        </div>

                        {/* Subdomain Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="subdomain">Choose Your Subdomain</Label>
                            <div className="flex gap-2">
                                <div className="flex flex-1">
                                    <Input
                                        id="subdomain"
                                        type="text"
                                        required
                                        tabIndex={2}
                                        value={data.subdomain}
                                        onChange={(e) => {
                                            const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                            setData('subdomain', newValue);
                                            // Reset availability status when user changes input
                                            if (subdomainStatus.lastChecked !== newValue) {
                                                setSubdomainStatus({
                                                    checking: false,
                                                    available: null,
                                                    message: '',
                                                    lastChecked: '',
                                                });
                                            }
                                        }}
                                        disabled={processing}
                                        placeholder="acme"
                                        className={cn(
                                            'rounded-r-none',
                                            subdomainStatus.available === true &&
                                                'border-green-500 focus-visible:ring-green-500',
                                            subdomainStatus.available === false &&
                                                'border-red-500 focus-visible:ring-red-500'
                                        )}
                                    />
                                    <span className="border-input bg-muted text-muted-foreground inline-flex h-9 items-center rounded-r-md border border-l-0 px-3 text-sm">
                                        .{appDomain}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={checkSubdomainAvailability}
                                    disabled={
                                        processing ||
                                        subdomainStatus.checking ||
                                        !data.subdomain ||
                                        data.subdomain.length < 3
                                    }
                                    className="shrink-0"
                                >
                                    {subdomainStatus.checking ? (
                                        <>
                                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            Checking
                                        </>
                                    ) : subdomainStatus.available === true ? (
                                        <>
                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                            Available
                                        </>
                                    ) : subdomainStatus.available === false ? (
                                        <>
                                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                            Taken
                                        </>
                                    ) : (
                                        'Check Availability'
                                    )}
                                </Button>
                            </div>

                            {/* Status Message */}
                            {subdomainStatus.message && (
                                <p
                                    className={cn(
                                        'text-sm',
                                        subdomainStatus.available === true && 'text-green-600',
                                        subdomainStatus.available === false && 'text-red-600',
                                        subdomainStatus.available === null && 'text-muted-foreground'
                                    )}
                                >
                                    {subdomainStatus.message}
                                </p>
                            )}

                            <InputError message={errors.subdomain} />
                            <p className="text-muted-foreground text-xs">
                                Your subdomain can only contain lowercase letters, numbers, and hyphens (3-63 characters).
                            </p>
                        </div>

                        {/* Admin User Information */}
                        <div className="border-t pt-6">
                            <h3 className="mb-4 text-sm font-medium">Administrator Account</h3>

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="admin_name">Your Name</Label>
                                    <Input
                                        id="admin_name"
                                        type="text"
                                        required
                                        tabIndex={3}
                                        autoComplete="name"
                                        value={data.admin_name}
                                        onChange={(e) => setData('admin_name', e.target.value)}
                                        disabled={processing}
                                        placeholder="John Doe"
                                    />
                                    <InputError message={errors.admin_name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="admin_email">Email Address</Label>
                                    <Input
                                        id="admin_email"
                                        type="email"
                                        required
                                        tabIndex={4}
                                        autoComplete="email"
                                        value={data.admin_email}
                                        onChange={(e) => setData('admin_email', e.target.value)}
                                        disabled={processing}
                                        placeholder="john@example.com"
                                    />
                                    <InputError message={errors.admin_email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="admin_password">Password</Label>
                                    <Input
                                        id="admin_password"
                                        type="password"
                                        required
                                        tabIndex={5}
                                        autoComplete="new-password"
                                        value={data.admin_password}
                                        onChange={(e) => setData('admin_password', e.target.value)}
                                        disabled={processing}
                                        placeholder="••••••••"
                                    />
                                    <InputError message={errors.admin_password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="admin_password_confirmation">Confirm Password</Label>
                                    <Input
                                        id="admin_password_confirmation"
                                        type="password"
                                        required
                                        tabIndex={6}
                                        autoComplete="new-password"
                                        value={data.admin_password_confirmation}
                                        onChange={(e) => setData('admin_password_confirmation', e.target.value)}
                                        disabled={processing}
                                        placeholder="••••••••"
                                    />
                                    <InputError message={errors.admin_password_confirmation} />
                                </div>
                            </div>
                        </div>

                        {/* Terms Acceptance */}
                        <div className="flex items-start gap-2">
                            <Checkbox
                                id="terms_accepted"
                                checked={data.terms_accepted}
                                onCheckedChange={(checked) => setData('terms_accepted', checked === true)}
                                disabled={processing}
                                tabIndex={7}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="terms_accepted"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    I agree to the{' '}
                                    <TextLink href="/terms" target="_blank">
                                        Terms of Service
                                    </TextLink>{' '}
                                    and{' '}
                                    <TextLink href="/privacy" target="_blank">
                                        Privacy Policy
                                    </TextLink>
                                </label>
                                <InputError message={errors.terms_accepted} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Plan Selection (moves to bottom on small screens) */}
                    {plans.length > 0 && (
                        <div className="grid gap-4 md:border-l md:pl-6">
                            <div>
                                <Label className="text-base">Select Your Plan</Label>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Choose the plan that best fits your needs
                                </p>
                            </div>
                            <RadioGroup
                                value={data.plan_id.toString()}
                                onValueChange={(value) => setData('plan_id', parseInt(value))}
                                disabled={processing}
                                className="grid gap-3"
                            >
                                {plans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={cn(
                                            'border-input flex flex-col gap-3 rounded-lg border p-4 transition-all',
                                            data.plan_id === plan.id
                                                ? 'ring-primary border-primary bg-primary/5 ring-2'
                                                : 'hover:border-muted-foreground/30'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <RadioGroupItem
                                                value={plan.id.toString()}
                                                id={`plan-${plan.id}`}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <Label
                                                    htmlFor={`plan-${plan.id}`}
                                                    className="cursor-pointer text-base font-semibold"
                                                >
                                                    {plan.name}
                                                </Label>
                                                {plan.description && (
                                                    <p className="text-muted-foreground mt-1 text-sm">
                                                        {plan.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="border-t pt-3">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold">${plan.price}</span>
                                                <span className="text-muted-foreground text-sm">/ month</span>
                                            </div>
                                            {plan.trial_days > 0 && (
                                                <p className="text-muted-foreground mt-1 text-xs">
                                                    {plan.trial_days} days free trial
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </RadioGroup>
                            <InputError message={errors.plan_id} />
                        </div>
                    )}
                </div>

                {/* Submit Button - Full width below the grid */}
                <Button
                    type="submit"
                    className="mt-2 w-full"
                    tabIndex={8}
                    disabled={
                        processing ||
                        !data.terms_accepted ||
                        subdomainStatus.available !== true ||
                        subdomainStatus.lastChecked !== data.subdomain
                    }
                >
                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {processing ? 'Creating your account...' : 'Create Account'}
                </Button>

                {/* Login Link */}
                <div className="text-muted-foreground text-center text-sm">
                    Already have an account?{' '}
                    <TextLink href={route('login')} tabIndex={9}>
                        Sign in
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}

