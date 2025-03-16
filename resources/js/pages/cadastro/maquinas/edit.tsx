import { type BreadcrumbItem, type Machine, type MachineType, type Area, type MachineForm } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEvent, useState, useEffect } from 'react';

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
        title: 'Editar Máquina',
        href: '/cadastro/maquinas/edit',
    },
];

interface Props {
    machine: Machine;
    machineTypes: MachineType[];
    areas: Area[];
}

export default function EditMachine({ machine, machineTypes, areas }: Props) {
    const { data, setData, put, processing, errors } = useForm<MachineForm>({
        tag: machine.tag,
        machine_type_id: machine.machine_type_id.toString(),
        description: machine.description || '',
        nickname: machine.nickname || '',
        manufacturer: machine.manufacturer || '',
        manufacturing_year: machine.manufacturing_year?.toString() || '',
        area_id: machine.area_id.toString(),
        photo: null,
        photo_path: machine.photo_path || ''
    });

    const [previewUrl, setPreviewUrl] = useState<string | null>(
        machine.photo_path ? `/storage/${machine.photo_path}` : null
    );
    const [showCamera, setShowCamera] = useState(false);

    const handleRemovePhoto = () => {
        router.delete(route('machines.remove-photo', machine.id), {
            preserveScroll: true,
            onSuccess: () => {
                setPreviewUrl(null);
                setData('photo', null);
                setData('photo_path', null);
            }
        });
    };

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

        // Criar um FormData com todos os dados
        const formData = new FormData();
        formData.append('_method', 'PUT'); // Simular método PUT
        formData.append('tag', data.tag);
        formData.append('machine_type_id', data.machine_type_id.toString());
        formData.append('description', data.description);
        formData.append('nickname', data.nickname);
        formData.append('manufacturer', data.manufacturer);
        formData.append('manufacturing_year', data.manufacturing_year);
        formData.append('area_id', data.area_id.toString());
        
        if (data.photo) {
            formData.append('photo', data.photo);
        }
        
        router.post(route('cadastro.maquinas.update', machine.id), formData);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Máquina" />

            <CadastroLayout>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall
                        title="Editar Máquina"
                        description="Edite os dados da máquina"
                    />

                    <form onSubmit={submit} className="space-y-6">
                        {/* Seção Superior: Foto e Campos Principais */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Foto da Máquina */}
                            <div className="flex flex-col h-full">
                                <Label className="mb-2">Foto da Máquina</Label>
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex-1 relative rounded-lg overflow-hidden bg-muted border min-h-[238px] max-h-[238px]">
                                        {previewUrl ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={handleRemovePhoto}
                                                >
                                                    Remover
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <Camera className="w-12 h-12" />
                                                <span className="text-sm">Nenhuma foto selecionada</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
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
                                                className="w-full"
                                                asChild
                                            >
                                                <label htmlFor="photo-upload" className="flex items-center justify-center gap-2 cursor-pointer">
                                                    <Upload className="w-4 h-4" />
                                                    Selecionar Arquivo
                                                </label>
                                            </Button>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowCamera(true)}
                                            className="flex-1"
                                        >
                                            <Camera className="w-4 h-4 mr-2" />
                                            Usar Câmera
                                        </Button>
                                    </div>
                                    <InputError message={errors.photo} />
                                </div>
                            </div>

                            {/* Campos Principais */}
                            <div className="space-y-6">
                                {/* TAG da Máquina */}
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

                                {/* Tipo de Máquina */}
                                <div className="grid gap-2">
                                    <Label htmlFor="machine_type_id" className="flex items-center gap-1">
                                        Tipo de Máquina
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={String(data.machine_type_id)}
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

                                {/* Área */}
                                <div className="grid gap-2">
                                    <Label htmlFor="area_id" className="flex items-center gap-1">
                                        Área
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={String(data.area_id)}
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
                        </div>

                        {/* Linha: Fabricante, Ano de Fabricação */}
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