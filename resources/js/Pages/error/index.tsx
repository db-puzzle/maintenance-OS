import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

interface Props {
    status?: number;
    message?: string;
    title?: string;
}

export default function Error({ status = 500, message = 'An unexpected error occurred', title = 'Error' }: Props) {
    const getErrorDetails = () => {
        switch (status) {
            case 403:
                return {
                    title: 'Forbidden',
                    message: message || 'You do not have permission to access this resource.',
                    color: 'red'
                };
            case 404:
                return {
                    title: 'Page Not Found',
                    message: message || 'The page you are looking for does not exist.',
                    color: 'blue'
                };
            case 419:
                return {
                    title: 'Session Expired',
                    message: message || 'Your session has expired. Please refresh the page and try again.',
                    color: 'orange'
                };
            case 500:
                return {
                    title: 'Server Error',
                    message: message || 'An internal server error occurred. Please try again later.',
                    color: 'red'
                };
            case 503:
                return {
                    title: 'Service Unavailable',
                    message: message || 'The service is temporarily unavailable. Please try again later.',
                    color: 'gray'
                };
            default:
                return {
                    title: title || 'Error',
                    message: message,
                    color: 'red'
                };
        }
    };

    const errorDetails = getErrorDetails();
    const colorClasses = {
        red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500',
        blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500',
        orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500',
        gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    };

    return (
        <>
            <Head title={errorDetails.title} />
            
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="max-w-md w-full text-center px-6">
                    <div className="mb-8">
                        <div className={`mx-auto flex items-center justify-center w-20 h-20 rounded-full mb-4 ${colorClasses[errorDetails.color as keyof typeof colorClasses]}`}>
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        
                        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {status}
                        </h1>
                        
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            {errorDetails.title}
                        </h2>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            {errorDetails.message}
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
                </div>
            </div>
        </>
    );
}
