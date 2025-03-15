import { type BreadcrumbItem, type MachineType, type Area, type MachineForm } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { Camera, Upload } from 'lucide-react';
import CameraCapture from '@/components/camera-capture';

import AppLayout from '@/layouts/app-layout';
import CadastroLayout from '@/layouts/cadastro/layout';
import HeadingSmall from '@/components/heading-small';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Máquinas',
        href: '/cadastro/maquinas',
    },
    {
        title: 'Nova Máquina',
        href: '/cadastro/maquinas/create',
    },
];

interface Props {
    machineTypes: MachineType[];
    areas: Area[];
}

export default function CreateMachine({ machineTypes, areas }: Props) {
    const { data, setData, post, processing, errors } = useForm<MachineForm>({
        tag: '',
        machine_type_id: '',
        description: '',
        nickname: '',
        manufacturer: '',
        manufacturing_year: '',
        area_id: '',
        photo: null
    });

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('photo', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handlePhotoCapture = (file: File) => {
        setData('photo', file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('cadastro.maquinas.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nova Máquina" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall
                        title="Nova Máquina"
                        description="Adicione uma nova máquina ao sistema"
                    />

                    <form onSubmit={submit} className="space-y-6">
                        {/* Linha 1: TAG, Tipo de Máquina */}
                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* TAG da Máquina - Campo Obrigatório */}
                            <div className="grid gap-2">
                                <Label htmlFor="tag" className="flex items-center gap-1">
                                    TAG da Máquina
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="tag"
                                    value={data.tag}
                                    onChange={(e) => setData('tag', e.target.value.toUpperCase())}
                                    required
                                    placeholder="TAG da máquina"
                                />
                                <InputError message={errors.tag} />
                            </div>

                            {/* Tipo de Máquina - Campo Obrigatório */}
                            <div className="grid gap-2">
                                <Label htmlFor="machine_type_id" className="flex items-center gap-1">
                                    Tipo de Máquina
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.machine_type_id.toString()}
                                    onValueChange={(value) => setData('machine_type_id', value)}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um tipo de máquina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {machineTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.machine_type_id} />
                            </div>
                        </div>

                        {/* Linha 2: Área, Apelido */}
                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Área - Campo Obrigatório */}
                            <div className="grid gap-2">
                                <Label htmlFor="area_id" className="flex items-center gap-1">
                                    Área
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.area_id.toString()}
                                    onValueChange={(value) => setData('area_id', value)}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {areas.map((area) => (
                                            <SelectItem key={area.id} value={area.id.toString()}>
                                                {area.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.area_id} />
                            </div>

                            {/* Apelido */}
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">Apelido</Label>
                                <Input
                                    id="nickname"
                                    value={data.nickname}
                                    onChange={(e) => setData('nickname', e.target.value)}
                                    placeholder="Apelido da máquina"
                                />
                                <InputError message={errors.nickname} />
                            </div>
                        </div>

                        {/* Linha 3: Fabricante, Ano de Fabricação */}
                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Fabricante */}
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturer">Fabricante</Label>
                                <Input
                                    id="manufacturer"
                                    value={data.manufacturer}
                                    onChange={(e) => setData('manufacturer', e.target.value)}
                                    placeholder="Fabricante da máquina"
                                />
                                <InputError message={errors.manufacturer} />
                            </div>

                            {/* Ano de Fabricação */}
                            <div className="grid gap-2">
                                <Label htmlFor="manufacturing_year">Ano de Fabricação</Label>
                                <Input
                                    id="manufacturing_year"
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    value={data.manufacturing_year}
                                    onChange={(e) => setData('manufacturing_year', e.target.value)}
                                    placeholder="Ano de fabricação"
                                />
                                <InputError message={errors.manufacturing_year} />
                            </div>
                        </div>

                        {/* Linha 4: Descrição */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Descrição da máquina"
                                className="min-h-[100px]"
                            />
                            <InputError message={errors.description} />
                        </div>

                        {/* Linha para Upload de Foto */}
                        <div className="grid gap-2">
                            <Label>Foto da Máquina</Label>
                            <div className="flex flex-col gap-4">
                                {/* Área de Preview */}
                                {previewUrl && (
                                    <div className="relative w-48 h-48">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                setData('photo', null);
                                                setPreviewUrl(null);
                                            }}
                                        >
                                            Remover
                                        </Button>
                                    </div>
                                )}

                                {/* Botões de Upload e Câmera */}
                                {!previewUrl && (
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="photo-upload"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                asChild
                                            >
                                                <label htmlFor="photo-upload" className="flex items-center gap-2 cursor-pointer">
                                                    <Upload className="w-4 h-4" />
                                                    Selecionar Arquivo
                                                </label>
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowCamera(true)}
                                            className="flex items-center gap-2"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Usar Câmera
                                        </Button>
                                    </div>
                                )}
                                <InputError message={errors.photo} />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                Salvar
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => window.history.back()}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>
            </CadastroLayout>

            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </AppLayout>
    );
} 