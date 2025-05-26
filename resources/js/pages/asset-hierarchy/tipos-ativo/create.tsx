import { type BreadcrumbItem } from '@/types';
import { type AssetTypeForm } from '@/types/asset-hierarchy';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/asset-hierarchy/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import TextInput from '@/components/TextInput';
import { Link } from '@inertiajs/react';
import { toast } from "sonner";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tipos de Ativo',
        href: '/asset-hierarchy/tipos-ativo',
    },
    {
        title: 'Novo Tipo de Ativo',
        href: '/asset-hierarchy/tipos-ativo/create',
    },
];

export default function CreateAssetType() {
    const { data, setData, post, processing, errors, clearErrors } = useForm<AssetTypeForm>({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('asset-hierarchy.tipos-ativo.store'), {
            onError: (errors) => {
                toast.error("Erro ao criar tipo de ativo", {
                    description: "Verifique os campos e tente novamente."
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Tipo de Ativo" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <div className="flex justify-between items-center">
                        <HeadingSmall 
                            title="Novo Tipo de Ativo" 
                            description="Crie um novo tipo de ativo no sistema" 
                        />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6">
                            <TextInput<AssetTypeForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="name"
                                label="Nome"
                                placeholder="Nome do tipo de ativo"
                                required
                            />

                            <TextInput<AssetTypeForm>
                                form={{
                                    data,
                                    setData,
                                    errors,
                                    clearErrors
                                }}
                                name="description"
                                label="Descrição"
                                placeholder="Descrição do tipo de ativo"
                            />
                        </div>

                        <div className="flex justify-start gap-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Salvando...' : 'Salvar'}
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('asset-hierarchy.tipos-ativo')}>
                                    Cancelar
                                </Link>
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>
        </AppLayout>
    );
} 