import { Task } from '@/types/task';
import { useState, useEffect, useRef, memo } from 'react';
import { TaskCardMode } from './TaskContent';
import { Button } from '@/components/ui/button';
import { ScanBarcode, Check, QrCode, Barcode } from 'lucide-react';
import ItemSelect from '@/components/ItemSelect';

interface CodeReaderTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
    onIconChange?: (icon: React.ReactNode) => void;
}

const CODE_TYPES = [
    { id: 1, name: 'QR Code', value: 'qr_code' },
    { id: 2, name: 'Código de Barras', value: 'barcode' }
] as const;

function CodeReaderTaskContent({ task, mode, onUpdate, onIconChange }: CodeReaderTaskContentProps) {
    const [scanned, setScanned] = useState(false);
    const [code, setCode] = useState('');
    const [codeReaderType, setCodeReaderType] = useState(task.codeReaderType || 'barcode');
    const hasSetIcon = useRef(false);
    
    const codeType = codeReaderType === 'qr_code' ? 'QR Code' : 'Código de Barras';
    const instructions = task.codeReaderInstructions || `Leia o ${codeType} conforme as instruções.`;
    
    // Atualiza o ícone do card pai quando o tipo de código muda
    useEffect(() => {
        if (onIconChange && !hasSetIcon.current) {
            hasSetIcon.current = true;
            if (codeReaderType === 'qr_code') {
                onIconChange(<QrCode className="size-5" />);
            } else {
                onIconChange(<Barcode className="size-5" />);
            }
        }
    }, []);
    
    // Atualiza o ícone apenas quando codeReaderType muda explicitamente
    useEffect(() => {
        if (onIconChange) {
            if (codeReaderType === 'qr_code') {
                onIconChange(<QrCode className="size-5" />);
            } else {
                onIconChange(<Barcode className="size-5" />);
            }
        }
    }, [codeReaderType]);
    
    // Função para atualizar o tipo de leitor quando alterado
    const handleCodeTypeChange = (selectedId: string) => {
        const selectedType = CODE_TYPES.find(type => type.id.toString() === selectedId);
        if (selectedType) {
            setCodeReaderType(selectedType.value);
            if (onUpdate) {
                onUpdate({
                    ...task,
                    codeReaderType: selectedType.value
                });
            }
        }
    };
    
    // Encontrar o ID correspondente ao valor atual
    const currentTypeId = CODE_TYPES.find(type => type.value === codeReaderType)?.id.toString() || '1';
    
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
    
    // Modo 'preview' ou 'respond'
    const isPreview = mode === 'preview';
    
    return (
        <div className="space-y-4">
            <div className="p-4">
                <p>
                    {isPreview 
                        ? `O usuário deverá ler um ${codeType} durante a execução desta tarefa.`
                        : instructions}
                </p>
            </div>
            
            {scanned ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-full p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="font-medium text-green-700">{codeType} lido com sucesso</p>
                            <p className="text-sm text-green-600">{code}</p>
                        </div>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setScanned(false)}
                        disabled={isPreview}
                    >
                        <ScanBarcode className="h-4 w-4 mr-2" />
                        Ler novamente
                    </Button>
                </div>
            ) : (
                <Button 
                    className="w-full" 
                    onClick={() => {
                        setScanned(true);
                        setCode(`EXEMPLO-${Math.floor(Math.random() * 10000)}`);
                    }}
                    disabled={isPreview}
                >
                    {codeReaderType === 'qr_code' ? 
                        <QrCode className="h-4 w-4 mr-2" /> : 
                        <Barcode className="h-4 w-4 mr-2" />
                    }
                    Ler {codeType}
                </Button>
            )}
        </div>
    );
}

export default memo(CodeReaderTaskContent); 