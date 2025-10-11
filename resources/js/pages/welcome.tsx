import { Head } from '@inertiajs/react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingSecondaryFeatures } from '@/components/landing/LandingSecondaryFeatures';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingFaqs } from '@/components/landing/LandingFaqs';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Welcome() {
    return (
        <>
            <Head title="StreamLineOS - Complex product. Simple production management">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800&display=swap" rel="stylesheet" />
            </Head>
            <>
                <LandingHeader />
                <main>
                    <LandingHero />
                    <LandingFeatures />
                    <LandingSecondaryFeatures />
                    {/* TODO: Add Call to Action section */}
                    {/* TODO: Add Testimonials section */}
                    <LandingPricing />
                    <LandingFaqs />
                </main>
                <LandingFooter />
            </>
        </>
    );
}