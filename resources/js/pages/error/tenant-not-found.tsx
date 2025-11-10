import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Building2, Home } from 'lucide-react';
import AuthLayout from '@/layouts/auth-layout';

/**
 * Component props for tenant not found error page
 */
interface Props {
    subdomain?: string;
    homeUrl?: string;
}

/**
 * Tenant not found error page - shown when a user tries to access a non-existent tenant
 * This provides a more graceful experience than a generic 404 error
 */
export default function TenantNotFound({ subdomain, homeUrl = 'http://localhost:8000/' }: Props) {
    return (
        <AuthLayout
            title="Workspace Not Found"
            description="The workspace you're trying to access doesn't exist"
        >
            <Head title="Workspace Not Found" />

            {/* Icon and status code */}
            <div className="mb-6 flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                    <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-500" />
                </div>

                <h1 className="text-6xl font-bold text-foreground">404</h1>
            </div>

            {/* Message */}
            <div className="mb-8 space-y-2 text-center">
                {subdomain ? (
                    <>
                        <p className="text-muted-foreground">
                            The workspace{' '}
                            <span className="font-semibold text-foreground">"{subdomain}"</span>{' '}
                            does not exist.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Please check the URL or contact your workspace administrator.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-muted-foreground">
                            The workspace you're trying to access does not exist.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Please check the URL or contact your workspace administrator.
                        </p>
                    </>
                )}
            </div>

            {/* Action button */}
            <div className="flex flex-col gap-3">
                <a href={homeUrl} className="w-full">
                    <Button className="w-full">
                        <Home className="mr-2 h-4 w-4" />
                        Go to Home
                    </Button>
                </a>
            </div>

            {/* Help text */}
            <div className="mt-8 border-t pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Need help? Contact your system administrator.
                </p>
            </div>
        </AuthLayout>
    );
}

