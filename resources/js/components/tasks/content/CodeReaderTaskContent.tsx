import { ItemSelect } from '@/components/ItemSelect';
import { Button } from '@/components/ui/button';
import { Barcode, Check, QrCode, ScanBarcode } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { withSaveFunctionality, WithSaveFunctionalityProps } from './withSaveFunctionality';

interface CodeReaderTaskContentProps extends WithSaveFunctionalityProps {
    onIconChange?: (icon: React.ReactNode) => void;
}

const CODE_TYPES = [
    { id: 1, name: 'QR Code', value: 'qr_code' },
    { id: 2, name: 'Código de Barras', value: 'barcode' },
] as const;

function CodeReaderTaskContent({ task, mode, onUpdate, onIconChange, response, setResponse, disabled }: CodeReaderTaskContentProps) {
    const codeReaderType = task.codeReaderType || 'barcode';
    const hasSetIcon = useRef(false);

    useEffect(() => {
        if (!response) {
            setResponse({ value: '', scanned: false });
        }
    }, [response, setResponse]);

    const codeType = codeReaderType === 'qr_code' ? 'QR Code' : 'Código de Barras';
    const instructions = task.codeReaderInstructions || `Leia o ${codeType} conforme as instruções.`;

    useEffect(() => {
        if (onIconChange && !hasSetIcon.current) {
            hasSetIcon.current = true;
            onIconChange(codeReaderType === 'qr_code' ? <QrCode className="size-5" /> : <Barcode className="size-5" />);
        }
    }, [onIconChange, codeReaderType]);

    useEffect(() => {
        if (onIconChange) {
            onIconChange(codeReaderType === 'qr_code' ? <QrCode className="size-5" /> : <Barcode className="size-5" />);
        }
    }, [codeReaderType, onIconChange]);

    const handleCodeTypeChange = (selectedId: string) => {
        const selectedType = CODE_TYPES.find((type) => type.id.toString() === selectedId);
        if (selectedType) {
            onUpdate?.({ ...task, codeReaderType: selectedType.value });
        }
    };

    const handleScan = () => {
        // Here you would integrate with a real scanner library
        const mockCode = `MOCK-${codeReaderType.toUpperCase()}-${Date.now()}`;
        setResponse({ value: mockCode, scanned: true });
    };

    const currentTypeId = CODE_TYPES.find((type) => type.value === codeReaderType)?.id.toString() || '1';

    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="px-4 pb-4">
                    <div className="w-56 space-y-2">
                        <ItemSelect
                            label="Tipo de Código"
                            items={CODE_TYPES}
                            value={currentTypeId}
                            onValueChange={handleCodeTypeChange}
                            createRoute=""
                            placeholder="Selecione o tipo"
                            canCreate={false}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const isPreview = mode === 'preview';

    return (
        <div className="space-y-4">
            <div className="p-4">
                <p>{isPreview ? `O usuário deverá ler um ${codeType} durante a execução desta tarefa.` : instructions}</p>
            </div>

            {response?.scanned ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex w-full items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4">
                        <Check className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="font-medium text-green-700">{codeType} lido com sucesso</p>
                            <p className="text-sm text-green-600">{response.value}</p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setResponse({ ...response, scanned: false })}
                        disabled={isPreview || disabled}
                    >
                        <ScanBarcode className="mr-2 h-4 w-4" />
                        Ler novamente
                    </Button>
                </div>
            ) : (
                <Button className="w-full" onClick={handleScan} disabled={isPreview || disabled}>
                    {codeReaderType === 'qr_code' ? <QrCode className="mr-2 h-4 w-4" /> : <Barcode className="mr-2 h-4 w-4" />}
                    Ler {codeType}
                </Button>
            )}
        </div>
    );
}

export default memo(withSaveFunctionality(CodeReaderTaskContent));
