import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { withSaveFunctionality, WithSaveFunctionalityProps } from './withSaveFunctionality';
// This type alias extends WithSaveFunctionalityProps and is reserved for future question task specific props
type QuestionTaskContentProps = WithSaveFunctionalityProps & {
    // Future question task specific props will be added here
};
function QuestionTaskContent({ task, mode, response, setResponse, disabled }: QuestionTaskContentProps) {
    return (
        <div>
            <div className="mb-2">
                <Label htmlFor={`response-${task.id}`}>Resposta</Label>
            </div>
            {mode === 'respond' ? (
                <Textarea
                    id={`response-${task.id}`}
                    value={response?.value || ''}
                    onChange={(e) => setResponse({ value: e.target.value })}
                    placeholder="Digite sua resposta aqui..."
                    className="min-h-[100px]"
                    disabled={disabled}
                />
            ) : (
                <Textarea
                    id={`response-${task.id}`}
                    value={response?.value || ''}
                    readOnly
                    placeholder="O campo de resposta estará disponível quando o formulário for liberado para preenchimento..."
                    className="bg-muted/50 min-h-[100px] cursor-not-allowed"
                />
            )}
        </div>
    );
}
export default withSaveFunctionality(QuestionTaskContent);
