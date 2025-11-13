import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Flag,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Settings,
    Globe,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Declare the global route function from Ziggy
declare const route: (name: string, params?: Record<string, string | number>) => string;

interface Feature {
    id: number;
    key: string;
    name: string;
    description: string | null;
    category: string | null;
    is_global: boolean;
    is_enabled_globally: boolean;
    requires_backend_validation: boolean;
    metadata: Record<string, unknown> | null;
    plans: Array<{
        id: number;
        name: string;
        is_enabled: boolean;
        configuration: Record<string, unknown> | null;
    }>;
    created_at: string;
    updated_at: string;
}

interface Plan {
    id: number;
    name: string;
    description: string | null;
}

interface Props {
    auth?: {
        user?: {
            name: string;
            email: string;
        } | null;
    };
    features: Feature[];
    plans: Plan[];
}

export default function FeaturesIndex({ auth, features, plans }: Props) {
    const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
    const [planAssignments, setPlanAssignments] = useState<Record<number, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);

    // Group features by category
    const featuresByCategory = features.reduce((acc, feature) => {
        const category = feature.category || 'uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);

    const handleToggleGlobal = (feature: Feature, enabled: boolean) => {
        const action = enabled ? 'enabled' : 'disabled';

        router.post(
            route('admin.features.toggle-global', { feature: feature.id }),
            { is_enabled: enabled },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Feature '${feature.name}' has been ${action}.`);
                },
                onError: () => {
                    toast.error(`Failed to toggle feature. Please try again.`);
                },
            }
        );
    };

    const handleOpenPlanDialog = (feature: Feature) => {
        setSelectedFeature(feature);

        // Initialize plan assignments from current feature data
        const assignments: Record<number, boolean> = {};
        plans.forEach(plan => {
            const featurePlan = feature.plans.find(p => p.id === plan.id);
            assignments[plan.id] = featurePlan?.is_enabled || false;
        });
        setPlanAssignments(assignments);
    };

    const handleSavePlanAssignments = () => {
        if (!selectedFeature) return;

        setIsSubmitting(true);

        const assignmentsData = Object.entries(planAssignments).map(([planId, isEnabled]) => ({
            plan_id: parseInt(planId),
            is_enabled: isEnabled,
            configuration: null,
        }));

        router.post(
            route('admin.features.plan-assignments', { feature: selectedFeature.id }),
            { plans: assignmentsData },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedFeature(null);
                    setPlanAssignments({});
                    setIsSubmitting(false);
                    toast.success(`Plan assignments updated for '${selectedFeature.name}'.`);
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    toast.error('Failed to update plan assignments. Please try again.');
                    console.error('Plan assignment errors:', errors);
                },
            }
        );
    };

    const handleClearCache = () => {
        setIsClearingCache(true);

        router.post(route('admin.features.clear-cache'), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setIsClearingCache(false);
                toast.success('Feature cache cleared successfully!');
            },
            onError: (errors) => {
                setIsClearingCache(false);
                toast.error('Failed to clear cache. Please try again.');
                console.error('Cache clear errors:', errors);
            },
            onFinish: () => {
                setIsClearingCache(false);
            },
        });
    };

    return (
        <>
            <Head title="Feature Flags" />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Link href="/">
                                        <Button variant="ghost" size="sm">
                                            ← Back to Dashboard
                                        </Button>
                                    </Link>
                                </div>
                                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                    Feature Flags
                                </h1>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Manage global and plan-based feature access
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={handleClearCache}
                                    variant="outline"
                                    size="sm"
                                    disabled={isClearingCache}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isClearingCache ? 'animate-spin' : ''}`} />
                                    {isClearingCache ? 'Clearing...' : 'Clear Cache'}
                                </Button>
                                {auth?.user && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {auth.user.name}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.post('/logout')}
                                >
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Summary Cards */}
                    <div className="mb-8 grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">Total Features</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{features.length}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">Globally Enabled</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {features.filter(f => f.is_global && f.is_enabled_globally).length}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs">Plan-Based</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {features.filter(f => !f.is_global).length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Features by Category */}
                    {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                        <div key={category} className="mb-8">
                            <h2 className="text-xl font-semibold capitalize text-gray-900 dark:text-gray-100 mb-4">
                                {category}
                            </h2>

                            <div className="grid grid-cols-1 gap-4">
                                {categoryFeatures.map((feature) => (
                                    <Card key={feature.id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <CardTitle className="flex items-center gap-2">
                                                        {feature.name}
                                                        {feature.is_global ? (
                                                            <Badge variant="outline" className="font-normal">
                                                                <Globe className="h-3 w-3 mr-1" />
                                                                Global
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="font-normal">
                                                                <Users className="h-3 w-3 mr-1" />
                                                                Plan-Based
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1.5">
                                                        <span className="font-mono text-xs">{feature.key}</span>
                                                    </CardDescription>
                                                </div>

                                                {feature.is_global && (
                                                    <div className="flex items-center gap-2">
                                                        {feature.is_enabled_globally ? (
                                                            <Badge className="bg-green-600">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Enabled
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                        <Switch
                                                            checked={feature.is_enabled_globally}
                                                            onCheckedChange={(checked) =>
                                                                handleToggleGlobal(feature, checked)
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {feature.description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {feature.description}
                                                </p>
                                            )}

                                            {/* Plan assignments for non-global features */}
                                            {!feature.is_global && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label className="text-sm font-medium">
                                                            Plan Access
                                                        </Label>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleOpenPlanDialog(feature)}
                                                        >
                                                            <Settings className="h-4 w-4 mr-1" />
                                                            Configure
                                                        </Button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {plans.map((plan) => {
                                                            const featurePlan = feature.plans.find(
                                                                (p) => p.id === plan.id
                                                            );
                                                            const isEnabled = featurePlan?.is_enabled;

                                                            return (
                                                                <Badge
                                                                    key={plan.id}
                                                                    variant={isEnabled ? 'default' : 'outline'}
                                                                >
                                                                    {plan.name}
                                                                    {isEnabled && (
                                                                        <CheckCircle2 className="h-3 w-3 ml-1" />
                                                                    )}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metadata display */}
                                            {feature.metadata && Object.keys(feature.metadata).length > 0 && (
                                                <details className="text-sm">
                                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                                        View Metadata
                                                    </summary>
                                                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                                        {JSON.stringify(feature.metadata, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>
            </div>

            {/* Plan Assignment Dialog */}
            <Dialog open={selectedFeature !== null} onOpenChange={() => setSelectedFeature(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configure Plan Access</DialogTitle>
                        <DialogDescription>
                            Select which subscription plans should have access to{' '}
                            <span className="font-semibold">{selectedFeature?.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {plans.map((plan) => (
                            <div key={plan.id} className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor={`plan-${plan.id}`} className="font-medium">
                                        {plan.name}
                                    </Label>
                                    {plan.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {plan.description}
                                        </p>
                                    )}
                                </div>
                                <Switch
                                    id={`plan-${plan.id}`}
                                    checked={planAssignments[plan.id] || false}
                                    onCheckedChange={(checked) =>
                                        setPlanAssignments((prev) => ({
                                            ...prev,
                                            [plan.id]: checked,
                                        }))
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedFeature(null)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSavePlanAssignments} disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

