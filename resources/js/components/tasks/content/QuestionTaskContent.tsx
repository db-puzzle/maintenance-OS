import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Task } from '@/types/task';
import { useState } from 'react';
import { TaskCardMode } from './TaskContent';

interface QuestionTaskContentProps {
    task: Task;
    mode: TaskCardMode;
    onUpdate?: (updatedTask: Task) => void;
}

export default function QuestionTaskContent({ task, mode, onUpdate }: QuestionTaskContentProps) {
    const [response, setResponse] = useState<string>('');

    return (
        <div>
            <div className="mb-2">
                <Label htmlFor="response">Resposta</Label>
            </div>
            {mode === 'respond' ? (
                <Textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Digite sua resposta aqui..."
                    className="min-h-[100px]"
                />
            ) : (
                <Textarea
                    id="response"
                    value=""
                    disabled
                    placeholder="O campo de resposta estará disponível quando o formulário for liberado para preenchimento..."
                    className="min-h-[100px] cursor-not-allowed"
                />
            )}
        </div>
    );
}
