import Heading from '@/components/heading';
import { type PropsWithChildren } from 'react';

export default function CadastroLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className="px-4 py-6">
            <Heading title="Cadastro" description="Gerencie seus cadastros de máquinas, tipos e áreas" />

            <div className="mt-8">
                <section className="space-y-12">{children}</section>
            </div>
        </div>
    );
} 