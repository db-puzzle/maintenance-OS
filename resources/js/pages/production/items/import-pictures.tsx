import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FolderOpen, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportResult {
    itemsAffected: number;
    imagesImported: number;
    imagesSkipped: number;
    errors: string[];
}

interface Props {
    acceptedExtensions: string[];
    maxFilesPerItem: number;
    result?: ImportResult | null;
}

type MatchingKey = 'item_number' | 'item_name';

interface GroupedFile {
    file: File;
    client_name: string;
    order: number;
    is_primary?: boolean;
}

interface ManifestItem {
    identifier: string;
    item_id?: string;
    images: Array<Pick<GroupedFile, 'client_name' | 'order' | 'is_primary'>>;
}

export default function ImportPictures({ acceptedExtensions, maxFilesPerItem, result }: Props) {
    const page = usePage<{ flash?: { imageImportSummary?: ImportResult } }>();
    const flashSummary = (page.props as any)?.flash?.imageImportSummary as ImportResult | undefined;
    const summary: ImportResult | undefined = flashSummary || result || undefined;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [matchingKey, setMatchingKey] = useState<MatchingKey>('item_number');
    const [files, setFiles] = useState<File[]>([]);
    const [scanProgress, setScanProgress] = useState<number>(0);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [unmatched, setUnmatched] = useState<File[]>([]);
    const [groups, setGroups] = useState<Record<string, GroupedFile[]>>({});
    const [selectedTop, setSelectedTop] = useState<Record<string, number>>({});

    const { data, setData, post, processing, progress, errors, reset } = useForm({
        matching_key: matchingKey as string,
        manifest: '' as string,
        files: [] as File[],
    });

    const allowedExt = useMemo(() => new Set(acceptedExtensions.map((e) => e.toLowerCase())), [acceptedExtensions]);

    const normalizeBase = (name: string): string => {
        return name
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-_]/g, '')
            .replace(/[\s-_]+/g, '');
    };

    const parseFile = (fileName: string): { base: string; index: number } => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const name = fileName.slice(0, -(ext.length + 1));
        const m = name.match(/^(.*?)-(\d{1})$/);
        const baseName = m ? m[1] : name;
        // Important: when matching by item_number, do not heavily normalize; keep dashes
        const base = matchingKey === 'item_number' ? baseName.trim() : normalizeBase(baseName);
        const index = m ? parseInt(m[2], 10) : 1;
        return { base, index };
    };

    const onPickDirectory = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const handleFiles = useCallback(async (list: FileList) => {
        const newFiles: File[] = [];
        for (let i = 0; i < list.length; i++) {
            const f = list[i];
            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            if (!allowedExt.has(ext)) continue;
            newFiles.push(f);
        }
        if (newFiles.length === 0) return;
        setFiles(newFiles);

        // Scan and group
        setIsScanning(true);
        setScanProgress(0);
        const total = newFiles.length;
        const bucket: Record<string, GroupedFile[]> = {};
        const unmatchedList: File[] = [];
        newFiles.forEach((f, idx) => {
            const { base, index } = parseFile(f.name);
            if (!base) {
                unmatchedList.push(f);
                return;
            }
            if (!bucket[base]) bucket[base] = [];
            bucket[base].push({ file: f, client_name: f.name, order: index, is_primary: index === 1 });
            if ((idx + 1) % 25 === 0) setScanProgress(Math.round(((idx + 1) / total) * 100));
        });
        setScanProgress(100);
        setGroups(bucket);
        setUnmatched(unmatchedList);
        setIsScanning(false);
    }, [allowedExt]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files);
    }, [handleFiles]);

    const groupedPreview = useMemo(() => {
        return Object.entries(groups).map(([key, list]) => {
            const sorted = [...list].sort((a, b) => a.order - b.order);
            const max = selectedTop[key] ?? 1; // default to 1 selected image unless user changes
            return { base: key, list: sorted, selected: sorted.slice(0, max) };
        });
    }, [groups, selectedTop]);

    const buildManifest = (): { matching_key: MatchingKey; items: ManifestItem[] } => {
        const items: ManifestItem[] = groupedPreview.map(({ base, selected }) => ({
            identifier: base,
            images: selected.map((g, idx) => ({ client_name: g.client_name, order: idx + 1, is_primary: idx === 0 })),
        }));
        return { matching_key: matchingKey, items };
    };

    const handleUpload = () => {
        const manifest = buildManifest();
        const formFiles: File[] = [];
        groupedPreview.forEach(({ selected }) => selected.forEach((g) => formFiles.push(g.file)));
        setData('matching_key', manifest.matching_key);
        setData('manifest', JSON.stringify({ items: manifest.items }));
        // Important: Inertia will pick up files when set as array
        setData('files', formFiles as unknown as File[]);
        post(route('production.items.images.import'), {
            forceFormData: true,
        });
    };

    const breadcrumbs = [
        { title: 'Home', href: '/home' },
        { title: 'Itens', href: route('production.items.index') },
        { title: 'Importar Imagens', href: route('production.items.images.import.wizard') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importar Imagens de Itens" />
            <div className="flex-1 overflow-y-auto">
                <div className="container max-w-6xl mx-auto py-8 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold">Importar Imagens de Itens</h1>
                        <p className="text-muted-foreground mt-2">Selecione uma pasta e o sistema fará a correspondência por convenção de nome.</p>
                    </div>

                    {summary && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Importadas {summary.imagesImported} imagens em {summary.itemsAffected} itens. Skipped {summary.imagesSkipped}.
                                {summary.errors.length > 0 && (
                                    <ul className="list-disc ml-4 mt-2">
                                        {summary.errors.slice(0, 5).map((e, i) => (
                                            <li key={i} className="text-sm">{e}</li>
                                        ))}
                                        {summary.errors.length > 5 && <li className="text-sm">... e mais {summary.errors.length - 5}</li>}
                                    </ul>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Seleção de Pasta</CardTitle>
                            <CardDescription>
                                Extensões aceitas: {acceptedExtensions.join(', ')}. Até {maxFilesPerItem} imagens por item.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Chave de correspondência</label>
                                    <Select value={matchingKey} onValueChange={(v) => setMatchingKey(v as MatchingKey)}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Escolha" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="item_number">Item Number</SelectItem>
                                            <SelectItem value="item_name">Item Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <input
                                ref={inputRef}
                                type="file"
                                multiple
                                // @ts-ignore - webkitdirectory is non-standard but supported
                                webkitdirectory="true"
                                directory="true"
                                onChange={handleInputChange}
                                className="hidden"
                                accept={acceptedExtensions.map((e) => `.${e}`).join(',')}
                            />
                            <Button variant="outline" onClick={onPickDirectory} className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" /> Escolher Pasta
                            </Button>
                            {isScanning && (
                                <div className="space-y-2">
                                    <Progress value={scanProgress} />
                                    <p className="text-sm text-muted-foreground">Escaneando arquivos... {scanProgress}%</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {Object.keys(groups).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pré-visualização</CardTitle>
                                <CardDescription>
                                    Revise os itens detectados e limite a {maxFilesPerItem} imagens por item.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Identificador</TableHead>
                                                <TableHead>Arquivos</TableHead>
                                                <TableHead>Selecionar Top</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedPreview.map(({ base, list, selected }) => (
                                                <TableRow key={base}>
                                                    <TableCell className="font-mono text-xs">{base}</TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="flex flex-wrap gap-2">
                                                            {list.slice(0, 8).map((g, idx) => (
                                                                <span key={idx} className={cn('px-2 py-1 rounded border', selected.includes(g) ? 'bg-primary/10 border-primary' : 'bg-muted')}>{g.client_name}</span>
                                                            ))}
                                                            {list.length > 8 && <span className="text-muted-foreground">+{list.length - 8} mais</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={(selectedTop[base] ?? 1).toString()}
                                                            onValueChange={(v) => setSelectedTop((s) => ({ ...s, [base]: parseInt(v, 10) }))}
                                                        >
                                                            <SelectTrigger className="w-28">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: maxFilesPerItem }, (_, i) => i + 1).map((n) => (
                                                                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleUpload} disabled={processing}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        {processing ? 'Enviando...' : 'Importar Imagens'}
                                    </Button>
                                </div>
                                {progress && (
                                    <div className="space-y-2">
                                        <Progress value={progress.percentage} />
                                        <p className="text-sm text-muted-foreground text-center">Enviando... {progress.percentage}%</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {unmatched.length > 0 && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {unmatched.length} arquivo(s) não correspondidos. Eles não serão enviados.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}


