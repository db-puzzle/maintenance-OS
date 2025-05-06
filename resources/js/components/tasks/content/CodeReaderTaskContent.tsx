import { Task } from '@/types/task';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';
import { Button } from '@/components/ui/button';
import { ScanBarcode, Check } from 'lucide-react';

interface CodeReaderTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function CodeReaderTaskContent({ task, mode, onUpdate }: CodeReaderTaskContentProps) {
    const [scanned, setScanned] = useState(false);
    const [code, setCode] = useState('');
    
    const codeType = task.codeReaderType === 'qr_code' ? 'QR Code' : 'Código de Barras';
    const instructions = task.codeReaderInstructions || `Leia o ${codeType} conforme as instruções.`;
    
    if (mode === 'edit') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-md">
                    <p>Esta tarefa solicita que o usuário leia um {codeType}.</p>
                    
                    {task.codeReaderInstructions && (
                        <div className="mt-2">
                            <p className="font-medium">Instruções:</p>
                            <p className="text-muted-foreground">{task.codeReaderInstructions}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (mode === 'preview') {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-md">
                    <p>O usuário deverá ler um {codeType} durante a execução desta tarefa.</p>
                    
                    {task.codeReaderInstructions && (
                        <div className="mt-2">
                            <p className="font-medium">Instruções para o usuário:</p>
                            <p className="text-muted-foreground">{task.codeReaderInstructions}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // Modo 'respond'
    return (
        <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-md">
                <p>{instructions}</p>
            </div>
            
            {scanned ? (
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
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
                >
                    <ScanBarcode className="h-4 w-4 mr-2" />
                    Ler {codeType}
                </Button>
            )}
        </div>
    );
} 