import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

interface Props {
    status: number;
    message: string;
}

export default function NotImplemented({ status, message }: Props) {
    return (
        <>
            <Head title="Feature Not Implemented" />
            
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="max-w-md w-full text-center px-6">
                    <div className="mb-8">
                        <div className="mx-auto flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mb-4">
                            <AlertTriangle className="w-10 h-10 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        
                        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {status}
                        </h1>
                        
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Feature Not Implemented
                        </h2>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            {message || 'This feature is currently under development and will be available soon.'}
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="inline-flex items-center"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                        
                        <Link href="/">
                            <Button className="inline-flex items-center w-full sm:w-auto">
                                <Home className="w-4 h-4 mr-2" />
                                Go to Home
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                        If you believe this is an error, please contact support.
                    </div>
                </div>
            </div>
        </>
    );
}
