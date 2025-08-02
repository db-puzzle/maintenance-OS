import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        console.log('Resolving page:', name); // Debug logging

        // Import all pages explicitly including missing directories
        const pages = import.meta.glob([
            './pages/*.tsx',
            './pages/*/*.tsx',
            './pages/*/*/*.tsx',
            './pages/*/*/*/*.tsx',
            './pages/work-orders/*.tsx',
            './pages/production/**/*.tsx',
            './pages/maintenance/**/*.tsx',
            './pages/forms/*.tsx'
        ], { eager: true });

        const page = pages[`./pages/${name}.tsx`];

        // If not found, try without .tsx extension in the path
        if (!page && name.includes('/')) {
            const alternativePath = `./pages/${name}/index.tsx`;
            const foundPage = pages[alternativePath];
            if (foundPage) {
                console.log('Found page at alternative path:', alternativePath);
                return foundPage;
            }
        }

        console.log('Found page:', page); // This will show if undefined
        console.log('Available pages:', Object.keys(pages)); // Show all available pages
        console.log('Total pages found:', Object.keys(pages).length);

        if (!page) {
            console.error(`Page not found: ${name}`);
            console.error(`Looked for: ./pages/${name}.tsx`);
            console.error(`Also looked for: ./pages/${name}/index.tsx`);
        }

        return page;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <>
                <App {...props} />
                <Toaster />
            </>,
        );
    },
    progress: {
        // The delay after which the progress bar will appear, in milliseconds...
        delay: 250,

        // The color of the progress bar...
        color: '#4B5563',

        // Whether to include the default NProgress styles...
        includeCSS: true,

        // Whether the NProgress spinner will be shown...
        showSpinner: false,
    },
});

// This will set light / dark mode on load...
initializeTheme();
